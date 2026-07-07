export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 sm:px-8 py-4 border-b border-border">
        <div className="h-10 card animate-pulse-glow" />
      </div>
      <div className="flex-1 px-4 sm:px-8 py-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <div className="h-24 card animate-pulse-glow" />
        <div className="h-40 card animate-pulse-glow" />
        <div className="h-56 card animate-pulse-glow" />
        <div className="h-48 card animate-pulse-glow" />
        <p className="text-center text-ink-faint text-xs tracking-widest">
          FETCHING SPLITS…
        </p>
      </div>
    </div>
  );
}
