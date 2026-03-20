import { ORDER_STATUS, LEGACY_ORDER_STATUS_MAP } from './constants.js';

export function normalizeOrderStatus(status) {
  return LEGACY_ORDER_STATUS_MAP[status] || status || ORDER_STATUS.PENDING;
}

export function canTransitionOrder(currentStatus, nextStatus) {
  const current = normalizeOrderStatus(currentStatus);
  const next = normalizeOrderStatus(nextStatus);

  const allowed = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.IN_PROGRESS],
    [ORDER_STATUS.IN_PROGRESS]: [ORDER_STATUS.READY_FOR_FRONT_DESK],
    [ORDER_STATUS.READY_FOR_FRONT_DESK]: [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.CLOSED],
    [ORDER_STATUS.CLOSED]: [ORDER_STATUS.READY_FOR_FRONT_DESK],
  };

  return (allowed[current] || []).includes(next);
}

export function requireFuelVerification(order) {
  return Boolean(order?.fuelType);
}

export function getRecallStatus(status) {
  const normalized = normalizeOrderStatus(status);

  if (normalized === ORDER_STATUS.READY_FOR_FRONT_DESK) {
    return ORDER_STATUS.IN_PROGRESS;
  }

  if (normalized === ORDER_STATUS.CLOSED) {
    return ORDER_STATUS.READY_FOR_FRONT_DESK;
  }

  return normalized;
}
