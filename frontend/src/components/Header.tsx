import { ThemeToggle } from "@/components/ThemeToggle";
import { ConnectionStatus } from "@/components/ConnectionStatus";

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <span className="text-xl font-bold tracking-tight text-primary">Vigil</span>
      <div className="flex items-center gap-2">
        <ConnectionStatus />
        <ThemeToggle />
      </div>
    </header>
  );
}
