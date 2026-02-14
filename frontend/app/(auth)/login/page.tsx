import { Suspense } from 'react';

import { LoginClient } from './login-client';

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-600">Loading…</div>}
    >
      <LoginClient />
    </Suspense>
  );
}

