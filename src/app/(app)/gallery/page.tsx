import PageHeader from "@/components/PageHeader";
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
      .select("id, tool, output_url, created_at, scale")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (tool) query = query.eq("tool", tool);

    const { data } = await query;
    generations = data ?? [];
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
