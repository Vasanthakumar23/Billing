'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="text-lg font-semibold text-white">Something went wrong</div>
      <div className="text-sm text-[#91a1bc]">{error.message}</div>
      <button
        className="rounded-xl border border-[rgba(148,163,184,0.2)] px-4 py-2 text-sm text-[#dbe6ff] hover:bg-white/5"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
