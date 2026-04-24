window.AirBossComponents = window.AirBossComponents || {};

window.AirBossComponents.ServicePanel = function ServicePanel({
  order,
  customer,
  messages,
  addMessage,
  addTicket,
  getUnreadOrderThreadCount,
  markOrderThreadRead,
  markOrderReadyForFrontDesk,
  onBack,
}) {
  const { useState } = React;
  const SERVICE_LABELS = {
    lav: 'Lavatory',
    crew_car: 'Crew Car',
    tiedown: 'Tie-Down',
    gpu: 'GPU',
    catering: 'Catering',
    hangar: 'Hangar',
    overnight: 'Overnight',
    top_off: 'Top Off',
  };

  const formatLabel = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return SERVICE_LABELS[raw] || raw
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };
  const deps = window.AirBossComponentBridge.requireDeps(
    'ServicePanel',
    window.AirBossDeps || {},
    ['syncAdapters', 'OrderMessageThread', 'CompletionModal']
  );
  const {
    syncAdapters,
    OrderMessageThread,
    CompletionModal,
  } = deps;

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const unreadCount = getUnreadOrderThreadCount ? getUnreadOrderThreadCount(order.id) : 0;
  const requestedFuel = order.fuelRequestedGallons ?? order.fuelQuantity ?? 0;
  const departureDateValue = order.departureDate ? new Date(order.departureDate) : null;
  const hasValidDepartureDate = departureDateValue && !Number.isNaN(departureDateValue.getTime());

  const handleSaveAndNotify = async (actualFuel, completionNotes, meterData = {}) => {
    const parsedActualFuel = actualFuel === '' || actualFuel === null || actualFuel === undefined
      ? (order.fuelActualGallons ?? order.fuelQuantity ?? order.fuelRequestedGallons ?? null)
      : parseFloat(actualFuel);

    const finalActualFuel = Number.isNaN(parsedActualFuel) ? null : parsedActualFuel;

    const updatedOrder = {
      ...order,
      fuelActualGallons: finalActualFuel,
      fuelMeterStart: meterData.meterStart ?? order.fuelMeterStart ?? null,
      fuelMeterEnd: meterData.meterEnd ?? order.fuelMeterEnd ?? null,
      services: order.services || [],
      completionNotes: completionNotes || '',
      completedAt: new Date().toISOString(),
      status: 'ready',
    };

    setShowCompleteModal(false);

    try {
      syncAdapters.syncToSheets('updateOrder', { order: updatedOrder });
    } catch (error) {
      console.log('Order sync bridge failed during completion', error.message);
    }

    try {
      await markOrderReadyForFrontDesk(order.id, {
        status: 'ready',
        completedAt: updatedOrder.completedAt,
        fuelActualGallons: finalActualFuel,
        fuelMeterStart: meterData.meterStart ?? order.fuelMeterStart ?? null,
        fuelMeterEnd: meterData.meterEnd ?? order.fuelMeterEnd ?? null,
        completionNotes: completionNotes || '',
      });
      onBack && onBack();
    } catch (error) {
      console.log('Complete service transition failed', error.message);
    }
  };

  const createAlert = (type, message) => {
    addTicket({
      type,
      orderId: order.id,
      customerId: order.customerId,
      tailNumber: customer?.tailNumber || order.tailNumber,
      aircraftType: customer?.aircraftType || order.aircraftType,
      message,
      submittedBy: 'Ramp',
      notes: '',
    });
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-orange-200 overflow-hidden">
        <div className="mustang-red text-white px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] opacity-80 font-bold">Active Service</div>
              <h3 className="text-3xl font-black mt-2">{customer?.tailNumber || order.tailNumber || 'Unknown Tail'}</h3>
              <div className="text-lg opacity-95 mt-1">{customer?.aircraftType || order.aircraftType || 'Unknown Type'}</div>
              <div className="text-sm opacity-90 mt-1">{customer?.pilotName || customer?.ownerName || order.customerName || 'Unknown customer'}</div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {unreadCount > 0 && (
                <div className="bg-white text-red-600 px-3 py-1 rounded-full text-sm font-black">
                  {unreadCount} new desk repl{unreadCount === 1 ? 'y' : 'ies'}
                </div>
              )}
              <button
                onClick={onBack}
                className="bg-white/15 hover:bg-white/25 text-white border border-white/30 px-4 py-2 rounded-lg text-sm font-bold transition"
              >
                ← Back to Ramp Queue
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className={`rounded-xl border-2 p-4 ${order.fuelType ? ((order.fuelType === 'JET-A' || order.fuelType === 'Jet-A') ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50') : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-xs uppercase tracking-wide font-bold text-gray-500">Fuel</div>
              {order.fuelType ? (
                <>
                  <div className="text-3xl font-black mt-2 text-gray-900">{requestedFuel} gal</div>
                  <div className={`text-lg font-bold mt-1 ${(order.fuelType === 'JET-A' || order.fuelType === 'Jet-A') ? 'text-amber-900' : 'text-blue-900'}`}>{order.fuelType}</div>
                  <div className={`text-sm mt-2 ${(order.fuelType === 'JET-A' || order.fuelType === 'Jet-A') ? 'text-amber-900' : 'text-blue-900'}`}>
                    Actual gallons are captured when Ramp completes and hands this aircraft to Front Desk.
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600 mt-2">No fuel order on this aircraft.</div>
              )}
            </div>

            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide font-black text-indigo-700">Requested Services</div>
              {(order.services && order.services.length > 0) ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {order.services.map(service => (
                    <span key={service} className="bg-white border border-indigo-300 text-indigo-900 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm">
                      {formatLabel(service)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600 mt-2">No extra services requested.</div>
              )}
              {order.hangarOvernight && (
                <div className="text-sm text-gray-700 mt-3"><span className="font-semibold">Parking:</span> {order.hangarOvernight === 'yes' ? 'Hangar overnight requested' : 'Outside parking requested'}</div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide font-bold text-gray-500">Departure</div>
              <div className="text-sm text-gray-700 mt-2">
                {order.departureDate ? (
                  hasValidDepartureDate ? (
                    <>
                      <div className="font-semibold text-gray-900">
                        {departureDateValue.toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric'
                        })}
                      </div>
                      <div className="mt-1">
                        {order.departureTime ? (() => {
                          const [h, m] = order.departureTime.split(':');
                          const ampm = h >= 12 ? 'PM' : 'AM';
                          return `Scheduled out at ${((h % 12) || 12)}:${m} ${ampm}`;
                        })() : 'Departure time not set'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-gray-900">{String(order.departureDate)}</div>
                      <div className="mt-1">{order.departureTime || 'Departure time not set'}</div>
                    </>
                  )
                ) : 'No departure set'}
              </div>
              {order.purpose && (
                <div className="text-sm text-gray-700 mt-3"><span className="font-semibold">Purpose:</span> {formatLabel(order.purpose)}</div>
              )}
            </div>
          </div>

          {order.notes && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs uppercase tracking-wide font-bold text-blue-700 mb-2">Arrival / Service Notes</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{order.notes}</div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] gap-5">
            <OrderMessageThread
              key={`service-thread-${order.id}-${messages ? messages.filter(message => message.orderId === order.id).length : 0}`}
              order={order}
              customer={customer}
              messages={messages}
              addMessage={addMessage}
              senderRole="RAMP"
              title="Ramp ↔ Front Desk Thread"
              emptyLabel="No messages on this aircraft yet. Use this instead of radio chatter when something changes."
              unreadCount={unreadCount}
              onOpen={markOrderThreadRead}
            />

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-bold text-gray-900 mb-3">Quick Alerts</div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => createAlert('customer_waiting', 'Customer waiting at aircraft / needs front desk attention')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg text-sm font-bold transition"
                >
                  ⚠️ Customer Waiting
                </button>
                <button
                  onClick={() => createAlert('crew_car', 'Crew car requested for this aircraft')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition"
                >
                  🚗 Crew Car
                </button>
                <button
                  onClick={() => createAlert('desk_help', 'Ramp needs front desk assistance on this aircraft')}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition"
                >
                  📣 Need Desk Help
                </button>
              </div>
              <div className="mt-4 rounded-lg bg-white border border-gray-200 p-3 text-sm text-gray-700">
                This aircraft stays in focused service mode until Ramp completes service. Then it moves into Front Desk’s ready-to-bill queue.
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="text-sm text-gray-600">
            Focused service mode is active. The rest of the ramp queue stays visible below as secondary context.
          </div>
          <button
            onClick={() => setShowCompleteModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-black transition shadow-lg"
          >
            ✅ Complete / Send to Front Desk
          </button>
        </div>
      </div>

      {showCompleteModal && (
        <CompletionModal
          order={order}
          customer={customer}
          onClose={() => setShowCompleteModal(false)}
          onConfirm={handleSaveAndNotify}
        />
      )}
    </>
  );
};
