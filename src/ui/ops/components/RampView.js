window.AirBossComponents = window.AirBossComponents || {};

window.AirBossComponents.RampView = function RampView({
  customers,
  orders,
  tickets,
  onNewOrder,
  onNewCustomer,
  onQuickFuel,
  onViewOffice,
  updateOrderStatus,
  addTicket,
  messages,
  addMessage,
  getUnreadOrderThreadCount,
  markOrderThreadRead,
  startOrderService,
  markOrderReadyForFrontDesk,
}) {
  const { useEffect, useMemo, useRef, useState } = React;
  const deps = window.AirBossComponentBridge.requireDeps(
    'RampView',
    window.AirBossDeps || {},
    ['getTodayOrders', 'getActiveRampOrders', 'getClosedOrders', 'getReadyForFrontDeskOrders', 'OrderCard', 'ServicePanel']
  );
  const {
    getTodayOrders,
    getActiveRampOrders,
    getClosedOrders,
    getReadyForFrontDeskOrders,
    OrderCard,
    ServicePanel,
  } = deps;

  const todayOrders = getTodayOrders(orders);
  const activeOrders = getActiveRampOrders(orders);
  const readyForFrontDeskOrders = getReadyForFrontDeskOrders(orders);
  const unreadThreadOrders = activeOrders.filter(order => (getUnreadOrderThreadCount ? getUnreadOrderThreadCount(order.id) : 0) > 0).length;
  const inProgressOrders = useMemo(
    () => activeOrders.filter(order => String(order.status).replace('-', '_') === 'in_progress'),
    [activeOrders]
  );
  const [activeServiceOrderId, setActiveServiceOrderId] = useState(inProgressOrders[0]?.id || null);
  const [isServicePanelOpen, setIsServicePanelOpen] = useState(inProgressOrders.length > 0);
  const servicePanelRef = useRef(null);

  useEffect(() => {
    const selectedOrderStillExists = activeOrders.some(order => order.id === activeServiceOrderId);

    if (!selectedOrderStillExists) {
      if (inProgressOrders.length > 0) {
        setActiveServiceOrderId(inProgressOrders[0].id);
        setIsServicePanelOpen(true);
      } else {
        setActiveServiceOrderId(null);
        setIsServicePanelOpen(false);
      }
      return;
    }

    if (!activeServiceOrderId && inProgressOrders.length > 0) {
      setActiveServiceOrderId(inProgressOrders[0].id);
      setIsServicePanelOpen(true);
    }
  }, [activeOrders, activeServiceOrderId, inProgressOrders]);

  const activeServiceOrder = activeOrders.find(order => order.id === activeServiceOrderId) || null;
  const activeServiceCustomer = activeServiceOrder
    ? customers.find(customer => customer.id === activeServiceOrder.customerId)
    : null;
  const activeServiceIsInProgress = Boolean(activeServiceOrder && String(activeServiceOrder.status).replace('-', '_') === 'in_progress');
  const hasFocusedServiceMode = Boolean(activeServiceOrder && activeServiceIsInProgress && isServicePanelOpen);

  const scrollToServicePanel = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (servicePanelRef.current) {
          servicePanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.scrollBy(0, -12);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  };

  const openServicePanel = (orderId) => {
    setActiveServiceOrderId(orderId);
    setIsServicePanelOpen(true);
    scrollToServicePanel();
  };

  const closeServicePanel = () => {
    setIsServicePanelOpen(false);
  };

  useEffect(() => {
    if (hasFocusedServiceMode) {
      scrollToServicePanel();
    }
  }, [hasFocusedServiceMode, activeServiceOrderId]);

  const queueOrders = hasFocusedServiceMode
    ? activeOrders.filter(order => order.id !== activeServiceOrderId)
    : activeOrders;

  return (
    <div>
      <div className="lg:hidden mb-4">
        <button
          onClick={onQuickFuel}
          className="w-full mustang-red mustang-red-hover text-white px-6 py-4 rounded-lg font-bold text-lg shadow-lg transition flex items-center justify-center gap-2"
        >
          ⚡ Quick Fuel Entry
        </button>
      </div>

      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-3xl font-bold text-gray-800">Ramp Operations</h2>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={onQuickFuel}
            className="hidden lg:block mustang-red mustang-red-hover text-white px-6 py-3 rounded-lg font-medium shadow-lg transition"
          >
            ⚡ Quick Fuel Entry
          </button>
          <button
            onClick={onNewCustomer}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition"
          >
            + New Customer
          </button>
          <button
            onClick={onNewOrder}
            className="mustang-red mustang-red-hover text-white px-6 py-3 rounded-lg font-medium shadow-lg transition"
          >
            + Aircraft Arrival
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card p-6">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Orders Today</div>
          <div className="text-3xl font-bold mustang-red-text mt-2">{activeOrders.length}</div>
        </div>
        <div className="stat-card p-6">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Customers</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{customers.length}</div>
        </div>
        <div className="stat-card p-6">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Completed Today</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">{getClosedOrders(todayOrders).length}</div>
        </div>
        <div className="stat-card p-6 border-l-4 border-red-500">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Unread Desk Replies</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{unreadThreadOrders}</div>
        </div>
      </div>

      {isServicePanelOpen && activeServiceOrder && !activeServiceIsInProgress && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          Service is starting for this aircraft… loading focused service panel.
        </div>
      )}

      {hasFocusedServiceMode && (
        <div ref={servicePanelRef} className="mb-6">
          <ServicePanel
            order={activeServiceOrder}
            customer={activeServiceCustomer}
            messages={messages}
            addMessage={addMessage}
            addTicket={addTicket}
            getUnreadOrderThreadCount={getUnreadOrderThreadCount}
            markOrderThreadRead={markOrderThreadRead}
            markOrderReadyForFrontDesk={markOrderReadyForFrontDesk}
            onBack={closeServicePanel}
          />
        </div>
      )}

      <div className={`bg-white rounded-lg shadow-lg p-6 transition ${hasFocusedServiceMode ? 'opacity-80' : ''}`}>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Ramp Queue</h3>
            <p className="text-sm text-gray-500 mt-1">
              {hasFocusedServiceMode
                ? 'Focused service mode is active. Queue stays visible as background context.'
                : 'Pending arrivals and active aircraft waiting on ramp work.'}
            </p>
          </div>
          {readyForFrontDeskOrders.length > 0 && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 text-orange-900 px-4 py-2 rounded-lg">
              <span className="font-semibold">{readyForFrontDeskOrders.length} aircraft waiting on Front Desk</span>
              {onViewOffice && (
                <button
                  onClick={onViewOffice}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm font-bold transition"
                >
                  Open Front Desk
                </button>
              )}
            </div>
          )}
        </div>

        {queueOrders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {hasFocusedServiceMode
              ? 'No other aircraft are waiting in the ramp queue while this service is active.'
              : 'No active ramp orders. If a kiosk check-in just completed, it may still take a second or two to appear here — and once ramp completes it moves to Front Desk.'}
          </p>
        ) : (
          <div className="space-y-3">
            {queueOrders.map(order => {
              const customer = customers.find(c => c.id === order.customerId);
              return (
                <div key={order.id} className={hasFocusedServiceMode ? 'opacity-70' : ''}>
                  <OrderCard
                    order={order}
                    customer={customer}
                    updateOrderStatus={updateOrderStatus}
                    addTicket={addTicket}
                    messages={messages}
                    addMessage={addMessage}
                    getUnreadOrderThreadCount={getUnreadOrderThreadCount}
                    markOrderThreadRead={markOrderThreadRead}
                    startOrderService={startOrderService}
                    markOrderReadyForFrontDesk={markOrderReadyForFrontDesk}
                    onServiceStarted={openServicePanel}
                    onOpenServicePanel={openServicePanel}
                    compact={hasFocusedServiceMode}
                    suppressActions={hasFocusedServiceMode}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};