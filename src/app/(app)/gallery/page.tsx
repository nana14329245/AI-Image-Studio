import PageHeader from "@/components/PageHeader";
import { ownedGenerationPaths } from "@/lib/generationStorage";
import { signStoragePaths } from "@/lib/signedUrls";
import { createClient } from "@/lib/supabase/server";
import GalleryClient, { type GenerationItem } from "./GalleryClient";

const tabs = [
  { label: "All", value: undefined },
  { label: "Upscale", value: "upscale" },
  { label: "Product", value: "product" },
  { label: "Ads", value: "ads" },
  { label: "Portrait", value: "portrait" },
] as const;

type GalleryPageProps = {
  searchParams: Promise<{ tool?: string | string[] }>;
};

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { tool: requestedTool } = await searchParams;
  const tool = typeof requestedTool === "string" && tabs.some((tab) => tab.value === requestedTool)
    ? requestedTool
    : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let generations: GenerationItem[] = [];

  if (user) {
    let query = supabase
      .from("generations")
      .select("id, tool, output_path, output_url, created_at, scale")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (tool) query = query.eq("tool", tool);

    const { data } = await query;
    const rows = data ?? [];
    // One thumbnail per generation: its first output, signed for the private bucket.
    const thumbnailPaths = rows.map((row) => ownedGenerationPaths(user.id, row.id, row.output_path, null)[0] ?? null);
    const toSign = thumbnailPaths.filter((path): path is string => path !== null);
    let signed = new Map<string, string>();
    try {
      const urls = await signStoragePaths(toSign);
      signed = new Map(toSign.map((path, index) => [path, urls[index]]));
    } catch (error) {
      console.error("[gallery] signing thumbnails failed", error);
    }
    generations = rows.map((row, index) => {
      const path = thumbnailPaths[index];
      return {
        id: row.id,
        tool: row.tool,
        created_at: row.created_at,
        scale: row.scale,
        // Rows from before results were copied to storage only have the provider's URL.
        image_url: path ? signed.get(path) ?? null : row.output_url,
      };
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="LIBRARY / OUTPUTS"
        number="LIBRARY / 005"
        title={<>Everything you<br />have made<span className="text-accent">.</span></>}
        description="รวมผลงานจากทุกเครื่องมือไว้ในที่เดียว พร้อมปุ่มดาวน์โหลดและลบภาพ"
      />
      <GalleryClient initialGenerations={generations} activeTool={tool} />
    </>
  );
}
