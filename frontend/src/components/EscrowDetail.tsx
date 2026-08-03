'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatEther, isAddress } from 'viem';
import { useAccount, useBlock, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { escrowAbi } from '@/lib/escrow';
import {
  formatDeadline,
  getAvailableActions,
  isAfterDeadline,
  resolveRole,
  STATE_LABELS,
  State,
  type EscrowAction,
} from '@/lib/escrowActions';
import { errorMessage } from '@/lib/errors';
import { WalletButton } from '@/components/WalletButton';

const ACTION_LABELS: Record<EscrowAction, string> = {
  deposit: 'Deposit Funds',
  confirmDelivery: 'Confirm Delivery & Release',
  raiseDispute: 'Raise Dispute',
  refund: 'Refund (deadline passed)',
  resolveToBuyer: 'Resolve → Buyer',
  resolveToSeller: 'Resolve → Seller',
  settleToBuyer: 'Settle → Buyer (deadline passed)',
  settleToSeller: 'Settle → Seller (deadline passed)',
};

export function EscrowDetail({ address: initialAddress }: { address?: string }) {
  const [addressInput, setAddressInput] = useState(initialAddress ?? '');
  const [runError, setRunError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<EscrowAction | null>(null);

  const { address: connectedAddress, isConnected } = useAccount();
  const { data: block } = useBlock({ query: { refetchInterval: 1000 } });

  const address = isAddress(addressInput) ? (addressInput as `0x${string}`) : undefined;

  const { data: state, isLoading: stateLoading } = useReadContract({
    address,
    abi: escrowAbi,
    functionName: 'currentState',
    query: { refetchInterval: 3000, enabled: Boolean(address) },
  });
  const { data: buyer } = useReadContract({
    address,
    abi: escrowAbi,
    functionName: 'buyer',
    query: { enabled: Boolean(address) },
  });
  const { data: seller } = useReadContract({
    address,
    abi: escrowAbi,
    functionName: 'seller',
    query: { enabled: Boolean(address) },
  });
  const { data: arbiter } = useReadContract({
    address,
    abi: escrowAbi,
    functionName: 'arbiter',
    query: { enabled: Boolean(address) },
  });
  const { data: amount } = useReadContract({
    address,
    abi: escrowAbi,
    functionName: 'amount',
    query: { enabled: Boolean(address) },
  });
  const { data: deadline } = useReadContract({
    address,
    abi: escrowAbi,
    functionName: 'deadline',
    query: { enabled: Boolean(address) },
  });

  const { data: txHash, writeContractAsync, isPending: isWriting } = useWriteContract();
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const now = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000);
  const role = resolveRole(connectedAddress, buyer ?? '', seller ?? '', arbiter ?? '');
  const stateNumber = Number(state ?? 0) as State;
  const actions = getAvailableActions(stateNumber, role, now, Number(deadline ?? 0));

  const stateLabel = state !== undefined ? STATE_LABELS[Number(state)] : undefined;

  async function runAction(action: EscrowAction) {
    if (!address) return;
    setRunError(null);
    setPendingAction(action);
    try {
      switch (action) {
        case 'deposit':
          if (amount === undefined) {
            setRunError('Escrow amount not loaded yet — try again in a moment.');
            return;
          }
          await writeContractAsync({ address, abi: escrowAbi, functionName: 'deposit', value: amount });
          break;
        case 'confirmDelivery':
          await writeContractAsync({ address, abi: escrowAbi, functionName: 'confirmDelivery' });
          break;
        case 'raiseDispute':
          await writeContractAsync({ address, abi: escrowAbi, functionName: 'raiseDispute' });
          break;
        case 'refund':
          await writeContractAsync({ address, abi: escrowAbi, functionName: 'refund' });
          break;
        case 'resolveToBuyer':
          await writeContractAsync({ address, abi: escrowAbi, functionName: 'resolveDispute', args: [buyer!] });
          break;
        case 'resolveToSeller':
          await writeContractAsync({ address, abi: escrowAbi, functionName: 'resolveDispute', args: [seller!] });
          break;
        case 'settleToBuyer':
          await writeContractAsync({ address, abi: escrowAbi, functionName: 'resolveAfterDeadline', args: [buyer!] });
          break;
        case 'settleToSeller':
          await writeContractAsync({ address, abi: escrowAbi, functionName: 'resolveAfterDeadline', args: [seller!] });
          break;
      }
    } catch (err) {
      setRunError(errorMessage(err));
    } finally {
      setPendingAction(null);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Escrow Detail</h1>
        <WalletButton />
      </div>

      {!address ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-3">
          <label className="block text-sm text-slate-400">Escrow contract address</label>
          <input
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="0x..."
            className={inputClass}
          />
          {!isConnected && <p className="text-sm text-slate-500">Connect a wallet to see role-aware actions.</p>}
        </div>
      ) : stateLoading && state === undefined ? (
        <p className="text-slate-400">Loading escrow…</p>
      ) : (
        <>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-400">State</span>
              <span className="rounded-full bg-emerald-950 px-3 py-1 text-sm font-semibold text-emerald-400">
                {stateLabel}
              </span>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Contract</dt>
                <dd className="break-all font-mono text-xs">{address}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Your role</dt>
                <dd className="capitalize">{role}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Buyer</dt>
                <dd className="break-all font-mono text-xs">{buyer}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Seller</dt>
                <dd className="break-all font-mono text-xs">{seller}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Arbiter</dt>
                <dd className="break-all font-mono text-xs">{arbiter}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Amount</dt>
                <dd>{amount !== undefined ? `${formatEther(amount)} ETH` : '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Deadline</dt>
                <dd className={isAfterDeadline(now, Number(deadline ?? 0)) ? 'text-red-400' : ''}>
                  {deadline !== undefined ? formatDeadline(now, Number(deadline)) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {runError && <p className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-400">{runError}</p>}
          {isTxConfirmed && <p className="text-sm text-emerald-400">Transaction confirmed.</p>}

          {actions.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-3">
              <h2 className="text-sm font-semibold text-slate-400">Actions available to you</h2>
              <div className="flex flex-wrap gap-3">
                {actions.map((action) => (
                  <button
                    key={action}
                    onClick={() => runAction(action)}
                    disabled={isWriting}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
                  >
                    {ACTION_LABELS[action]}
                  </button>
                ))}
              </div>
              {pendingAction && <p className="text-sm text-slate-400">Waiting for signature…</p>}
            </div>
          )}

          <p className="text-sm text-slate-500">
            Tip: you can also paste any escrow address in the box above to inspect it.
            <Link href="/create" className="ml-1 text-emerald-400 underline">
              Create a new one →
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
