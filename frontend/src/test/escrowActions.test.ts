import { describe, expect, it } from 'vitest';
import {
  STATE_LABELS,
  State,
  formatDeadline,
  getAvailableActions,
  resolveRole,
  type EscrowAction,
} from '../lib/escrowActions';

const buyer = '0x1111111111111111111111111111111111111111';
const seller = '0x2222222222222222222222222222222222222222';
const arbiter = '0x3333333333333333333333333333333333333333';

const { AwaitingPayment, AwaitingDelivery, Complete, Disputed, Resolved, Refunded } = State;

describe('resolveRole', () => {
  it('returns buyer for the buyer address', () => {
    expect(resolveRole(buyer, buyer, seller, arbiter)).toBe('buyer');
  });

  it('returns seller for the seller address', () => {
    expect(resolveRole(seller, buyer, seller, arbiter)).toBe('seller');
  });

  it('returns arbiter for the arbiter address', () => {
    expect(resolveRole(arbiter, buyer, seller, arbiter)).toBe('arbiter');
  });

  it('returns none for an unknown address', () => {
    expect(resolveRole('0x4444444444444444444444444444444444444444', buyer, seller, arbiter)).toBe('none');
  });

  it('returns none when address is undefined', () => {
    expect(resolveRole(undefined, buyer, seller, arbiter)).toBe('none');
  });
});

describe('formatDeadline', () => {
  it('shows a pass note when the deadline has passed', () => {
    expect(formatDeadline(100, 100)).toBe('deadline passed');
    expect(formatDeadline(200, 100)).toBe('deadline passed');
  });

  it('rounds up sub-minute windows to whole minutes', () => {
    expect(formatDeadline(0, 90)).toBe('2m');
  });

  it('formats hours and minutes', () => {
    expect(formatDeadline(0, 3600)).toBe('1h');
    expect(formatDeadline(0, 3660)).toBe('1h 1m');
  });

  it('formats days, hours, and minutes', () => {
    expect(formatDeadline(0, 90000)).toBe('1d 1h');
  });
});

describe('getAvailableActions', () => {
  const deadlineFuture = 2000;
  const nowAfterDeadline = 3000;

  it('lets only the buyer deposit while awaiting payment', () => {
    expect(getAvailableActions(AwaitingPayment, 'buyer', 0, deadlineFuture)).toEqual<EscrowAction[]>(['deposit']);
    expect(getAvailableActions(AwaitingPayment, 'seller', 0, deadlineFuture)).toEqual([]);
    expect(getAvailableActions(AwaitingPayment, 'arbiter', 0, deadlineFuture)).toEqual([]);
    expect(getAvailableActions(AwaitingPayment, 'none', 0, deadlineFuture)).toEqual([]);
  });

  it('lets the buyer confirm or dispute while awaiting delivery before the deadline', () => {
    expect(getAvailableActions(AwaitingDelivery, 'buyer', 0, deadlineFuture)).toEqual<EscrowAction[]>([
      'confirmDelivery',
      'raiseDispute',
    ]);
  });

  it('adds refund for the buyer once the deadline has passed', () => {
    expect(getAvailableActions(AwaitingDelivery, 'buyer', nowAfterDeadline, deadlineFuture)).toEqual<EscrowAction[]>([
      'confirmDelivery',
      'raiseDispute',
      'refund',
    ]);
  });

  it('lets the seller raise a dispute but not confirm or refund', () => {
    expect(getAvailableActions(AwaitingDelivery, 'seller', nowAfterDeadline, deadlineFuture)).toEqual<EscrowAction[]>(['raiseDispute']);
  });

  it('gives no actions to the arbiter or strangers while awaiting delivery', () => {
    expect(getAvailableActions(AwaitingDelivery, 'arbiter', 0, deadlineFuture)).toEqual([]);
    expect(getAvailableActions(AwaitingDelivery, 'none', 0, deadlineFuture)).toEqual([]);
  });

  it('lets only the arbiter resolve a dispute, all-or-nothing', () => {
    expect(getAvailableActions(Disputed, 'arbiter', 0, deadlineFuture)).toEqual<EscrowAction[]>([
      'resolveToBuyer',
      'resolveToSeller',
    ]);
    expect(getAvailableActions(Disputed, 'buyer', 0, deadlineFuture)).toEqual([]);
    expect(getAvailableActions(Disputed, 'seller', 0, deadlineFuture)).toEqual([]);
  });

  it('allows no actions in terminal states', () => {
    expect(getAvailableActions(Complete, 'buyer', 0, deadlineFuture)).toEqual([]);
    expect(getAvailableActions(Resolved, 'arbiter', 0, deadlineFuture)).toEqual([]);
    expect(getAvailableActions(Refunded, 'buyer', nowAfterDeadline, deadlineFuture)).toEqual([]);
  });
});

describe('STATE_LABELS', () => {
  it('labels every state in enum order', () => {
    expect(STATE_LABELS).toEqual([
      'Awaiting Payment',
      'Awaiting Delivery',
      'Complete',
      'Disputed',
      'Resolved',
      'Refunded',
    ]);
  });
});
