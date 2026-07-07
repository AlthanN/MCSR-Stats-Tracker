import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
      <div className="text-green text-4xl font-extrabold mb-1">404</div>
      <p className="text-ink text-sm">no runner found with that username.</p>
      <p className="text-ink-faint text-xs">
        check the spelling, or try a different username.
      </p>
      <Link
        href="/"
        className="mt-3 text-xs text-green border border-green-muted rounded-sm px-3 py-1.5 hover:bg-green hover:text-bg transition-colors"
      >
        back to search
      </Link>
    </div>
  );
}
