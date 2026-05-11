import { listProviders } from "@/lib/providers/registry";
import {
  ProviderStatusCard,
  type ProviderCardData,
} from "@/components/providers/ProviderStatusCard";
import { Section } from "@/components/ui/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function ProviderSettingsPage() {
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

  const available = providers.filter((p) => p.status.available).length;
  const total = providers.length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-ink-mute">
            [06] providers
          </div>
          <h1 className="mt-1 mono text-[24px] font-medium tracking-tight text-ink">
            Provider matrix
          </h1>
          <p className="mt-1 max-w-[68ch] text-[13px] text-ink-dim">
            Configuration is driven entirely by environment variables on the
            server. API keys are never exposed to the browser or written to the
            response payload of any provider attempt.
          </p>
        </div>
        <div className="mono text-[11px] uppercase tracking-widest text-ink-faint">
          <span className="text-ink tabular-nums">{available}</span>{" "}
          <span className="text-ink-mute">/</span> {total} ready
        </div>
      </header>

      <Alert>
        <div>
          <AlertTitle>Secrets stay server-side.</AlertTitle>
          <AlertDescription>
            Each provider lists the env vars it reads. The browser never
            receives the values; provider attempts store a redacted version of
            the request, never the raw header.
          </AlertDescription>
        </div>
      </Alert>

      <Section label="adapters" registerMark="01" title="All providers">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => (
            <ProviderStatusCard key={p.id} p={p} />
          ))}
        </div>
      </Section>
    </div>
  );
}
