import { ThemeToggle } from "@/components/ThemeToggle";

function StatusChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium">
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-success" : "bg-danger"}`}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function Header() {
  // TODO: remove placeholder
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <span className="text-xl font-bold tracking-tight text-primary">Vigil</span>
      <div className="flex items-center gap-2">
        <StatusChip label="Elastic" ok/>
        <StatusChip label="Gemini" ok/>
        <ThemeToggle/>
      </div>
    </header>
  );
}