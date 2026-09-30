import type { POStatus } from './types';

// Allowed PO status transitions. CANCELLED is reachable from every
// pre-receipt state (draft, sent) and from nowhere after goods arrive.
export const PO_TRANSITIONS: Record<POStatus, POStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['partially_received', 'received', 'cancelled'],
  partially_received: ['partially_received', 'received', 'closed'],
  received: ['closed'],
  closed: [],
  cancelled: [],
};

export function canTransition(from: POStatus, to: POStatus): boolean {
  return PO_TRANSITIONS[from]?.includes(to) ?? false;
}

/** A PO can be cancelled only before any goods have been received. */
export function canCancelPO(status: POStatus): boolean {
  return canTransition(status, 'cancelled');
}

/** A PO can be sent to the vendor only while it is still a draft. */
export function canSendPO(status: POStatus): boolean {
  return canTransition(status, 'sent');
}

/** A PO can receive goods once sent, and until it is fully received. */
export function canReceiveGoods(status: POStatus): boolean {
  return status === 'sent' || status === 'partially_received';
}