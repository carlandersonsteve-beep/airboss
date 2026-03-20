import { ORDER_STATUS } from '../../core/constants.js';

function isSameDay(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return a.toDateString() === b.toDateString();
}

export const orderSelectors = {
  all(orders) {
    return orders || [];
  },

  today(orders, now = new Date()) {
    return (orders || []).filter((order) => order.createdAt && isSameDay(order.createdAt, now));
  },

  activeRamp(orders, now = new Date()) {
    return this.today(orders, now).filter(
      (order) =>
        order.status === ORDER_STATUS.PENDING ||
        order.status === ORDER_STATUS.IN_PROGRESS
    );
  },

  readyForFrontDesk(orders) {
    return (orders || []).filter(
      (order) => order.status === ORDER_STATUS.READY_FOR_FRONT_DESK
    );
  },

  closed(orders) {
    return (orders || []).filter((order) => order.status === ORDER_STATUS.CLOSED);
  },

  thisWeek(orders, now = new Date()) {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return (orders || []).filter((order) => new Date(order.createdAt) >= weekAgo);
  },

  jetATotal(orders) {
    return (orders || []).reduce((sum, order) => {
      const fuelType = (order.fuelType || '').toUpperCase();
      const qty = Number(order.fuelQuantity || order.fuelActualGallons || 0);
      return fuelType === 'JET-A' ? sum + qty : sum;
    }, 0);
  },

  avgasTotal(orders) {
    return (orders || []).reduce((sum, order) => {
      const fuelType = (order.fuelType || '').toUpperCase();
      const qty = Number(order.fuelQuantity || order.fuelActualGallons || 0);
      return fuelType === '100LL' ? sum + qty : sum;
    }, 0);
  },
};
