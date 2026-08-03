import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Trustless Escrow',
  description: 'A trust-minimized peer-to-peer escrow protocol on Sepolia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="border-b border-slate-800">
            <nav className="mx-auto max-w-3xl flex items-center gap-6 px-4 py-3">
              <Link href="/" className="font-bold tracking-tight">
                Trustless Escrow
              </Link>
              <Link href="/create" className="text-sm text-slate-400 hover:text-slate-100">
                Create
              </Link>
              <div className="ml-auto">
                <Link href="/escrow" className="text-sm text-slate-400 hover:text-slate-100">
                  Escrow Detail
                </Link>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
