import { STORAGE_KEYS } from '../../core/constants.js';
import { createId, nowIso, readCollection, writeCollection } from '../storage.js';

export const ticketRepository = {
  list() {
    return readCollection(STORAGE_KEYS.TICKETS);
  },

  create(ticket) {
    const record = {
      id: createId('tkt'),
      createdAt: nowIso(),
      status: 'pending',
      ...ticket,
    };

    const items = this.list();
    items.push(record);
    writeCollection(STORAGE_KEYS.TICKETS, items);
    return record;
  },

  update(id, patch) {
    const items = this.list();
    const updated = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
    writeCollection(STORAGE_KEYS.TICKETS, updated);
    return updated.find((item) => item.id === id) || null;
  },

  remove(id) {
    const updated = this.list().filter((item) => item.id !== id);
    writeCollection(STORAGE_KEYS.TICKETS, updated);
    return true;
  },
};
