# Trust-Minimized Escrow

A peer-to-peer protocol that locks a buyer's funds in an on-chain state machine, releasing them to a seller only when the buyer confirms delivery — or to whichever party the arbiter decides when there's a dispute. No centralized intermediary.

## Language

**Escrow**:
A single instance of the protocol: one buyer, one seller, one arbiter, one fixed amount, and one lifecycle from creation to a terminal state.
_Avoid_: Deal, transaction

**Buyer**:
The party who funds the escrow and who the goods or services are delivered to. The buyer creates the escrow.
_Avoid_: Payer, user

**Seller**:
The party who is paid when the buyer confirms delivery.
_Avoid_: Payee, vendor

**Arbiter**:
The trusted third party who, in a dispute, decides which party receives the funds.
_Avoid_: Mediator, judge, moderator

**Deadline**:
The point in time after which an undelivered escrow becomes refundable by the buyer. Set once when the escrow is created.
_Avoid_: Timeout, expiry

**Refund**:
The buyer's right to recover their deposited funds once the deadline has passed while the escrow is still awaiting delivery.
_Avoid_: Withdrawal, cancellation

**Deposit**:
The single payment, of the exact escrow amount, that the buyer sends to fund the escrow and move it from awaiting-payment to awaiting-delivery.
_Avoid_: Funding, top-up
