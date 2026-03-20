import { STORAGE_KEYS, MESSAGE_CHANNELS } from '../../core/constants.js';
import { createId, nowIso, readCollection, writeCollection } from '../storage.js';

export const messageRepository = {
  list() {
    return readCollection(STORAGE_KEYS.MESSAGES);
  },

  create(message) {
    const record = {
      id: createId('msg'),
      createdAt: nowIso(),
      channel: MESSAGE_CHANNELS.GENERAL,
      orderId: null,
      ...message,
    };

    const items = this.list();
    items.push(record);
    writeCollection(STORAGE_KEYS.MESSAGES, items);
    return record;
  },
};
