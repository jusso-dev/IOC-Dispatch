import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BulkInputForm } from "@/components/submission/BulkInputForm";
import { listProviders } from "@/lib/providers/registry";
import type { ProviderCardData } from "@/components/providers/ProviderStatusCard";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const providers: ProviderCardData[] = await Promise.all(
    listProviders().map(async (p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      supportedTypes: p.supportedTypes,
      capabilities: p.capabilities,
      preferredTransport: p.preferredTransport,
      availableTransports: p.availableTransports,
      publicSubmissionPossible: p.publicSubmissionPossible,
      warning: p.warning,
      status: await p.getStatus(),
    }))
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-ink-mute">
            [00] new batch
          </div>
          <h1 className="mt-1 mono text-[24px] font-medium tracking-tight text-ink">
            New submission
          </h1>
          <p className="mt-1 max-w-[68ch] text-[13px] text-ink-dim">
            Paste indicators, pick providers, preview the routing, dispatch.
            Each indicator goes only to providers that accept its type.
          </p>
        </div>
      </header>

      <Alert variant="warning">
        <div>
          <AlertTitle>Read before submitting.</AlertTitle>
          <AlertDescription>
            External submissions may share indicators with third parties.
            URLhaus, AbuseIPDB reports, and urlscan public scans become publicly
            visible. Use <span className="mono text-ink">lookup</span> if you
            want enrichment without reporting. URLs are never rendered as
            clickable links and are never fetched by this app.
          </AlertDescription>
        </div>
      </Alert>

      <BulkInputForm providers={providers} />
    </div>
  );
}
