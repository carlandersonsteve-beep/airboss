import { STORAGE_KEYS } from '../core/constants.js';

export const storage = {
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (error) {
      return fallback;
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  },

  remove(key) {
    localStorage.removeItem(key);
  },
};

export function createId(prefix = '') {
  const base = Date.now().toString();
  return prefix ? `${prefix}-${base}` : base;
}

export function nowIso() {
  return new Date().toISOString();
}

export function readCollection(key) {
  return storage.get(key, []);
}

export function writeCollection(key, items) {
  return storage.set(key, items);
}

export function readCustomers() {
  return readCollection(STORAGE_KEYS.CUSTOMERS);
}

export function readOrders() {
  return readCollection(STORAGE_KEYS.ORDERS);
}

export function readTickets() {
  return readCollection(STORAGE_KEYS.TICKETS);
}

export function readMessages() {
  return readCollection(STORAGE_KEYS.MESSAGES);
}
