import { AppError } from './errors.js';
import { normalizeOrderStatus } from '../../src/core/workflow.js';

const ROLE_TRANSITIONS = {
  ADMIN: new Set([
    'pending->in_progress',
    'in_progress->ready_for_front_desk',
    'ready_for_front_desk->in_progress',
    'ready_for_front_desk->closed',
    'closed->ready_for_front_desk',
  ]),
  RAMP: new Set([
    'pending->in_progress',
    'in_progress->ready_for_front_desk',
    'ready_for_front_desk->in_progress',
  ]),
  OFFICE: new Set([
    'ready_for_front_desk->closed',
    'closed->ready_for_front_desk',
  ]),
};

const ROLE_FIELDS = {
  ADMIN: null,
  RAMP: new Set([
    'status',
    'statusUpdatedAt',
    'completedAt',
    'fuelActualGallons',
    'fuelQuantity',
    'fuelMeterStart',
    'fuelMeterEnd',
    'completionNotes',
  ]),
  OFFICE: new Set([
    'status',
    'statusUpdatedAt',
    'preDepartureSent',
    'preDepartureSentAt',
  ]),
};

export function validateOrderMutation(currentOrder, patch, actorRole) {
  const role = String(actorRole || '').toUpperCase();
  const allowedFields = ROLE_FIELDS[role];
  if (allowedFields === undefined) {
    throw new AppError('Forbidden order mutation role', 403);
  }

  const changedFields = Object.keys(patch || {}).filter((key) => !valuesEqual(currentOrder?.[key], patch[key]));
  if (allowedFields) {
    const forbiddenFields = changedFields.filter((key) => !allowedFields.has(key));
    if (forbiddenFields.length > 0) {
      throw new AppError('Forbidden order fields for role', 403, { role, forbiddenFields });
    }
  }

  if (patch?.status !== undefined && normalizeOrderStatus(patch.status) !== normalizeOrderStatus(currentOrder?.status)) {
    const transition = `${normalizeOrderStatus(currentOrder?.status)}->${normalizeOrderStatus(patch.status)}`;
    if (!ROLE_TRANSITIONS[role]?.has(transition)) {
      throw new AppError('Forbidden order status transition for role', 403, { role, transition });
    }
  }

  validateCompletionIntegrity(currentOrder, patch);
}

function validateCompletionIntegrity(currentOrder, patch) {
  const nextStatus = normalizeOrderStatus(patch?.status ?? currentOrder?.status);
  if (nextStatus !== 'ready_for_front_desk' && nextStatus !== 'closed') return;

  const fuelType = patch?.fuelType ?? currentOrder?.fuelType;
  if (!fuelType) return;

  const actual = numberOrNull(patch?.fuelActualGallons ?? patch?.fuelQuantity ?? currentOrder?.fuelActualGallons);
  if (actual === null || actual < 0) {
    throw new AppError('Actual gallons are required before fuel service can be handed off', 400);
  }

  const requested = numberOrNull(patch?.fuelRequestedGallons ?? currentOrder?.fuelRequestedGallons ?? currentOrder?.fuelQuantity);
  const completionNotes = String(patch?.completionNotes ?? currentOrder?.completionNotes ?? '').trim();
  if (requested !== null && Math.abs(actual - requested) >= 0.05 && !completionNotes) {
    throw new AppError('A completion note is required when actual fuel differs from requested fuel', 400);
  }

  const meterStart = numberOrNull(patch?.fuelMeterStart ?? currentOrder?.fuelMeterStart);
  const meterEnd = numberOrNull(patch?.fuelMeterEnd ?? currentOrder?.fuelMeterEnd);
  if (meterStart !== null && meterEnd !== null && meterEnd < meterStart) {
    throw new AppError('Fuel meter end cannot be less than fuel meter start', 400);
  }
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function valuesEqual(left, right) {
  if (left === right) return true;
  if (left === undefined && right === null) return true;
  if (left === null && right === undefined) return true;
  return JSON.stringify(left) === JSON.stringify(right);
}
