import './globals.css';

import type { Metadata } from 'next';
import { Inter, Public_Sans } from 'next/font/google';
import { ReactNode } from 'react';

import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'Billing Admin',
  description: 'Fee collection and tracking'
};

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-display' });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${publicSans.variable}`}>
        <Providers>
          <Toaster>{children}</Toaster>
        </Providers>
      </body>
    </html>
  );
}
