"use client";

import { useEffect, useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlayerLoadingSkeleton from "./PlayerLoadingSkeleton";

export default function SearchBar({
  size = "large",
  initialValue = "",
}: {
  size?: "large" | "compact";
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a username to search.");
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/player/${encodeURIComponent(trimmed)}`);
    });
  }

  const isLarge = size === "large";

  if (isPending) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" aria-busy="true" aria-live="polite">
        <PlayerLoadingSkeleton username={value.trim()} />
      </div>
    );
  }

  return (
    <div className="w-full">
      {size === "compact" && (
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/"
            className="font-display text-[10px] text-green-dim hover:text-green transition-colors tracking-wider"
          >
            ← MCSRSTATS
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <div
          className={[
            "flex items-center gap-3 bg-surface border border-border rounded-sm",
            "transition-shadow focus-within:shadow-glow focus-within:border-green",
            isLarge ? "px-5 py-4" : "px-3 py-2",
          ].join(" ")}
        >
          <span className="text-green/70 select-none font-bold">&gt;</span>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="search username_"
            aria-label="Minecraft username"
            className={[
              "flex-1 bg-transparent outline-none placeholder:text-ink-faint text-ink",
              isLarge ? "text-lg" : "text-sm",
            ].join(" ")}
          />
          <button
            type="submit"
            className={[
              "shrink-0 border border-green-muted text-green hover:bg-green hover:text-bg",
              "transition-colors rounded-sm font-semibold tracking-wide",
              isLarge ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs",
            ].join(" ")}
          >
            LOOKUP
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-bad">{error}</p>}
      </form>
    </div>
  );
}
