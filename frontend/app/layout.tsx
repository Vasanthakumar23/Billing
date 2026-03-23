import './globals.css';

import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { ReactNode } from 'react';

import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'Billing Admin',
  description: 'Fee collection and tracking'
};

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        <Providers>
          <Toaster>{children}</Toaster>
        </Providers>
      </body>
    </html>
  );
}
