import Link from 'next/link';
import { WalletButton } from '@/components/WalletButton';

export default function HomePage() {
  const demoAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">Trust-Minimized Escrow</h1>
        <p className="text-slate-400">
          A peer-to-peer protocol that locks a buyer&apos;s funds in an on-chain state machine. Funds are
          released to the seller only when the buyer confirms delivery — or to whichever party the arbiter
          decides in a dispute.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/create"
          className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-emerald-500/50 transition"
        >
          <h2 className="font-semibold text-emerald-400">Create Escrow</h2>
          <p className="mt-1 text-sm text-slate-400">
            Deploy a new escrow as the buyer with a seller, arbiter, amount, and deadline. Then fund it.
          </p>
        </Link>
        <Link
          href={demoAddress ? `/escrow?address=${demoAddress}` : '/escrow'}
          className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-emerald-500/50 transition"
        >
          <h2 className="font-semibold text-emerald-400">Escrow Detail</h2>
          <p className="mt-1 text-sm text-slate-400">
            Inspect a live escrow&apos;s state and drive it: confirm, dispute, refund, or resolve.
          </p>
        </Link>
      </div>

      <div className="flex justify-end">
        <WalletButton />
      </div>
    </div>
  );
}
