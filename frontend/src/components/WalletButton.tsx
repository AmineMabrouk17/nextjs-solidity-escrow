'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState } from 'react';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showConnectors, setShowConnectors] = useState(false);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-slate-400">
          {address.slice(0, 6)}&hellip;{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowConnectors((v) => !v)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
      >
        Connect Wallet
      </button>
      {showConnectors && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-lg">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              disabled={isPending}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
