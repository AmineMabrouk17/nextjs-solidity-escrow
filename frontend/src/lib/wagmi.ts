import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, anvil } from 'viem/chains';

const chains = { sepolia, mainnet, anvil } as const;

export type SupportedChain = keyof typeof chains;

export const chain = (function () {
  const name = (process.env.NEXT_PUBLIC_CHAIN ?? 'sepolia').toLowerCase();
  return (chains[name as SupportedChain] ?? sepolia) as typeof sepolia;
})();

export function resolveRpcUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_RPC_URL || undefined;
}

export const config = createConfig({
  chains: [chain],
  transports: {
    [chain.id]: http(resolveRpcUrl()),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
