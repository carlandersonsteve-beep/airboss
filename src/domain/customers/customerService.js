import { customerRepository } from '../../data/repositories/customerRepository.js';

export const customerService = {
  listCustomers() {
    return customerRepository.list();
  },

  getCustomer(id) {
    return customerRepository.getById(id);
  },

  createCustomer(payload) {
    if (!payload?.tailNumber) {
      throw new Error('Tail number is required');
    }
    return customerRepository.create(payload);
  },

  updateCustomer(id, patch) {
    return customerRepository.update(id, patch);
  },

  findByTailNumber(tailNumber) {
    const normalized = (tailNumber || '').trim().toUpperCase();
    return customerRepository
      .list()
      .find((customer) => (customer.tailNumber || '').trim().toUpperCase() === normalized) || null;
  },
};
