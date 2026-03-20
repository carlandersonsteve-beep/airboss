import { STORAGE_KEYS } from '../../core/constants.js';
import { storage } from '../storage.js';

export function exportSnapshot() {
  return {
    customers: storage.get(STORAGE_KEYS.CUSTOMERS, []),
    orders: storage.get(STORAGE_KEYS.ORDERS, []),
    tickets: storage.get(STORAGE_KEYS.TICKETS, []),
    messages: storage.get(STORAGE_KEYS.MESSAGES, []),
    marketingList: storage.get(STORAGE_KEYS.MARKETING_LIST, []),
    exportDate: new Date().toISOString(),
    version: 'phase-1a-scaffold',
  };
}

export function importSnapshot(data) {
  storage.set(STORAGE_KEYS.CUSTOMERS, data.customers || []);
  storage.set(STORAGE_KEYS.ORDERS, data.orders || []);
  storage.set(STORAGE_KEYS.TICKETS, data.tickets || []);
  storage.set(STORAGE_KEYS.MESSAGES, data.messages || []);
  storage.set(STORAGE_KEYS.MARKETING_LIST, data.marketingList || []);
  return true;
}
