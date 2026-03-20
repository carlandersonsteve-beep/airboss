import { STORAGE_KEYS } from '../../core/constants.js';
import { createId, nowIso, readCollection, writeCollection } from '../storage.js';

export const customerRepository = {
  list() {
    return readCollection(STORAGE_KEYS.CUSTOMERS);
  },

  getById(id) {
    return this.list().find((item) => item.id === id) || null;
  },

  create(customer) {
    const record = {
      id: createId('cust'),
      createdAt: nowIso(),
      ...customer,
    };

    const items = this.list();
    items.push(record);
    writeCollection(STORAGE_KEYS.CUSTOMERS, items);
    return record;
  },

  update(id, patch) {
    const items = this.list();
    const updated = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
    writeCollection(STORAGE_KEYS.CUSTOMERS, updated);
    return updated.find((item) => item.id === id) || null;
  },
};
