import { ThemeToggle } from "@/components/ThemeToggle";
import { ConnectionStatus } from "@/components/ConnectionStatus";

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center">
        <img src="/vigil-logo.png" alt="Vigil logo" className="h-16 w-16 object-contain" />
        <span style={{ fontFamily: "var(--font-montserrat)" }}
          className="text-2xl font-extrabold uppercase tracking-wide text-foreground">
          Vigil
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ConnectionStatus />
        <ThemeToggle />
      </div>
    </header>
  );
}
