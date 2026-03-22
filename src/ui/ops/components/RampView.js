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
  const deps = window.AirBossComponentBridge.requireDeps(
    'RampView',
    window.AirBossDeps || {},
    ['getTodayOrders', 'getActiveRampOrders', 'getClosedOrders', 'getReadyForFrontDeskOrders', 'OrderCard']
  );
  const {
    getTodayOrders,
    getActiveRampOrders,
    getClosedOrders,
    getReadyForFrontDeskOrders,
    OrderCard,
  } = deps;

  const todayOrders = getTodayOrders(orders);
  const activeOrders = getActiveRampOrders(orders);
  const readyForFrontDeskOrders = getReadyForFrontDeskOrders(orders);
  const unreadThreadOrders = activeOrders.filter(order => (getUnreadOrderThreadCount ? getUnreadOrderThreadCount(order.id) : 0) > 0).length;

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

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="text-xl font-bold text-gray-800">Active Orders</h3>
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
        {activeOrders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active ramp orders. If a kiosk check-in just completed, it may still take a second or two to appear here — and once ramp completes it moves to Front Desk.</p>
        ) : (
          <div className="space-y-3">
            {activeOrders.map(order => {
              const customer = customers.find(c => c.id === order.customerId);
              return (
                <OrderCard
                  key={order.id}
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
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
