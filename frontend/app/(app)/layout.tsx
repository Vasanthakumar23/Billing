import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const token = cookies().get('access_token')?.value;
  if (!token) redirect('/login');
  return children;
}

