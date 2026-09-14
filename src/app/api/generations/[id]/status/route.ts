import { NextRequest } from "next/server";
import { getQueuedGenerationStatus } from "@/lib/imageGeneration";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getQueuedGenerationStatus(id);
}
