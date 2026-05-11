"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteBatchButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  async function doDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/batches/${batchId}`, { method: "DELETE" });
      if (res.ok) router.push("/batches");
    } finally {
      setBusy(false);
    }
  }

  if (!armed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setArmed(true)}
        title="delete this batch"
      >
        delete
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 mono text-[10px] uppercase tracking-widest text-warn">
      sure?
      <Button
        variant="destructive"
        size="sm"
        onClick={doDelete}
        disabled={busy}
      >
        {busy ? "deleting…" : "yes, delete"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setArmed(false)}
        disabled={busy}
      >
        cancel
      </Button>
    </span>
  );
}
