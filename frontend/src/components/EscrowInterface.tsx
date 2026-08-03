import React from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';

const ESCROW_ABI = [
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confirmDelivery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentState",
    "outputs": [{"type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const ESCROW_ADDRESS = '0x1234567890123456789012345678901234567890'; // Replace after deployment

export default function EscrowInterface() {
  const { data: state } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'currentState',
  });

  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleDeposit = () => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'deposit',
      value: parseEther('0.1'),
    });
  };

  const handleConfirm = () => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'confirmDelivery',
    });
  };

  const states = ['Awaiting Payment', 'Awaiting Delivery', 'Complete', 'Disputed', 'Resolved'];

  return (
    <div className="p-6 max-w-md mx-auto bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800">
      <h2 className="text-xl font-bold mb-4">Trustless Escrow Control</h2>

      <div className="mb-6 p-4 bg-slate-800 rounded-lg">
        <span className="text-sm text-slate-400">Current Protocol State:</span>
        <div className="text-lg font-semibold text-emerald-400">
          {state !== undefined ? states[state] : 'Loading...'}
        </div>
      </div>

      <div className="flex gap-4">
        {state === 0 && (
          <button
            onClick={handleDeposit}
            disabled={isPending || isConfirming}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition"
          >
            {isPending ? 'Signing...' : isConfirming ? 'Processing...' : 'Deposit Funds'}
          </button>
        )}

        {state === 1 && (
          <button
            onClick={handleConfirm}
            disabled={isPending || isConfirming}
            className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition"
          >
            {isPending ? 'Signing...' : isConfirming ? 'Releasing...' : 'Confirm & Release'}
          </button>
        )}
      </div>

      {isSuccess && <p className="mt-4 text-xs text-emerald-400">Transaction confirmed successfully!</p>}
    </div>
  );
}
