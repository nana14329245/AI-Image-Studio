import { createFalClient } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { getBrandKit, overlayBrandLogo } from "@/lib/brandKit";
import { InsufficientCreditsError, spendCredits } from "@/lib/credits";
import { TOOL_CREDIT_COST } from "@/lib/plans";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

type GenerationContext = {
  generationId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  tool: "upscale" | "product" | "ads" | "portrait";
  userId: string;
};

export function isSupportedImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && DATA_IMAGE_PATTERN.test(value);
}

export async function toFalImageInput(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Unable to read uploaded image");

  return response.blob();
}

export async function createGenerationContext(
  req: NextRequest,
  tool: GenerationContext["tool"],
  scale?: number
): Promise<GenerationContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

  const rate = await checkRateLimit({ userId: user.id, ip: getClientIp(req), action: tool });
  if (!rate.allowed) {
    return NextResponse.json({ error: "ใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" }, { status: 429 });
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า FAL_KEY บนเซิร์ฟเวอร์" }, { status: 503 });
  }

  const cost = TOOL_CREDIT_COST[tool];
  const { data: profile } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
  if (!profile || profile.credits < cost) {
    return NextResponse.json({ error: `เครดิตไม่พอ ต้องใช้ ${cost} เครดิตสำหรับการสร้างภาพนี้` }, { status: 402 });
  }

  const { data: generation, error } = await supabase
    .from("generations")
    .insert({ user_id: user.id, tool, status: "processing", scale })
    .select("id")
    .single();
  if (error || !generation) {
    return NextResponse.json({ error: "บันทึกงานไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }

  return { generationId: generation.id, supabase, tool, userId: user.id };
}

export async function enqueueGeneration(
    context: GenerationContext,
    endpoint: string,
    input: Record<string, unknown>,
    metadata: Record<string, unknown>
  ) {
    try {
      const queued = await createFal().queue.submit(endpoint, { input });
      const { error } = await context.supabase
        .from("generations")
        .update({ fal_endpoint: endpoint, fal_request_id: queued.request_id, generation_metadata: metadata })
        .eq("id", context.generationId)
        .eq("status", "processing");
      if (error) throw error;
      return { generationId: context.generationId, progress: 5, status: "queued" as const, queuePosition: queued.queue_position };
    } catch (error) {
      console.error("fal.ai queue submission failed", error);
      await failGeneration(context, "queue_submission_error");
      throw error;
    }
  }

export async function enqueueMultipleGenerations(
  context: GenerationContext,
  endpoint: string,
  inputs: Array<Record<string, unknown>>,
  metadata: Record<string, unknown>
) {
  const fal = createFal();
  const settled = await Promise.allSettled(inputs.map(input => fal.queue.submit(endpoint, { input })));
  const succeeded = settled.filter(
    (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fal.queue.submit>>> => r.status === "fulfilled"
  );
  const anyFailed = settled.some(r => r.status === "rejected");
  const requestIds = succeeded.map(r => r.value.request_id);

  if (requestIds.length === 0) {
    console.error(
      "fal.ai multiple queue submission failed",
      settled.find((r): r is PromiseRejectedResult => r.status === "rejected")?.reason
    );
    await failGeneration(context, "queue_submission_error");
    throw new Error("queue_submission_error");
  }

  const primaryRequestId = requestIds[0];
  const { error } = await context.supabase
    .from("generations")
    .update({
      fal_endpoint: endpoint,
      fal_request_id: primaryRequestId,
      status: anyFailed ? "failed" : "processing",
      error: anyFailed ? "partial_queue_submission_error" : null,
      generation_metadata: {
        ...metadata,
        fal_request_ids: requestIds,
      },
    })
    .eq("id", context.generationId)
    .eq("status", "processing");
  if (error) {
    console.error("fal.ai multiple queue submission: failed to persist request ids", error);
    throw error;
  }
  if (anyFailed) {
    console.error(
      "fal.ai multiple queue submission partially failed",
      settled.find((r): r is PromiseRejectedResult => r.status === "rejected")?.reason
    );
    throw new Error("partial_queue_submission_error");
  }

  return {
    generationId: context.generationId,
    progress: 5,
    status: "queued" as const,
    queuePosition: succeeded[0]?.value.queue_position,
  };
}

  export async function getQueuedGenerationStatus(generationId: string) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

    const { data: generation, error } = await supabase
      .from("generations")
      .select("id, tool, status, error, output_url, credits_spent, fal_endpoint, fal_request_id, finalizing_started_at, generation_metadata")
      .eq("id", generationId)
      .eq("user_id", user.id)
      .single();
    if (error || !generation) return NextResponse.json({ error: "ไม่พบงานสร้างภาพนี้" }, { status: 404 });

    if (generation.status === "completed") {
      const metadata = generation.generation_metadata as Record<string, unknown> | null;
      const storedResults = Array.isArray(metadata?.results) && metadata.results.every(u => typeof u === "string")
        ? (metadata.results as string[])
        : (generation.output_url ? [generation.output_url] : []);
      return NextResponse.json({ status: "completed", progress: 100, result: generation.output_url, results: storedResults, generationId, creditsSpent: generation.credits_spent, copy: adCopy(generation.generation_metadata) });
    }
    if (generation.status === "failed") return NextResponse.json({ status: "failed", error: "งานสร้างภาพไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });
    if (!generation.fal_endpoint || !generation.fal_request_id) return NextResponse.json({ status: "processing", progress: 5, message: "กำลังส่งงานเข้าคิว" });
    if (generation.status === "finalizing") {
      const startedAt = generation.finalizing_started_at ? new Date(generation.finalizing_started_at).getTime() : 0;
      if (Date.now() - startedAt < 90_000) {
        return NextResponse.json({ status: "saving", progress: 90, message: "กำลังบันทึกภาพผลลัพธ์" });
      }
      const { error: retryError } = await supabase
        .from("generations")
        .update({ status: "processing", finalizing_started_at: null })
        .eq("id", generationId)
        .eq("status", "finalizing");
      if (retryError) return NextResponse.json({ status: "saving", progress: 90, message: "กำลังบันทึกภาพผลลัพธ์" });
      return NextResponse.json({ status: "saving", progress: 90, message: "กำลังกู้คืนการบันทึกภาพ" });
    }

    try {
      const fal = createFal();
      const metadata = generation.generation_metadata as Record<string, unknown> | null;
      const requestIds: string[] = Array.isArray(metadata?.fal_request_ids) && metadata.fal_request_ids.every(id => typeof id === "string")
        ? (metadata.fal_request_ids as string[])
        : [generation.fal_request_id];

      const queueStatuses = await Promise.all(
        requestIds.map(reqId => fal.queue.status(generation.fal_endpoint!, { requestId: reqId }))
      );

      const anyInQueue = queueStatuses.some(s => s.status === "IN_QUEUE");
      const anyInProgress = queueStatuses.some(s => s.status === "IN_PROGRESS");
      const completedCount = queueStatuses.filter(s => s.status === "COMPLETED" || (s.status as string) === "OK").length;

      if (anyInQueue) {
        const minPos = queueStatuses.reduce((min, s) => (s.status === "IN_QUEUE" && typeof s.queue_position === "number" ? Math.min(min, s.queue_position) : min), 999);
        return NextResponse.json({
          status: "queued",
          progress: 15,
          queuePosition: minPos < 999 ? minPos : undefined,
          message: requestIds.length > 1 ? `กำลังรอคิวสร้างภาพ ${requestIds.length} มุมมอง` : "กำลังรอคิวสร้างภาพ",
        });
      }

      if (completedCount < requestIds.length || anyInProgress) {
        const pct = Math.round(25 + (completedCount / requestIds.length) * 60);
        return NextResponse.json({
          status: "generating",
          progress: pct,
          message: requestIds.length > 1 ? `AI กำลังสร้างภาพ ${completedCount}/${requestIds.length} มุมมอง` : "AI กำลังสร้างภาพ",
        });
      }

      const { data: locked } = await supabase
        .from("generations")
        .update({ status: "finalizing", finalizing_started_at: new Date().toISOString() })
        .eq("id", generationId)
        .eq("status", "processing")
        .select("id")
        .maybeSingle();
      if (!locked) return NextResponse.json({ status: "saving", progress: 90, message: "กำลังบันทึกภาพผลลัพธ์" });

      const outputs = await Promise.all(
        requestIds.map(reqId => fal.queue.result(generation.fal_endpoint!, { requestId: reqId }))
      );
      const allResults: string[] = [];
      for (const output of outputs) {
        const urls = extractResultUrls(output.data);
        if (urls[0]) allResults.push(urls[0]);
      }

      if (allResults.length === 0) {
        await failGeneration({ generationId, supabase, tool: generation.tool, userId: user.id }, "no_output");
        return NextResponse.json({ status: "failed", error: "บริการไม่ส่งภาพผลลัพธ์กลับมา กรุณาลองใหม่" }, { status: 502 });
      }
      const completion = await completeGeneration({ generationId, supabase, tool: generation.tool, userId: user.id }, allResults, generation.generation_metadata);
      if ("response" in completion) return completion.response;
      return NextResponse.json({ status: "completed", progress: 100, result: completion.result, results: completion.results, generationId, creditsRemaining: completion.remaining, copy: adCopy(generation.generation_metadata) });
    } catch (error) {
      console.error("fal.ai queue status failed", error);
      const detail = error instanceof Error && error.message ? error.message : "processing_error";
      await failGeneration({ generationId, supabase, tool: generation.tool, userId: user.id }, detail);
      const userMessage = error instanceof Error && error.message && !error.message.includes("fetch failed")
        ? `สร้างภาพไม่สำเร็จ: ${error.message}`
        : "สร้างภาพไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าบริการแล้วลองอีกครั้ง";
      return NextResponse.json({ status: "failed", error: userMessage }, { status: 502 });
    }
  }

  export function extractResultUrls(data: unknown): string[] {
    if (!data || typeof data !== "object") return [];
    const output = data as { image?: { url?: unknown }; images?: Array<{ url?: unknown }> };
    const urls: string[] = [];
    if (Array.isArray(output.images)) {
      for (const item of output.images) {
        if (typeof item?.url === "string" && item.url.startsWith("https://")) {
          urls.push(item.url);
        }
      }
    }
    if (urls.length === 0 && typeof output.image?.url === "string" && output.image.url.startsWith("https://")) {
      urls.push(output.image.url);
    }
    return urls;
  }

  function adCopy(metadata: unknown) {
    if (!metadata || typeof metadata !== "object") return undefined;
    const value = metadata as { productName?: unknown; benefits?: unknown };
    if (!("productName" in value) && !("benefits" in value)) return undefined;
    return {
      headline: typeof value.productName === "string" && value.productName ? value.productName : "Made for everyday moments",
      benefit: typeof value.benefits === "string" && value.benefits ? value.benefits : "Thoughtful design for the way you live.",
      cta: "SHOP NOW",
    };
  }

export async function completeGeneration(
  context: GenerationContext,
  resultOrResults: string | string[],
  metadata: Record<string, unknown>
): Promise<{ remaining: number; result: string; results: string[]; generationId: string } | { response: NextResponse }> {
  const results = Array.isArray(resultOrResults) ? resultOrResults : [resultOrResults];
  const primaryResult = results[0];
  if (!primaryResult || !primaryResult.startsWith("https://")) {
    await failGeneration(context, "no_output");
    return { response: NextResponse.json({ error: "บริการไม่ส่งภาพผลลัพธ์กลับมา กรุณาลองใหม่" }, { status: 502 }) };
  }

  const cost = TOOL_CREDIT_COST[context.tool];
  try {
    const logoUrl = context.tool !== "upscale" ? (await getBrandKit(context.supabase, context.userId)).logoUrl : null;
    const stored = await persistGeneratedImages(context.userId, context.generationId, results, logoUrl);
    const remaining = await spendCredits(context.supabase, context.userId, cost, context.tool, {
      generationId: context.generationId,
      ...metadata,
    });
    const updatedMetadata = {
      ...metadata,
      results: stored.urls,
      output_paths: stored.paths,
    };
    const { error: finalizeError } = await context.supabase
      .from("generations")
      .update({
        status: "completed",
        output_path: stored.paths[0],
        output_url: stored.urls[0],
        credits_spent: cost,
        generation_metadata: updatedMetadata,
      })
      .eq("id", context.generationId);
    if (finalizeError) console.error("[completeGeneration] failed to mark completed", context.generationId, finalizeError);
    return { remaining, result: stored.urls[0], results: stored.urls, generationId: context.generationId };
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      await failGeneration(context, "insufficient_credits");
      return { response: NextResponse.json({ error: "เครดิตไม่พอ กรุณาเติมเครดิตหรืออัปเกรดแพ็กเกจ" }, { status: 402 }) };
    }
    if (error instanceof Error && error.message === "generated_image_too_large") {
      await failGeneration(context, "output_too_large");
      return { response: NextResponse.json({ error: "ภาพผลลัพธ์ใหญ่เกินขนาดที่ Supabase Storage รองรับ กรุณาเพิ่มขนาด bucket เป็น 50 MB แล้วลองใหม่" }, { status: 413 }) };
    }

    throw error;
  }
}

export async function persistGeneratedImages(userId: string, generationId: string, results: string[], logoUrl?: string | null) {
  const paths: string[] = [];
  const urls: string[] = [];
  const storage = createServiceRoleClient().storage.from("generations");

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    const providerResponse = await fetch(result);
    if (!providerResponse.ok) throw new Error("Unable to retrieve generated image");
    let image = await providerResponse.blob();
    if (!image.type.startsWith("image/")) throw new Error("Provider returned an invalid image");
    if (logoUrl) {
      try {
        image = await overlayBrandLogo(image, logoUrl);
      } catch (error) {
        console.error("[persistGeneratedImages] brand logo overlay failed", error);
      }
    }
    const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/webp" ? "webp" : "png";
    const path = i === 0
      ? `${userId}/${generationId}/output.${extension}`
      : `${userId}/${generationId}/output_${i}.${extension}`;

    const { error } = await storage.upload(path, image, { contentType: image.type, upsert: true });
    if (error && "code" in error && error.code === "EntityTooLarge") {
      throw new Error("generated_image_too_large");
    }
    if (error) throw error;
    paths.push(path);
    urls.push(storage.getPublicUrl(path).data.publicUrl);
  }

  return { paths, urls };
}

export async function persistGeneratedImage(userId: string, generationId: string, result: string) {
  const { paths, urls } = await persistGeneratedImages(userId, generationId, [result]);
  return { path: paths[0], url: urls[0] };
}

export async function failGeneration(context: GenerationContext, reason: string) {
  await context.supabase.from("generations").update({ status: "failed", error: reason }).eq("id", context.generationId);
}

export function createFal() {
  return createFalClient({ credentials: process.env.FAL_KEY });
}
