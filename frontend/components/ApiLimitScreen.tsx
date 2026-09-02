"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ApiRateLimitMeter from "./ApiRateLimitMeter";
import type { ApiRateLimit } from "@/lib/types";

export default function ApiLimitScreen({ status }: { status: ApiRateLimit }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function update() {
      setReady(!status.resetAt || new Date(status.resetAt).getTime() <= Date.now());
    }
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [status.resetAt]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="card max-w-lg w-full px-6 py-7 flex flex-col gap-5">
        <div>
          <div className="font-display text-[10px] tracking-widest text-bad mb-3">
            API LIMIT REACHED
          </div>
          <h1 className="text-xl font-bold text-ink">Stats are temporarily paused.</h1>
          <p className="text-sm text-ink-muted leading-relaxed mt-3">
            This app has used the shared MCSR allowance for the current
            10-minute window. No additional MCSR requests will be made until
            the reported reset time.
          </p>
        </div>

        <ApiRateLimitMeter status={status} />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!ready}
            onClick={() => router.refresh()}
            className="text-xs border border-green-muted text-green rounded-sm px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-green hover:enabled:text-bg transition-colors"
          >
            {ready ? "TRY AGAIN" : "WAITING FOR RESET"}
          </button>
          <Link
            href="/"
            className="text-xs border border-border text-ink-muted rounded-sm px-3 py-2 hover:text-ink transition-colors"
          >
            BACK TO SEARCH
          </Link>
        </div>
      </section>
    </main>
  );
}
