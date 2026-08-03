# 🔒 Trust-Minimized Escrow Protocol

A production-ready, security-hardened, trust-minimized escrow protocol built with **Solidity**, **Foundry**, and **Next.js (wagmi / viem)**.

---

## 📌 Overview

This protocol enables peer-to-peer digital transactions without relying on centralized intermediaries. Funds are locked directly within a deterministic state-machine smart contract on-chain and can only be released or refunded based on defined state transition conditions.

### Key Security Features

- **Reentrancy Protection:** Enforces Checks-Effects-Interactions (CEI) pattern combined with a non-reentrant state guard.
- **Gas Optimized:** Utilizes custom errors, `immutable` roles, and optimized storage slots.
- **Formal Invariant Testing:** Verified using Foundry fuzzing and invariant suites to ensure contract balance logic cannot be broken.
- **Async Web3 UI:** Built using Next.js 14, `wagmi` v2, and `viem` for reliable transaction lifecycles.

---

## 🔄 State Machine Architecture

```
┌─────────────────────────┐
│     AwaitingPayment     │
└────────────┬────────────┘
             │ deposit() [Buyer]
             ▼
┌─────────────────────────┐
│    AwaitingDelivery     │
└─────┬───────────────┬───┘
      │               │
      │               │
      ▼               ▼
┌──────────────────────┐   ┌──────────────────────┐
│      Complete        │   │       Disputed       │
└──────────────────────┘   └───────────┬──────────┘
                                       │
                                       │ resolveDispute() [Arbiter]
                                       ▼
                              ┌──────────────────────┐
                              │       Resolved       │
                              └──────────────────────┘
```

- `releasePayment() [Buyer]` → `Complete`
- `raiseDispute() [Buyer/Seller]` → `Disputed`
- `resolveDispute() [Arbiter]` → `Resolved`

---

## 🛠 Tech Stack

- **Smart Contracts:** Solidity `^0.8.24`
- **Development & Testing:** Foundry (`forge`, `cast`)
- **Frontend:** Next.js, React, Tailwind CSS
- **Blockchain Connectivity:** `wagmi` v2, `viem`

---

## 🧪 Testing & Verification (Foundry)

### Run Unit & Fuzz Tests

```bash
forge test -vvv
```

### Run Invariant Tests

```bash
forge test --match-contract InvariantTest -vvv
```

### Check Gas Usage

```bash
forge snapshot
```

---

## 🚀 Deployment Guide

1. Clone the repository:

   ```bash
   git clone https://github.com/AmineMabrouk17/trustless-escrow-protocol.git
   cd trustless-escrow-protocol
   ```

2. Install Foundry dependencies:

   ```bash
   forge install
   ```

3. Deploy to testnet (e.g., Sepolia):

   ```bash
   forge script script/DeployEscrow.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
   ```

---

## 📁 Project Structure

```
trustless-escrow-protocol/
├── README.md
├── foundry.toml
├── src/
│   └── Escrow.sol
├── test/
│   └── Escrow.t.sol
├── script/
│   └── DeployEscrow.s.sol
└── frontend/
    └── src/
        └── components/
            └── EscrowInterface.tsx
```

---

## 📄 License

MIT License. Created by Amine Mabrouk.
