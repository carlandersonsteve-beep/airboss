import { STORAGE_KEYS, ORDER_STATUS } from '../../core/constants.js';
import { normalizeOrderStatus } from '../../core/workflow.js';
import { createId, nowIso, readCollection, writeCollection } from '../storage.js';

function normalizeOrder(order) {
  return {
    ...order,
    status: normalizeOrderStatus(order.status),
  };
}

export const orderRepository = {
  list() {
    return readCollection(STORAGE_KEYS.ORDERS).map(normalizeOrder);
  },

  getById(id) {
    return this.list().find((item) => item.id === id) || null;
  },

  create(order) {
    const record = normalizeOrder({
      id: createId('ord'),
      createdAt: nowIso(),
      status: ORDER_STATUS.PENDING,
      ...order,
    });

    const items = this.list();
    items.push(record);
    writeCollection(STORAGE_KEYS.ORDERS, items);
    return record;
  },

  update(id, patch) {
    const items = this.list();
    const updated = items.map((item) =>
      item.id === id
        ? normalizeOrder({ ...item, ...patch, statusUpdatedAt: nowIso() })
        : item
    );
    writeCollection(STORAGE_KEYS.ORDERS, updated);
    return updated.find((item) => item.id === id) || null;
  },
};
