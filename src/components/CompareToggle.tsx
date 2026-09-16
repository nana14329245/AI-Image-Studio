"use client";

export type CompareView = "original" | "result";

/**
 * Switches a tool's preview between the uploaded photo and the generated one.
 * Seeing the two in the same frame is what shows the tool did anything, so every
 * tool offers it rather than only showing the result.
 */
export default function CompareToggle({
  view,
  onChange,
  resultReady,
  className = "",
}: {
  view: CompareView;
  onChange: (view: CompareView) => void;
  resultReady: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label="สลับดูภาพต้นฉบับกับผลลัพธ์" className={`flex border border-line p-1 ${className}`}>
      {(["original", "result"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          disabled={tab === "result" && !resultReady}
          aria-pressed={view === tab}
          onClick={() => onChange(tab)}
          className={`control-focus px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
            view === tab ? "bg-ink text-paper" : "hover:bg-surface-hover"
          }`}
        >
          {tab === "original" ? "ต้นฉบับ" : "ผลลัพธ์"}
        </button>
      ))}
    </div>
  );
}
