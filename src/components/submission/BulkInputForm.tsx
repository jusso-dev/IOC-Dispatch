"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Section } from "@/components/ui/Section";
import { StatusDisc } from "@/components/ui/StatusDisc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { MonoValue } from "@/components/ui/MonoValue";
import { StatusPill } from "@/components/ui/StatusPill";
import { type ParsedIndicator } from "@/lib/indicators/types";
import type {
  ProviderActionPlan,
  SubmissionMode,
} from "@/lib/providers/types";
import type { ProviderCardData } from "@/components/providers/ProviderStatusCard";

interface PreviewRow {
  indicator: ParsedIndicator;
  plan: ProviderActionPlan[];
}

interface PreviewResponse {
  count: number;
  truncated: boolean;
  rows: PreviewRow[];
}

const MODE_LABEL: Record<SubmissionMode, string> = {
  lookup: "lookup",
  submit: "submit / report",
  dry_run: "dry run",
};

export function BulkInputForm({
  providers,
}: {
  providers: ProviderCardData[];
}) {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [mode, setMode] = useState<SubmissionMode>("lookup");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selected.size && providers.length) {
      const next = new Set<string>();
      for (const p of providers) if (p.status.available) next.add(p.id);
      setSelected(next);
    }
  }, [providers, selected.size]);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsInput]
  );

  function toggleProvider(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(providers.filter((p) => p.status.available).map((p) => p.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  function invertSelection() {
    setSelected((cur) => {
      const next = new Set<string>();
      for (const p of providers) {
        if (!p.status.available) continue;
        if (!cur.has(p.id)) next.add(p.id);
      }
      return next;
    });
  }

  const availableCount = providers.filter((p) => p.status.available).length;
  const allAvailableSelected =
    availableCount > 0 &&
    providers.every((p) => !p.status.available || selected.has(p.id));

  async function handleParse(): Promise<PreviewResponse | null> {
    setError(null);
    setParsing(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: rawInput,
          selectedProviderIds: Array.from(selected),
          mode,
        }),
      });
      const data = (await res.json()) as PreviewResponse | { error: unknown };
      if (!res.ok) {
        setError(JSON.stringify((data as { error: unknown }).error));
        setPreview(null);
        return null;
      }
      const ok = data as PreviewResponse;
      setPreview(ok);
      return ok;
    } finally {
      setParsing(false);
    }
  }

  async function handleAction() {
    setError(null);
    if (!rawInput.trim()) return;
    let p = preview;
    // Auto-parse if needed (or re-parse if the user changed providers/mode after preview).
    if (!p) {
      p = await handleParse();
      if (!p) return;
    }
    if (!p.count) {
      setError("No indicators parsed.");
      return;
    }
    setConfirmOpen(true);
  }

  // Invalidate preview when inputs that affect routing change.
  useEffect(() => {
    setPreview(null);
  }, [rawInput, mode, selected]);

  async function handleFile(file: File) {
    const text = await file.text();
    setRawInput((cur) => (cur ? cur + "\n" : "") + text);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          notes: notes || undefined,
          tags,
          mode,
          selectedProviderIds: Array.from(selected),
          input: rawInput,
          confirmed: true,
        }),
      });
      const data = (await res.json()) as
        | { batchId: string; queued: number; syncCompleted: number }
        | { error: unknown };
      if (!res.ok) {
        setError(JSON.stringify((data as { error: unknown }).error));
        return;
      }
      router.push(`/batches/${(data as { batchId: string }).batchId}`);
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  const providerSummary = useMemo(() => {
    if (!preview) return [];
    const counts: Record<string, { count: number; types: Set<string> }> = {};
    for (const row of preview.rows) {
      for (const p of row.plan) {
        if (!p.providerId || p.action === "skip") continue;
        if (!counts[p.providerId])
          counts[p.providerId] = { count: 0, types: new Set() };
        counts[p.providerId].count += 1;
        counts[p.providerId].types.add(row.indicator.type);
      }
    }
    return Object.entries(counts).map(([providerId, v]) => {
      const provider = providers.find((p) => p.id === providerId);
      return {
        providerId,
        name: provider?.name ?? providerId,
        count: v.count,
        types: Array.from(v.types),
        publicSubmissionPossible: !!provider?.publicSubmissionPossible,
      };
    });
  }, [preview, providers]);

  const skippedCount = useMemo(() => {
    if (!preview) return 0;
    return preview.rows.filter((r) =>
      ["skipped", "unsupported"].includes(r.indicator.status)
    ).length;
  }, [preview]);

  return (
    <div className="space-y-10">
      {/* ── batch metadata + paste ── */}
      <Section label="batch" registerMark="01" title="Indicators">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[2fr_1fr_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="batch-name">name (optional)</Label>
            <Input
              id="batch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="sept malspam wave"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">tags (csv)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="apt28, phishing"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mode">mode</Label>
            <NativeSelect
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as SubmissionMode)}
              options={[
                { value: "lookup", label: "lookup only" },
                { value: "submit", label: "submit / report" },
                { value: "dry_run", label: "dry run" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="notes">comment / context</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="passed to provider as the submission comment"
          />
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="indicators">paste / drop / upload</Label>
            <div className="flex items-center gap-2 mono text-[10px] uppercase tracking-widest text-ink-mute">
              <span>1/line · csv · refangs hxxp + [.]</span>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                upload .txt / .csv
              </Button>
            </div>
          </div>
          <Textarea
            id="indicators"
            className="mono min-h-[220px] text-[13px]"
            placeholder={`http://bad.example/a.exe
8.8.8.8
example.com
44d88612fea8a8f36de82e1278abb02f
user@example.com`}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            spellCheck={false}
          />
        </div>
      </Section>

      {/* ── providers ── */}
      <Section
        label="providers"
        registerMark="02"
        title="Dispatch targets"
        meta={
          <div className="flex items-center gap-3">
            <span>
              <span className="tabular-nums text-ink">{selected.size}</span>
              <span className="text-ink-mute">
                {" "}
                / {providers.length} selected
              </span>
            </span>
            <span aria-hidden className="text-ink-mute">·</span>
            <div className="inline-flex items-stretch border border-rule mono text-[10px] uppercase tracking-widest">
              <button
                type="button"
                onClick={selectAll}
                disabled={availableCount === 0 || allAvailableSelected}
                className="px-2 py-1 text-ink-dim transition-colors duration-120 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                title={`select all ${availableCount} ready providers`}
              >
                all
              </button>
              <span aria-hidden className="w-px bg-rule" />
              <button
                type="button"
                onClick={invertSelection}
                disabled={availableCount === 0}
                className="px-2 py-1 text-ink-dim transition-colors duration-120 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                title="invert selection across ready providers"
              >
                invert
              </button>
              <span aria-hidden className="w-px bg-rule" />
              <button
                type="button"
                onClick={clearAll}
                disabled={selected.size === 0}
                className="px-2 py-1 text-ink-dim transition-colors duration-120 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                title="clear selection"
              >
                none
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => {
            const checked = selected.has(p.id);
            const disabled = !p.status.available;
            const tone = p.status.available
              ? "ok"
              : p.status.enabled
              ? "warn"
              : "muted";
            return (
              <label
                key={p.id}
                className={`group flex cursor-pointer items-start gap-3 border px-3 py-2.5 transition-colors duration-120 ${
                  checked
                    ? "border-signal bg-paper-raised"
                    : "border-rule bg-paper hover:border-rule-strong"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleProvider(p.id)}
                  disabled={disabled}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="mono text-[13px] font-semibold text-ink truncate">
                        {p.name}
                      </span>
                      <span className="mono text-[10px] uppercase tracking-widest text-ink-mute truncate">
                        {p.id}
                      </span>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 mono text-[10px] uppercase tracking-widest text-ink-faint">
                      <StatusDisc tone={tone} />
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {p.supportedTypes.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mono text-[10px] uppercase tracking-widest text-ink-faint">
                    {p.capabilities.map((c, i) => (
                      <span key={c}>
                        {i > 0 && (
                          <span aria-hidden className="text-ink-mute">
                            ·{" "}
                          </span>
                        )}
                        {c}
                      </span>
                    ))}
                    <span aria-hidden className="text-ink-mute">
                      ·
                    </span>
                    <span
                      className={
                        p.preferredTransport === "playwright"
                          ? "text-warn"
                          : "text-ink-faint"
                      }
                    >
                      via {p.preferredTransport}
                    </span>
                    {p.publicSubmissionPossible && (
                      <Badge variant="signal" className="ml-auto">
                        [ public ]
                      </Badge>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </Section>

      {/* ── action bar ── */}
      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-4 border-t border-rule bg-paper/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-paper/85 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-4 mono text-[11px] uppercase tracking-widest text-ink-faint">
          <span>
            <span className="text-ink-mute">mode:</span>{" "}
            <span className="text-ink">{MODE_LABEL[mode]}</span>
          </span>
          {preview ? (
            <>
              <span className="text-ink-mute">·</span>
              <span>
                <span className="tabular-nums text-ink">{preview.count}</span>{" "}
                ioc
              </span>
              <span className="text-ink-mute">·</span>
              <span>
                <span className="tabular-nums text-ink">
                  {providerSummary.length}
                </span>{" "}
                prov
              </span>
              {skippedCount > 0 && (
                <>
                  <span className="text-ink-mute">·</span>
                  <span className="text-warn">
                    <span className="tabular-nums">{skippedCount}</span> skipped
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="text-ink-mute">·</span>
              <span className="text-ink-mute">
                {!rawInput.trim()
                  ? "paste indicators to begin"
                  : !selected.size
                  ? "select at least one provider"
                  : "ready"}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleParse}
            disabled={!rawInput.trim() || parsing}
            variant="outline"
          >
            {parsing ? "parsing…" : "preview"}
          </Button>
          <Button
            onClick={handleAction}
            disabled={!rawInput.trim() || parsing || submitting || !selected.size}
            variant="primary"
          >
            {parsing
              ? "parsing…"
              : mode === "dry_run"
              ? "run dry →"
              : mode === "lookup"
              ? "lookup →"
              : "submit batch →"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Server error</AlertTitle>
          <AlertDescription className="mono text-[12px]">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* ── preview ── */}
      {preview && (
        <Section
          label="preview"
          registerMark="03"
          title="Routing"
          meta={
            <>
              <span className="tabular-nums">{preview.count}</span> rows
              {preview.truncated && (
                <>
                  {" "}
                  <span className="text-warn">truncated</span>
                </>
              )}
            </>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[12px]"></TableHead>
                <TableHead className="w-[56px]">type</TableHead>
                <TableHead>indicator</TableHead>
                <TableHead className="w-[110px]">status</TableHead>
                <TableHead>eligible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.rows.map((row, i) => {
                const eligible = row.plan.filter(
                  (p) => p.action !== "skip" && p.providerId
                );
                return (
                  <TableRow key={i}>
                    <TableCell className="mono text-[10px] text-ink-mute tabular-nums">
                      {String(i + 1).padStart(3, "0")}
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={row.indicator.type} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <MonoValue
                          value={row.indicator.normalizedValue}
                          max={72}
                          size="sm"
                        />
                        {row.indicator.warning && (
                          <p className="mono text-[10px] uppercase tracking-widest text-warn">
                            {row.indicator.warning}
                          </p>
                        )}
                        {row.indicator.originalValue !==
                          row.indicator.normalizedValue && (
                          <p className="mono text-[10px] uppercase tracking-widest text-ink-mute">
                            orig:{" "}
                            <MonoValue
                              value={row.indicator.originalValue}
                              max={64}
                              size="xs"
                              className="text-ink-mute"
                            />
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusPill status={row.indicator.status} />
                    </TableCell>
                    <TableCell>
                      {eligible.length === 0 ? (
                        <span className="mono text-[11px] text-ink-mute">
                          — no eligible provider
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mono text-[11px] text-ink-dim">
                          {eligible.map((p, j) => (
                            <span
                              key={`${p.providerId}-${p.action}`}
                              className="inline-flex items-center gap-1"
                            >
                              {j > 0 && (
                                <span aria-hidden className="text-ink-mute">
                                  ·
                                </span>
                              )}
                              <span className="text-ink">{p.providerId}</span>
                              <span className="text-ink-mute">:</span>
                              <span>{p.action}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Section>
      )}

      {/* ── confirm dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "submit"
                ? "Confirm submission"
                : mode === "lookup"
                ? "Confirm lookup"
                : "Confirm dry run"}
            </DialogTitle>
            <DialogDescription>
              {mode === "submit"
                ? "Threat intelligence will be shared with the providers below. Some submissions may become public."
                : mode === "lookup"
                ? "Indicators will be queried against the providers below. The queries themselves may be logged by those providers."
                : "No external calls will be made; routing is validated locally."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="mono mb-3 text-[11px] uppercase tracking-widest text-ink-mute tabular-nums">
              {preview?.count ?? 0} ioc · {providerSummary.length} provider
              {providerSummary.length === 1 ? "" : "s"}
            </div>
            <ul className="divide-y divide-rule-faint border border-rule">
              {providerSummary.map((p) => (
                <li
                  key={p.providerId}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="mono text-[12px] text-ink">{p.name}</span>
                    <span className="mono text-[10px] uppercase tracking-widest text-ink-mute">
                      {p.types.join(" / ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mono text-[11px] tabular-nums">
                    <span className="text-ink">{p.count}</span>
                    {p.publicSubmissionPossible && (
                      <Badge variant="signal">[ public ]</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              variant={mode === "submit" ? "primary" : "secondary"}
            >
              {submitting ? "submitting…" : "continue →"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
