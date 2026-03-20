window.AirBossComponents = window.AirBossComponents || {};

window.AirBossComponents.OfficeView = function OfficeView({
  orders,
  customers,
  tickets,
  updateOrderStatus,
  recallOrder,
  resolveTicket,
  deleteTicket,
  generateCompletionEmail,
  messages,
  addMessage,
  closeOrder,
}) {
  const { useState } = React;
  const deps = window.AirBossComponentBridge.requireDeps(
    'OfficeView',
    window.AirBossDeps || {},
    ['isClosedStatus', 'isReadyStatus', 'getReadyForFrontDeskOrders', 'getClosedOrders', 'getTodayOrders', 'getWeekOrders', 'getFuelTotal']
  );
  const {
    isClosedStatus,
    isReadyStatus,
    getReadyForFrontDeskOrders,
    getClosedOrders,
    getTodayOrders,
    getWeekOrders,
    getFuelTotal,
  } = deps;

  const [filter, setFilter] = useState('today');
  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const readyToBillOrders = getReadyForFrontDeskOrders(orders);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const preDepartureOrders = orders.filter(o =>
    o.departureDate === tomorrowStr &&
    !isClosedStatus(o.status) &&
    !o.preDepartureSent
  );

  const generatePreDepartureEmail = (order, customer) => {
    const depTime = order.departureTime
      ? (() => { const [h,m] = order.departureTime.split(':'); const ampm = h >= 12 ? 'PM' : 'AM'; return ((h % 12) || 12) + ':' + m + ' ' + ampm; })()
      : 'your scheduled time';

    const subject = `See You Tomorrow - ${customer?.tailNumber} - Mustang Aviation`;
    const body = `Dear ${customer?.pilotName || customer?.ownerName || 'Valued Customer'},

We wanted to touch base ahead of your departure tomorrow at ${depTime}.

Your aircraft ${customer?.tailNumber} (${customer?.aircraftType}) is all set. Is there anything you need before you head out?

- Top-off fuel before departure
- Crew car
- Any additional services

Just reply to this email or give us a call and we will have everything ready for you.

info@mustangaviation.aero
www.mustangaviation.aero

We look forward to seeing you tomorrow.

Mustang Aviation
Pierre Regional Airport (KPIR)
Phone: 605.224.9000  |  Toll Free: 1.800.456.1712

"Where the Midwest Meets the Wild West"`;

    const mailtoLink = `mailto:${customer?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
    updateOrderStatus(order.id, order.status, { preDepartureSent: true });
  };

  const filteredOrders = (() => {
    if (filter === 'archive') return getClosedOrders(orders);
    if (filter === 'today') return getTodayOrders(orders);
    if (filter === 'week') return getWeekOrders(orders);
    return orders;
  })();

  const totalJetA = getFuelTotal(filteredOrders, 'JET-A');
  const total100LL = getFuelTotal(filteredOrders, '100LL');

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Front Desk</h2>
        <p className="text-gray-600">Ready-to-bill aircraft and customer billing</p>
      </div>

      {preDepartureOrders.length > 0 && (
        <div className="bg-blue-600 text-white rounded-lg p-5 mb-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">✈️</span>
            <div>
              <h3 className="text-xl font-bold">Pre-Departure Emails Ready ({preDepartureOrders.length})</h3>
              <p className="text-sm opacity-90">These aircraft are departing tomorrow — send a courtesy check-in</p>
            </div>
          </div>
          <div className="space-y-2 mt-3">
            {preDepartureOrders.map(order => {
              const customer = customers.find(c => c.id === order.customerId);
              const depTime = order.departureTime
                ? (() => { const [h,m] = order.departureTime.split(':'); const ampm = h >= 12 ? 'PM' : 'AM'; return ((h % 12) || 12) + ':' + m + ' ' + ampm; })()
                : 'TBD';
              return (
                <div key={order.id} className="bg-white/15 rounded-lg px-4 py-3 flex justify-between items-center">
                  <div>
                    <span className="font-bold">{customer?.tailNumber}</span>
                    <span className="opacity-90 ml-2">{customer?.pilotName || customer?.ownerName}</span>
                    <span className="text-sm opacity-75 ml-2">— departs tomorrow at {depTime}</span>
                    {!customer?.email && <span className="ml-2 text-yellow-300 text-xs font-bold">⚠️ No email on file</span>}
                  </div>
                  <button
                    onClick={() => generatePreDepartureEmail(order, customer)}
                    disabled={!customer?.email}
                    className={`px-4 py-2 rounded-lg font-bold transition ${customer?.email ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
                  >
                    Send Email
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card p-6 border-l-4 border-orange-500">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Ready to Bill</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{readyToBillOrders.length}</div>
        </div>
        <div className="stat-card p-6 border-l-4 border-green-500">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Jet-A ({filter})</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{totalJetA} gal</div>
        </div>
        <div className="stat-card p-6 border-l-4 border-blue-500">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">100LL ({filter})</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{total100LL} gal</div>
        </div>
        <div className="stat-card p-6 border-l-4 border-yellow-500">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Pending Tickets</div>
          <div className="text-3xl font-bold text-yellow-600 mt-2">{pendingTickets.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <h3 className="text-xl font-bold text-gray-800">Ready to Bill</h3>
          <div className="flex gap-2 flex-wrap">
            {['today','week','all','archive'].map(key => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg font-medium transition ${filter === key ? 'mustang-red text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {pendingTickets.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
            <h4 className="font-bold text-yellow-800 mb-3">⚠️ Ramp Notifications</h4>
            <div className="space-y-2">
              {pendingTickets.map(ticket => (
                <div key={ticket.id} className="bg-white p-3 rounded flex justify-between items-center">
                  <div>
                    <div className="font-medium">{ticket.tailNumber || ticket.type}</div>
                    <div className="text-sm text-gray-600">{ticket.message || ticket.notes || 'Ramp request'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => resolveTicket(ticket.id)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">Resolve</button>
                    <button onClick={() => deleteTicket(ticket.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredOrders.map(order => {
            const customer = customers.find(c => c.id === order.customerId);
            return (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-lg mustang-red-text">{customer?.tailNumber || order.tailNumber || 'Unknown'}</div>
                    <div className="text-gray-600">{customer?.aircraftType || order.aircraft || 'Unknown Type'}</div>
                    <div className="text-sm text-gray-500">{customer?.pilotName || customer?.ownerName || order.customerName}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isClosedStatus(order.status) ? 'bg-gray-100 text-gray-800' :
                    isReadyStatus(order.status) ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {String(order.status).replace(/[-_]/g, ' ').toUpperCase()}
                  </span>
                </div>

                {order.completionNotes && (
                  <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded mb-3">
                    <span className="font-medium">Ramp Notes:</span> {order.completionNotes}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {isReadyStatus(order.status) && (
                    <>
                      <button onClick={() => recallOrder(order.id)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-medium">↩ Recall</button>
                      <button onClick={() => closeOrder(order.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium">Finalize</button>
                    </>
                  )}
                  {isClosedStatus(order.status) && (
                    <button onClick={() => recallOrder(order.id)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-medium">↩ Reopen</button>
                  )}
                  {customer?.email && (
                    <button onClick={() => generateCompletionEmail(order, customer)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">✉ Email Customer</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
