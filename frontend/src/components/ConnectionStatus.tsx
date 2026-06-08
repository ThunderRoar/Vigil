"use client";

import { useEffect, useState } from "react";

type Health = { elastic: boolean; gemini: boolean };
type ChipState = "ok" | "down" | "loading";

function Chip({ label, state }: { label: string; state: ChipState }) {
  const dot =
    state === "ok" ? "bg-success" : state === "down" ? "bg-danger" : "bg-muted";
  const title =
    state === "ok" ? "Connected" : state === "down" ? "Unreachable" : "Checking…";
  return (
    <span
      title={`${label}: ${title}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium"
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        {/* live "ping" ring when connected */}
        {state === "ok" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot} ${
            state === "loading" ? "animate-pulse" : ""
          }`}
        />
      </span>
      {label}
    </span>
  );
}

export function ConnectionStatus() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/health")
        .then((r) => r.json())
        .then((d) => alive && setHealth(d))
        .catch(() => alive && setHealth({ elastic: false, gemini: false }));
    load();
    const id = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const state = (v?: boolean): ChipState =>
    health == null ? "loading" : v ? "ok" : "down";

  return (
    <div className="flex items-center gap-2">
      <Chip label="Elastic" state={state(health?.elastic)} />
      <Chip label="Gemini" state={state(health?.gemini)} />
    </div>
  );
}
