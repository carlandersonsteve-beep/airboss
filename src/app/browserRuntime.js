(function () {
  const ORDER_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    READY_FOR_FRONT_DESK: 'ready_for_front_desk',
    CLOSED: 'closed',
  };

  const LEGACY_ORDER_STATUS_MAP = {
    new: ORDER_STATUS.PENDING,
    pending: ORDER_STATUS.PENDING,
    'in-progress': ORDER_STATUS.IN_PROGRESS,
    in_progress: ORDER_STATUS.IN_PROGRESS,
    ready: ORDER_STATUS.READY_FOR_FRONT_DESK,
    ready_for_front_desk: ORDER_STATUS.READY_FOR_FRONT_DESK,
    completed: ORDER_STATUS.READY_FOR_FRONT_DESK,
    finalized: ORDER_STATUS.CLOSED,
    closed: ORDER_STATUS.CLOSED,
  };

  function normalizeOrderStatus(status) {
    return LEGACY_ORDER_STATUS_MAP[status] || status || ORDER_STATUS.PENDING;
  }

  function isSameDay(dateA, dateB) {
    return new Date(dateA).toDateString() === new Date(dateB).toDateString();
  }

  const orderSelectors = {
    all(orders) {
      return orders || [];
    },

    today(orders, now = new Date()) {
      return (orders || []).filter((order) => order.createdAt && isSameDay(order.createdAt, now));
    },

    activeRamp(orders, now = new Date()) {
      return this.today(orders, now).filter((order) => {
        const status = normalizeOrderStatus(order.status);
        return status === ORDER_STATUS.PENDING || status === ORDER_STATUS.IN_PROGRESS;
      });
    },

    readyForFrontDesk(orders) {
      return (orders || []).filter((order) => normalizeOrderStatus(order.status) === ORDER_STATUS.READY_FOR_FRONT_DESK);
    },

    closed(orders) {
      return (orders || []).filter((order) => normalizeOrderStatus(order.status) === ORDER_STATUS.CLOSED);
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

  function canTransitionOrder(currentStatus, nextStatus) {
    const current = normalizeOrderStatus(currentStatus);
    const next = normalizeOrderStatus(nextStatus);

    const allowed = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.IN_PROGRESS],
      [ORDER_STATUS.IN_PROGRESS]: [ORDER_STATUS.READY_FOR_FRONT_DESK],
      [ORDER_STATUS.READY_FOR_FRONT_DESK]: [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.CLOSED],
      [ORDER_STATUS.CLOSED]: [ORDER_STATUS.READY_FOR_FRONT_DESK],
    };

    return (allowed[current] || []).includes(next);
  }

  function getRecallStatus(status) {
    const normalized = normalizeOrderStatus(status);
    if (normalized === ORDER_STATUS.READY_FOR_FRONT_DESK) return ORDER_STATUS.IN_PROGRESS;
    if (normalized === ORDER_STATUS.CLOSED) return ORDER_STATUS.READY_FOR_FRONT_DESK;
    return normalized;
  }

  const orderService = {
    createOrderPayload(payload) {
      return {
        ...payload,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: payload.status || ORDER_STATUS.PENDING,
      };
    },

    transition(order, nextStatus, patch = {}) {
      if (!order) throw new Error('Order not found');
      return {
        ...order,
        status: nextStatus,
        statusUpdatedAt: new Date().toISOString(),
        ...patch,
      };
    },

    startService(order) {
      if (!order) throw new Error('Order not found');
      if (!canTransitionOrder(order.status, ORDER_STATUS.IN_PROGRESS)) {
        throw new Error(`Cannot start service from status: ${order.status}`);
      }
      return this.transition(order, 'in-progress');
    },

    completeService(order, patch = {}) {
      if (!order) throw new Error('Order not found');
      if (!canTransitionOrder(order.status, ORDER_STATUS.READY_FOR_FRONT_DESK)) {
        throw new Error(`Cannot complete service from status: ${order.status}`);
      }
      return this.transition(order, 'ready', {
        ...patch,
        completedAt: new Date().toISOString(),
      });
    },

    closeOrder(order) {
      if (!order) throw new Error('Order not found');
      if (!canTransitionOrder(order.status, ORDER_STATUS.CLOSED)) {
        throw new Error(`Cannot close order from status: ${order.status}`);
      }
      return this.transition(order, 'finalized');
    },

    recallOrder(order) {
      if (!order) throw new Error('Order not found');
      const nextStatus = getRecallStatus(order.status);
      const legacyNext = nextStatus === ORDER_STATUS.IN_PROGRESS
        ? 'in-progress'
        : nextStatus === ORDER_STATUS.READY_FOR_FRONT_DESK
          ? 'ready'
          : nextStatus === ORDER_STATUS.CLOSED
            ? 'finalized'
            : 'pending';
      return this.transition(order, legacyNext);
    },
  };

  const customerService = {
    createCustomerPayload(payload) {
      if (!payload?.tailNumber) throw new Error('Tail number is required');
      return {
        ...payload,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
    },

    updateCustomer(customer, patch = {}) {
      return { ...customer, ...patch };
    },
  };

  const ticketService = {
    createTicketPayload(payload) {
      return {
        ...payload,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
    },

    resolveTicket(ticket) {
      return {
        ...ticket,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
      };
    },
  };

  const messageService = {
    createMessagePayload({ text, senderRole, orderId = null, tailNumber = null }) {
      if (!text?.trim()) throw new Error('Message text is required');
      return {
        id: Date.now().toString(),
        text: text.trim(),
        sender: senderRole,
        orderId,
        tailNumber,
        createdAt: new Date().toISOString(),
      };
    },

    unreadCount(messages, lastReadChat) {
      return (messages || []).filter((message) => {
        return new Date(message.createdAt).getTime() > (lastReadChat || 0);
      }).length;
    },
  };

  window.AirBossRuntime = {
    ORDER_STATUS,
    normalizeOrderStatus,
    orderSelectors,
    orderService,
    customerService,
    ticketService,
    messageService,
  };
})();
