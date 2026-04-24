window.AirBossComponents = window.AirBossComponents || {};

window.AirBossComponents.OrderCard = function OrderCard({
  order,
  customer,
  updateOrderStatus,
  addTicket,
  messages,
  addMessage,
  getUnreadOrderThreadCount,
  markOrderThreadRead,
  startOrderService,
  markOrderReadyForFrontDesk,
  onServiceStarted,
  onOpenServicePanel,
  compact = false,
  suppressActions = false,
}) {
  const { useState } = React;
  const deps = window.AirBossComponentBridge.requireDeps(
    'OrderCard',
    window.AirBossDeps || {},
    ['syncAdapters', 'isPendingStatus', 'isInProgressStatus', 'OrderMessageThread', 'CompletionModal']
  );
  const {
    syncAdapters,
    isPendingStatus,
    isInProgressStatus,
    OrderMessageThread,
    CompletionModal,
  } = deps;

  const [editedServices, setEditedServices] = useState(order.services || []);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showFuelVerify, setShowFuelVerify] = useState(false);
  const [fuelTypeInput, setFuelTypeInput] = useState('');
  const [fuelVerifyError, setFuelVerifyError] = useState(false);

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

  const formatServiceLabel = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return SERVICE_LABELS[raw] || raw
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'in-progress': 'bg-blue-100 text-blue-800 border-blue-300',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
    ready: 'bg-orange-100 text-orange-800 border-orange-300',
    ready_for_front_desk: 'bg-orange-100 text-orange-800 border-orange-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    finalized: 'bg-gray-100 text-gray-800 border-gray-300',
    closed: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  const orderThreadMessages = (messages || []).filter(message => message.orderId === order.id);
  const latestOrderMessage = orderThreadMessages.length > 0
    ? orderThreadMessages.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).pop()
    : null;
  const unreadCount = getUnreadOrderThreadCount ? getUnreadOrderThreadCount(order.id) : 0;

  const departureDateValue = order.departureDate ? new Date(order.departureDate) : null;
  const hasValidDepartureDate = departureDateValue && !Number.isNaN(departureDateValue.getTime());

  const handleSaveAndNotify = (actualFuel, completionNotes, meterData = {}) => {
    const parsedActualFuel = actualFuel === '' || actualFuel === null || actualFuel === undefined
      ? (order.fuelActualGallons ?? order.fuelQuantity ?? order.fuelRequestedGallons ?? null)
      : parseFloat(actualFuel);

    const finalActualFuel = Number.isNaN(parsedActualFuel) ? null : parsedActualFuel;

    const updatedOrder = {
      ...order,
      fuelActualGallons: finalActualFuel,
      fuelMeterStart: meterData.meterStart ?? order.fuelMeterStart ?? null,
      fuelMeterEnd: meterData.meterEnd ?? order.fuelMeterEnd ?? null,
      services: editedServices,
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
      markOrderReadyForFrontDesk(order.id, {
        status: 'ready',
        completedAt: updatedOrder.completedAt,
        fuelActualGallons: finalActualFuel,
        fuelMeterStart: meterData.meterStart ?? order.fuelMeterStart ?? null,
        fuelMeterEnd: meterData.meterEnd ?? order.fuelMeterEnd ?? null,
        completionNotes: completionNotes || '',
      });
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

  const startServiceFlow = () => {
    startOrderService(order.id);
    onServiceStarted && onServiceStarted(order.id);
  };

  return (
    <div className={`border rounded-xl border-gray-400 transition ${compact ? 'p-3 bg-white/95 shadow-sm' : 'p-4 hover:shadow-lg bg-white shadow-md'}`}>
      <div className="flex justify-between items-start mb-3 gap-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-3">
        <div>
          <div className="font-black text-2xl text-black leading-none">{customer?.tailNumber || 'Unknown'}</div>
          <div className="text-gray-600">{customer?.aircraftType || 'Unknown Type'}</div>
          <div className="text-sm text-gray-500">{customer?.pilotName || customer?.ownerName}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[order.status]}`}>
            {String(order.status).replace(/[-_]/g, ' ').toUpperCase()}
          </span>
          <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="mb-3">
        {order.fuelType && (
          <div className={`border-2 p-3 rounded-lg ${order.fuelType === 'JET-A' || order.fuelType === 'Jet-A' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className={`font-semibold mb-2 ${order.fuelType === 'JET-A' || order.fuelType === 'Jet-A' ? 'text-amber-900' : 'text-blue-900'}`}>⛽ Fuel Order</div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm text-gray-600">Requested Fuel</div>
                <div className="text-2xl font-bold text-gray-900">{order.fuelQuantity || order.fuelRequestedGallons || 0} gal</div>
              </div>
              <div className="text-2xl font-bold text-gray-700">{order.fuelType}</div>
            </div>
            {!compact && (
              <div className={`mt-2 text-sm ${(order.fuelType === 'JET-A' || order.fuelType === 'Jet-A') ? 'text-amber-900' : 'text-blue-900'}`}>
                Actual gallons pumped are entered when Ramp completes the order and hands it to Front Desk.
              </div>
            )}
          </div>
        )}
        {order.hangarOvernight && (
          <div className="bg-gray-50 p-2 rounded mt-2">
            <span className="font-medium">Parking:</span> {order.hangarOvernight === 'yes' ? 'Hangar overnight requested' : 'Outside parking requested'}
          </div>
        )}
        {order.services && order.services.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg mt-2">
            <div className="text-xs uppercase tracking-wide font-black text-indigo-700 mb-2">Requested Services</div>
            <div className="flex flex-wrap gap-2">
              {order.services.map(service => (
                <span key={service} className="bg-white border border-indigo-300 text-indigo-900 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                  {formatServiceLabel(service)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {order.notes && !compact && (
        <div className="text-sm text-gray-600 mb-3 bg-blue-50 p-2 rounded">
          <span className="font-medium">Notes:</span> {order.notes}
        </div>
      )}
      {order.departureDate && !compact && (
        <div className="text-sm text-gray-700 mb-3 bg-indigo-50 border-2 border-indigo-200 p-3 rounded-lg shadow-sm">
          <span className="font-bold text-indigo-900">✈️ Departure Priority:</span>{' '}
          {hasValidDepartureDate
            ? departureDateValue.toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
              })
            : String(order.departureDate)}
          {order.departureTime && ` at ${(() => {
            const [h, m] = order.departureTime.split(':');
            const ampm = h >= 12 ? 'PM' : 'AM';
            return ((h % 12) || 12) + ':' + m + ' ' + ampm;
          })()}`}
        </div>
      )}

      {latestOrderMessage && !isInProgressStatus(order.status) && (
        <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="text-xs uppercase tracking-wide text-gray-500 font-bold">Latest Order Message</div>
            {unreadCount > 0 && (
              <div className="text-xs font-black px-2 py-1 rounded-full bg-red-600 text-white">{unreadCount} new</div>
            )}
          </div>
          <div className="text-sm text-gray-800">
            <span className="font-bold mr-2">{latestOrderMessage.sender}:</span>
            {latestOrderMessage.text}
          </div>
        </div>
      )}

      {isInProgressStatus(order.status) && !compact && (
        <OrderMessageThread
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
      )}

      {isInProgressStatus(order.status) && !compact && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => createAlert('customer_waiting', 'Customer waiting at aircraft / needs front desk attention')}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-xs font-bold transition"
          >
            ⚠️ Customer Waiting
          </button>
          <button
            onClick={() => createAlert('crew_car', 'Crew car requested for this aircraft')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-xs font-bold transition"
          >
            🚗 Crew Car
          </button>
          <button
            onClick={() => createAlert('desk_help', 'Ramp needs front desk assistance on this aircraft')}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-bold transition"
          >
            📣 Need Desk Help
          </button>
        </div>
      )}

      {!suppressActions && (
        <div className="flex gap-2 flex-wrap">
          {isPendingStatus(order.status) && (
            <button
              onClick={() => order.fuelType ? setShowFuelVerify(true) : startServiceFlow()}
              className="mustang-red mustang-red-hover text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              ▶️ Start Service
            </button>
          )}
          {isInProgressStatus(order.status) && onOpenServicePanel && compact && (
            <button
              onClick={() => onOpenServicePanel(order.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              Open Service Panel
            </button>
          )}
          {isInProgressStatus(order.status) && !compact && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold transition flex-1"
            >
              ✅ COMPLETE - Send to Front Desk
            </button>
          )}
          {isInProgressStatus(order.status) && !order.fuelType && !compact && (
            <button
              onClick={() => markOrderReadyForFrontDesk(order.id)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              ✅ Complete (No Fuel)
            </button>
          )}
        </div>
      )}

      {suppressActions && isPendingStatus(order.status) && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-dashed border-gray-300">
          Finish the active aircraft handoff or back out of service mode to start another aircraft.
        </div>
      )}

      {showFuelVerify && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className={`px-6 py-4 text-white ${order.fuelType === '100LL' ? 'bg-blue-600' : 'bg-black'}`}>
              <div className="text-2xl font-black tracking-wide">⚠️ FUEL VERIFICATION</div>
              <div className="text-sm opacity-90 mt-1">{customer?.tailNumber} — {customer?.aircraftType}</div>
            </div>
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="text-gray-600 text-sm mb-1">This aircraft requires:</div>
                <div className={`text-5xl font-black tracking-widest ${order.fuelType === '100LL' ? 'text-blue-600' : 'text-gray-900'}`}>
                  {order.fuelType}
                </div>
                <div className="text-gray-500 text-sm mt-1">{order.fuelQuantity} gallons requested</div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Type the fuel type to confirm:
                </label>
                <input
                  type="text"
                  value={fuelTypeInput}
                  onChange={e => { setFuelTypeInput(e.target.value.toUpperCase()); setFuelVerifyError(false); }}
                  placeholder={`Type "${order.fuelType}" to confirm`}
                  className={`w-full px-4 py-3 border-2 rounded-lg text-xl font-bold text-center tracking-widest focus:outline-none ${fuelVerifyError ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (fuelTypeInput.trim().toUpperCase() === order.fuelType.trim().toUpperCase()) {
                        setShowFuelVerify(false);
                        startServiceFlow();
                      } else {
                        setFuelVerifyError(true);
                        setFuelTypeInput('');
                      }
                    }
                  }}
                />
                {fuelVerifyError && (
                  <div className="text-red-600 text-sm font-bold text-center mt-2">
                    ✗ Incorrect — type exactly: {order.fuelType}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowFuelVerify(false); setFuelTypeInput(''); setFuelVerifyError(false); }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (fuelTypeInput.trim().toUpperCase() === order.fuelType.trim().toUpperCase()) {
                      setShowFuelVerify(false);
                      startServiceFlow();
                    } else {
                      setFuelVerifyError(true);
                      setFuelTypeInput('');
                    }
                  }}
                  className={`flex-1 text-white px-4 py-3 rounded-lg font-bold transition ${order.fuelType === '100LL' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-900'}`}
                >
                  Confirm & Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <CompletionModal
          order={order}
          customer={customer}
          onClose={() => setShowCompleteModal(false)}
          onConfirm={handleSaveAndNotify}
        />
      )}
    </div>
  );
};
