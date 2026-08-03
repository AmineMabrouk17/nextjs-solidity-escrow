# Trust-Minimized Escrow Protocol

A peer-to-peer protocol that locks a buyer's funds in an on-chain state machine, releasing them to a seller only when the buyer confirms delivery — or to whichever party the arbiter decides when there's a dispute. No centralized intermediary.

Built with **Solidity (^0.8.24)**, **Foundry**, and a **Next.js / wagmi / viem** frontend.

---

## Live demo

Deployed on Vercel: **https://trustless-escrow-demo.vercel.app**

The app runs against Sepolia. `NEXT_PUBLIC_ESCROW_ADDRESS` is unset by default, so open **Create** to deploy and fund a fresh escrow, then **Escrow Detail** to drive it through the lifecycle. Once a live Sepolia escrow is deployed (see below), set that address as the env var to pin a demo target on the home screen.

---

## State machine

```
 AwaitingPayment ── deposit() [Buyer] ──▶ AwaitingDelivery
 AwaitingPayment   (funds never held before deposit)
 AwaitingDelivery ── confirmDelivery() [Buyer] ──────▶ Complete        (seller paid)
 AwaitingDelivery ── raiseDispute() [Buyer|Seller] ──▶ Disputed
 AwaitingDelivery ── refund() [Buyer, after deadline] ▶ Refunded       (buyer paid)
 Disputed        ── resolveDispute() [Arbiter] ──────▶ Resolved       (all-or-nothing)
```

- Each escrow has an **immutable** buyer, seller, arbiter, amount, and an absolute unix `deadline` fixed at creation.
- `deposit()` must send the exact escrow amount or it reverts with `IncorrectAmount`.
- `refund()` is available only to the buyer, only while delivery is awaited, and strictly after the deadline. It is terminal.
- `resolveDispute()` is all-or-nothing to the buyer or the seller; the arbiter is a single immutable address.

See the ADRs under `docs/adr/` for the two hard-to-reverse decisions: the immutable single arbiter, and the absolute deadline + buyer refund.

---

## Smart contracts

### Build & test

```bash
forge install        # installs forge-std
forge build
forge test           # unit + fuzz tests
forge test --match-contract EscrowInvariantTest -vvv   # state-machine invariants
forge snapshot       # gas usage
```

### Deploy to Sepolia

`script/DeployEscrow.s.sol` reads everything from environment variables (see `.env.example`):

```bash
export PRIVATE_KEY=...               # deployer (becomes the buyer)
export SELLER_ADDRESS=0x...
export ARBITER_ADDRESS=0x...
export AMOUNT=100000000000000000     # wei (0.1 ETH)
export DEADLINE=$(($(date +%s) + 604800))   # unix seconds, e.g. +7 days
export SEPOLIA_RPC_URL=https://...

forge script script/DeployEscrow.s.sol \
  --rpc-url $SEPOLIA_RPC_URL --broadcast

# On-chain verification (optional; needs ETHERSCAN_API_KEY):
forge script script/DeployEscrow.s.sol \
  --rpc-url $SEPOLIA_RPC_URL --broadcast --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

The deployed address and transaction hash are recorded by Foundry under `broadcast/11155111/DeployEscrow.s.sol/`. **Never commit `.env`** — all values are in `.env.example` and `.gitignore` excludes `.env`.

Set `NEXT_PUBLIC_ESCROW_ADDRESS=<deployed>` in the frontend to point the app at the live contract.

---

## Frontend

A Next.js 15 app in `frontend/` using wagmi v2 / viem. Chain, RPC URL, and the demo escrow address are environment-driven.

```bash
cd frontend
npm install
cp .env.example .env.local     # defaults to Sepolia public RPC
npm run dev                    # http://localhost:3000
```

Env vars:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CHAIN` | `sepolia` (default), `mainnet`, or `anvil` |
| `NEXT_PUBLIC_RPC_URL` | Optional custom RPC (required for `anvil`) |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | Optional deployed escrow shown as the home-screen demo target |

The ABI and bytecode are generated from the compiled artifact:

```bash
forge build        # compile first
npm run gen:abi    # regenerates src/lib/escrow.ts from out/Escrow.sol/TrustlessEscrow.json
```

### Test / typecheck

```bash
npm test           # vitest: role resolution, deadline countdown, action visibility
npm run typecheck
npm run build
```

### Flows

- **Create** (`/create`): the buyer enters seller, arbiter, amount, and deadline, deploys a new escrow directly via wagmi, then funds it with the exact amount. A wrong deposit amount surfaces the contract's `IncorrectAmount` error. The new address links straight to the detail screen.
- **Escrow Detail** (`/escrow?address=...`): role-aware. Shows state, parties, amount, and a deadline countdown (from on-chain time), then offers exactly the actions that state + connected role allow — deposit, confirm, raise dispute, refund after the deadline, and the arbiter's all-or-nothing resolve.

---

## Project structure

```
├── src/Escrow.sol                 # TrustlessEscrow state machine
├── test/Escrow.t.sol              # unit + fuzz tests
├── test/EscrowInvariant.t.sol     # handler-based invariant tests
├── script/DeployEscrow.s.sol      # env-driven Sepolia deploy
├── docs/adr/                      # protocol ADRs
└── frontend/
    ├── app/                       # / , /create, /escrow routes
    ├── components/                # CreateEscrowForm, EscrowDetail, …
    ├── lib/escrow.ts              # generated ABI + bytecode
    ├── lib/escrowActions.ts       # pure role/state/action logic
    ├── lib/wagmi.ts               # env-driven chain config
    └── scripts/gen-abi.mjs        # regenerates the ABI from artifacts
```

---

## License

MIT. Created by Amine Mabrouk.
