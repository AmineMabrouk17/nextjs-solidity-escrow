export type EscrowRole = 'buyer' | 'seller' | 'arbiter' | 'none';

export type EscrowAction =
  | 'deposit'
  | 'confirmDelivery'
  | 'raiseDispute'
  | 'refund'
  | 'resolveToBuyer'
  | 'resolveToSeller';

export const State = {
  AwaitingPayment: 0,
  AwaitingDelivery: 1,
  Complete: 2,
  Disputed: 3,
  Resolved: 4,
  Refunded: 5,
} as const;

export type State = (typeof State)[keyof typeof State];

export const STATE_LABELS: readonly string[] = [
  'Awaiting Payment',
  'Awaiting Delivery',
  'Complete',
  'Disputed',
  'Resolved',
  'Refunded',
];

export function resolveRole(
  address: string | undefined,
  buyer: string,
  seller: string,
  arbiter: string,
): EscrowRole {
  if (!address) return 'none';
  const lower = address.toLowerCase();
  if (lower === buyer.toLowerCase()) return 'buyer';
  if (lower === seller.toLowerCase()) return 'seller';
  if (lower === arbiter.toLowerCase()) return 'arbiter';
  return 'none';
}

/** Strictly after the deadline, matching the contract's refund gate. */
export function isAfterDeadline(nowSeconds: number, deadlineSeconds: number): boolean {
  return nowSeconds > deadlineSeconds;
}

export function formatDeadline(nowSeconds: number, deadlineSeconds: number): string {
  const remaining = deadlineSeconds - nowSeconds;
  if (remaining <= 0) return 'deadline passed';
  const totalMinutes = Math.ceil(remaining / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

export function getAvailableActions(
  state: State,
  role: EscrowRole,
  nowSeconds: number,
  deadlineSeconds: number,
): EscrowAction[] {
  switch (state) {
    case State.AwaitingPayment:
      return role === 'buyer' ? ['deposit'] : [];
    case State.AwaitingDelivery: {
      const actions: EscrowAction[] = [];
      if (role === 'buyer') {
        actions.push('confirmDelivery', 'raiseDispute');
        if (isAfterDeadline(nowSeconds, deadlineSeconds)) actions.push('refund');
      } else if (role === 'seller') {
        actions.push('raiseDispute');
      }
      return actions;
    }
    case State.Disputed:
      return role === 'arbiter' ? ['resolveToBuyer', 'resolveToSeller'] : [];
    default:
      return [];
  }
}
