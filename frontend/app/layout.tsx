import './globals.css';

import type { Metadata } from 'next';
import { ReactNode } from 'react';

import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'Billing Admin',
  description: 'Fee collection and tracking'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Toaster>{children}</Toaster>
        </Providers>
      </body>
    </html>
  );
}
