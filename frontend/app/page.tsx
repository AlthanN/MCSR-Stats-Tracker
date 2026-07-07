import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { fetchTrendingPlayers } from "@/lib/api";
import { formatElo } from "@/lib/format";

export default async function HomePage() {
  let trending: Awaited<ReturnType<typeof fetchTrendingPlayers>> = [];
  try {
    trending = await fetchTrendingPlayers();
  } catch {
    trending = [];
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 border-b border-border flex items-center justify-between">
        <Link href="/" className="font-display text-[10px] sm:text-xs text-green tracking-wider">
          MCSR<span className="text-ink">STATS</span>
        </Link>
        <span className="text-[10px] text-ink-faint tracking-widest hidden sm:block">
          ANY% RANDOM SEED
        </span>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 pb-16">
        <div className="w-full max-w-2xl pt-[14vh] flex flex-col items-center">
          <div className="mb-3 text-[10px] tracking-[0.35em] text-green-dim font-display">
            LOOKUP TOOL
          </div>
          <h1 className="font-display text-xl sm:text-2xl leading-relaxed text-ink mb-3 text-center">
            MINECRAFT
            <br />
            <span className="text-green">SPEEDRUN</span> STATS
          </h1>
          <p className="text-ink-muted text-sm mb-10 text-center max-w-md leading-relaxed">
            Search any MCSR username to view split breakdowns, checkpoint
            consistency, seed performance, and recent ranked runs.
          </p>

          <SearchBar size="large" />

          {trending.length > 0 && (
            <div className="w-full mt-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-[10px] text-ink-muted tracking-widest">
                  EXAMPLE RUNNERS
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {trending.map((p) => (
                  <Link
                    key={p.name}
                    href={`/player/${encodeURIComponent(p.name)}`}
                    className="group card card-glow flex items-center gap-3 px-3 py-3 transition-colors hover:border-border-bright"
                  >
                    <img
                      src={`https://mc-heads.net/avatar/${encodeURIComponent(p.name)}/32`}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-sm border border-border image-pixelated"
                    />
                    <div className="min-w-0">
                      <div className="text-sm text-ink group-hover:text-green transition-colors truncate">
                        {p.name}
                      </div>
                      {p.currentElo !== null && (
                        <div className="text-gold-dim text-[10px] tabular">
                          {formatElo(p.currentElo)} elo
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-4 border-t border-border text-center text-[10px] text-ink-faint tracking-wide">
        Data from{" "}
        <a
          href="https://mcsrranked.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-dim hover:text-green transition-colors"
        >
          mcsrranked.com
        </a>
        {" · "}not affiliated with Mojang or MCSR Ranked · 2026
      </footer>
    </main>
  );
}
