"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type GenerationItem = {
  id: string;
  tool: string;
  output_url: string | null;
  created_at: string;
  scale: number | null;
};

const tabs = [
  { label: "All", value: undefined },
  { label: "Upscale", value: "upscale" },
  { label: "Product", value: "product" },
  { label: "Ads", value: "ads" },
  { label: "Portrait", value: "portrait" },
] as const;

function formatTool(tool: string) {
  return tool.charAt(0).toUpperCase() + tool.slice(1);
}

export default function GalleryClient({
  initialGenerations,
  activeTool,
}: {
  initialGenerations: GenerationItem[];
  activeTool?: string;
}) {
  const [generations, setGenerations] = useState<GenerationItem[]>(initialGenerations);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!window.confirm("คุณต้องการลบรูปภาพนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้")) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/generations/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "ลบรูปภาพไม่สำเร็จ");
      }

      setGenerations((prev) => prev.filter((g) => g.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบรูปภาพ");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-wrap">
      {error && (
        <div role="alert" className="mb-6 border border-danger bg-danger-bg p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-ink pb-4">
        <nav className="flex flex-wrap gap-1" aria-label="Filter gallery by tool">
          {tabs.map((tab) => {
            const active = activeTool === tab.value;
            const href = tab.value ? `/gallery?tool=${tab.value}` : "/gallery";

            return (
              <a
                key={tab.label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`px-4 py-2 text-sm ${
                  active ? "bg-ink text-white" : "border border-transparent hover:border-line"
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </nav>
        <span className="micro text-muted">
          {generations.length.toString().padStart(2, "0")} ITEMS
        </span>
      </div>

      {generations.length === 0 ? (
        <div className="border border-line p-8 text-center">
          <p className="micro text-muted">NO COMPLETED GENERATIONS</p>
          <p className="mt-2 text-sm">สร้างภาพแรกของคุณเพื่อให้แสดงที่นี่</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {generations.map((generation) => (
            <article key={generation.id} className="group relative">
              <div className="gallery-item relative overflow-hidden">
                {generation.output_url ? (
                  <img
                    src={generation.output_url}
                    alt={`${formatTool(generation.tool)} generation`}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-ink p-4 text-center text-xs text-white">
                    IMAGE UNAVAILABLE
                  </div>
                )}

                {/* Top Overlay: Quick Delete Button */}
                <button
                  type="button"
                  disabled={deletingId === generation.id}
                  onClick={() => handleDelete(generation.id)}
                  title="ลบรูปภาพนี้"
                  className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-none border border-ink bg-paper text-xs text-danger opacity-0 transition-opacity hover:bg-danger hover:text-white group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId === generation.id ? "…" : "✕"}
                </button>

                {/* Bottom Overlay: Action bar with Download & Delete */}
                <div className="absolute inset-x-0 bottom-0 z-10 translate-y-full bg-ink/95 p-3 text-white transition-transform group-hover:translate-y-0">
                  <div className="flex items-center justify-between">
                    <p className="micro text-muted-soft">{formatTool(generation.tool)}</p>
                    <div className="flex items-center gap-3">
                      <a
                        href={`/api/generations/${generation.id}/download`}
                        download
                        className="text-xs font-mono underline hover:text-accent"
                      >
                        DOWNLOAD
                      </a>
                      <button
                        type="button"
                        disabled={deletingId === generation.id}
                        onClick={() => handleDelete(generation.id)}
                        className="text-xs font-mono text-danger underline hover:text-red-400"
                      >
                        {deletingId === generation.id ? "DELETING..." : "DELETE"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex justify-between text-xs">
                <span>{generation.scale ? `${generation.scale}×` : formatTool(generation.tool)}</span>
                <time className="font-mono text-muted" dateTime={generation.created_at}>
                  {new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(
                    new Date(generation.created_at)
                  )}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
