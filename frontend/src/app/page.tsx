import { Header } from "@/components/Header";

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div className="shrink-0 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
      {text}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />

      <div className="flex min-h-0 flex-1">
        {/* TODO: Investigation List */}
        <Panel
          title="Investigations"
          className="w-70 shrink-0 border-r border-border bg-surface"
        >
          <EmptyState text="Case list — coming in Step 5." />
        </Panel>

        {/* TODO: Agent chat */}
        <Panel title="Investigation Chat" className="min-w-0 flex-1">
          <EmptyState text="Agent chat — coming in Step 6." />
        </Panel>

        {/* TODO: Context panel */}
        <Panel
          title="Context"
          className="w-90 shrink-0 border-l border-border bg-surface"
        >
          <EmptyState text="KYC / transactions / regulations — coming in Step 7." />
        </Panel>
      </div>
    </div>
  );
}