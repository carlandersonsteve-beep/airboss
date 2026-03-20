import { MESSAGE_CHANNELS } from '../../core/constants.js';
import { messageRepository } from '../../data/repositories/messageRepository.js';

export const messageService = {
  listMessages() {
    return messageRepository.list();
  },

  sendGeneralMessage({ text, senderRole }) {
    if (!text?.trim()) {
      throw new Error('Message text is required');
    }

    return messageRepository.create({
      text: text.trim(),
      senderRole,
      channel: MESSAGE_CHANNELS.GENERAL,
      orderId: null,
    });
  },

  sendOrderMessage({ text, senderRole, orderId }) {
    if (!text?.trim()) {
      throw new Error('Message text is required');
    }

    return messageRepository.create({
      text: text.trim(),
      senderRole,
      channel: MESSAGE_CHANNELS.ORDER,
      orderId,
    });
  },

  unreadCount(messages, lastReadChat) {
    return (messages || []).filter((message) => {
      return new Date(message.createdAt).getTime() > (lastReadChat || 0);
    }).length;
  },
};
