"use client";
import { useState } from "react";

function isEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (typeof data === "object" && !Array.isArray(data)) {
    return Object.keys(data as Record<string, unknown>).length === 0;
  }
  return false;
}

export function RawResponse({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  if (isEmpty(data)) {
    return (
      <span
        className="mono text-[10px] uppercase tracking-widest text-ink-mute"
        title="The provider returned no response body."
      >
        [ no response body ]
      </span>
    );
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mono text-[10px] uppercase tracking-widest text-ink-mute transition-colors duration-120 hover:text-ink"
      >
        {open ? "hide raw ↑" : "show raw ↓"}
      </button>
      {open && (
        <pre className="mono max-h-72 overflow-auto border border-rule bg-paper-sunken p-2.5 text-[11.5px] leading-snug text-ink-dim whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
