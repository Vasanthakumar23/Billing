export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl font-semibold text-white">404</div>
      <div className="text-sm text-[#91a1bc]">Page not found</div>
      <a href="/dashboard" className="rounded-xl border border-[rgba(148,163,184,0.2)] px-4 py-2 text-sm text-[#dbe6ff] hover:bg-white/5">
        Go to dashboard
      </a>
    </div>
  );
}
