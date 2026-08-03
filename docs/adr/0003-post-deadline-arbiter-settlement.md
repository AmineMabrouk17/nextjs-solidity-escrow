# Post-deadline arbiter settlement

Once an escrow is in `AwaitingDelivery` and the deadline has strictly passed, the arbiter can call `resolveAfterDeadline(recipient)` to release the full amount to either the buyer or the seller, moving the escrow to the existing terminal `Resolved` state. It is arbiter-only, non-reentrant, and mirrors `resolveDispute` exactly, except that it acts from `AwaitingDelivery` (no dispute required) once `block.timestamp > deadline`.

The reason it exists: ADR-0002's buyer refund cures a stalled escrow only if the buyer cooperates. If the buyer goes silent — never confirms, never refunds, never disputes — the funds sit in the contract forever with no recovery path for the seller or arbiter. `resolveAfterDeadline` closes that hole by giving the resolution authority (the same single arbiter who settles disputes) a deterministic way to end an abandoned escrow.

Alternatives rejected: giving the seller a direct post-deadline claim races with the buyer's refund and hands the seller a front-running payoff window; an auto-release keeper bot adds infrastructure and trust; letting the arbiter act only via the existing dispute path still requires a party to raise the dispute, which a silent buyer will not do. First-to-act between the buyer's refund and the arbiter's settlement is accepted as safe: both outcomes are legitimate terminal judgments, so neither actor is incentivized to grief the other.

Trade-off accepted: this strengthens the arbiter's unilateral power in the non-dispute path, consistent with ADR-0001's single-arbiter trust model. A buyer who funds an escrow must trust the arbiter they (as funder) chose at creation.
