# Immutable single arbiter

The arbiter is set once at creation as an `immutable` address and can never be changed or removed. Disputes are resolved all-or-nothing by that single arbiter (Binance-style), never split or voted on.

The alternative — a multi-arbiter board, a replaceable arbiter, or an arbiter who can change after a dispute opens — was rejected because it expands the trust surface, complicates the state machine, and creates griefing vectors (a party renegotiating the arbiter mid-dispute). A single immutable arbiter keeps the protocol trivially auditable: whoever funded the escrow knows exactly who holds ultimate power, forever. Downside: the whole escrow depends on that one address behaving; if the arbiter goes dark mid-dispute, funds stay locked, which the deadline+refund path (ADR-0002) does not cure for a disputed escrow.
