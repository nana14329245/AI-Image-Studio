import { NextRequest } from "next/server";
import { getQueuedGenerationStatus } from "@/lib/imageGeneration";

// A completing poll downloads every result from fal.ai, stamps the brand logo and
// uploads it to storage — four images for Product Studio — which can outlast a
// platform's default function timeout.
export const maxDuration = 300;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getQueuedGenerationStatus(id);
}
