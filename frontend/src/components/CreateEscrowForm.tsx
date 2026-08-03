'use client';

import { useState } from 'react';
import Link from 'next/link';
import { isAddress, parseEther } from 'viem';
import {
  useDeployContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { escrowAbi, escrowBytecode } from '@/lib/escrow';
import { errorMessage } from '@/lib/errors';
import { WalletButton } from '@/components/WalletButton';

export function CreateEscrowForm() {
  const [seller, setSeller] = useState('');
  const [arbiter, setArbiter] = useState('');
  const [amountEth, setAmountEth] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: deployHash,
    isPending: isDeploying,
    deployContractAsync,
  } = useDeployContract();
  const {
    data: deployReceipt,
    isPending: isDeployConfirming,
    isSuccess: isDeployConfirmed,
  } = useWaitForTransactionReceipt({ hash: deployHash });

  const [depositAmount, setDepositAmount] = useState('');
  const {
    data: depositHash,
    isPending: isDepositing,
    writeContractAsync,
  } = useWriteContract();
  const { isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({ hash: depositHash });

  const escrowAddress = deployReceipt?.contractAddress;

  function deadlineSeconds(): number {
    return Math.floor(new Date(deadlineAt).getTime() / 1000);
  }

  async function handleDeploy() {
    setValidation(null);
    setActionError(null);

    if (!isAddress(seller)) {
      setValidation('Seller must be a valid address.');
      return;
    }
    if (!isAddress(arbiter)) {
      setValidation('Arbiter must be a valid address.');
      return;
    }
    let amountWei: bigint;
    try {
      amountWei = parseEther(amountEth || '0');
    } catch {
      setValidation('Amount must be a valid number of ETH.');
      return;
    }
    if (amountWei <= 0n) {
      setValidation('Amount must be greater than zero.');
      return;
    }
    const dl = deadlineSeconds();
    if (!deadlineAt || Number.isNaN(dl)) {
      setValidation('Choose a deadline.');
      return;
    }
    if (dl <= Math.floor(Date.now() / 1000)) {
      setValidation('Deadline must be in the future.');
      return;
    }

    setDepositAmount(amountEth);

    try {
      await deployContractAsync({
        abi: escrowAbi,
        bytecode: escrowBytecode,
        args: [seller as `0x${string}`, arbiter as `0x${string}`, amountWei, BigInt(dl)],
      });
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleDeposit() {
    if (!escrowAddress) return;
    setActionError(null);
    try {
      await writeContractAsync({
        address: escrowAddress,
        abi: escrowAbi,
        functionName: 'deposit',
        value: parseEther(depositAmount || '0'),
      });
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Escrow</h1>
        <WalletButton />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Seller address</label>
          <input
            value={seller}
            onChange={(e) => setSeller(e.target.value)}
            placeholder="0x..."
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Arbiter address</label>
          <input
            value={arbiter}
            onChange={(e) => setArbiter(e.target.value)}
            placeholder="0x..."
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Amount (ETH)</label>
          <input
            value={amountEth}
            onChange={(e) => setAmountEth(e.target.value)}
            placeholder="0.5"
            inputMode="decimal"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Deadline</label>
          <input
            type="datetime-local"
            value={deadlineAt}
            onChange={(e) => setDeadlineAt(e.target.value)}
            className={inputClass}
          />
        </div>

        {validation && <p className="text-sm text-amber-400">{validation}</p>}
        {actionError && <p className="text-sm text-red-400">{actionError}</p>}

        <button
          onClick={handleDeploy}
          disabled={isDeploying || isDeployConfirming}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-50"
        >
          {isDeploying ? 'Signing...' : isDeployConfirming ? 'Deploying...' : 'Deploy Escrow'}
        </button>

        {isDeployConfirmed && escrowAddress && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-4 space-y-3">
            <p className="text-sm text-emerald-300">
              Escrow deployed. You are the buyer — fund it to move to awaiting-delivery.
            </p>
            <p className="break-all font-mono text-xs text-slate-300">{escrowAddress}</p>
            <Link
              href={`/escrow?address=${escrowAddress}`}
              className="block text-sm text-emerald-400 underline"
            >
              View escrow detail →
            </Link>
            <div className="space-y-2 border-t border-slate-700 pt-3">
              <label className="block text-sm text-slate-400">
                Deposit amount (must be exactly the escrow amount)
              </label>
              <input
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
              <button
                onClick={handleDeposit}
                disabled={isDepositing}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {isDepositing ? 'Signing...' : isDepositConfirmed ? 'Deposited ✓' : 'Deposit Funds'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
