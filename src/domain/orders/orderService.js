import { ORDER_STATUS } from '../../core/constants.js';
import { canTransitionOrder, getRecallStatus } from '../../core/workflow.js';
import { orderRepository } from '../../data/repositories/orderRepository.js';

export const orderService = {
  listOrders() {
    return orderRepository.list();
  },

  createOrder(payload) {
    return orderRepository.create(payload);
  },

  startService(orderId) {
    const order = orderRepository.getById(orderId);
    if (!order) throw new Error('Order not found');
    if (!canTransitionOrder(order.status, ORDER_STATUS.IN_PROGRESS)) {
      throw new Error(`Cannot start service from status: ${order.status}`);
    }
    return orderRepository.update(orderId, { status: ORDER_STATUS.IN_PROGRESS });
  },

  completeService(orderId, patch = {}) {
    const order = orderRepository.getById(orderId);
    if (!order) throw new Error('Order not found');
    if (!canTransitionOrder(order.status, ORDER_STATUS.READY_FOR_FRONT_DESK)) {
      throw new Error(`Cannot complete service from status: ${order.status}`);
    }
    return orderRepository.update(orderId, {
      ...patch,
      status: ORDER_STATUS.READY_FOR_FRONT_DESK,
      completedAt: new Date().toISOString(),
    });
  },

  closeOrder(orderId) {
    const order = orderRepository.getById(orderId);
    if (!order) throw new Error('Order not found');
    if (!canTransitionOrder(order.status, ORDER_STATUS.CLOSED)) {
      throw new Error(`Cannot close order from status: ${order.status}`);
    }
    return orderRepository.update(orderId, { status: ORDER_STATUS.CLOSED });
  },

  recallOrder(orderId) {
    const order = orderRepository.getById(orderId);
    if (!order) throw new Error('Order not found');
    const nextStatus = getRecallStatus(order.status);
    return orderRepository.update(orderId, { status: nextStatus });
  },
};
