import { ticketRepository } from '../../data/repositories/ticketRepository.js';

export const ticketService = {
  listTickets() {
    return ticketRepository.list();
  },

  createTicket(payload) {
    return ticketRepository.create(payload);
  },

  resolveTicket(ticketId) {
    return ticketRepository.update(ticketId, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
  },

  deleteTicket(ticketId) {
    return ticketRepository.remove(ticketId);
  },

  pendingTickets() {
    return ticketRepository.list().filter((ticket) => ticket.status === 'pending');
  },
};
