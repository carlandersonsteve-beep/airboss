window.AirBossComponents = window.AirBossComponents || {};

window.AirBossComponents.OrderCard = function OrderCard({
  order,
  customer,
  updateOrderStatus,
  addTicket,
  messages,
  addMessage,
  startOrderService,
  markOrderReadyForFrontDesk,
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

  const [editedFuel, setEditedFuel] = useState(order.fuelQuantity || 0);
  const [editedServices, setEditedServices] = useState(order.services || []);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showFuelVerify, setShowFuelVerify] = useState(false);
  const [fuelVerified, setFuelVerified] = useState(false);
  const [fuelTypeInput, setFuelTypeInput] = useState('');
  const [fuelVerifyError, setFuelVerifyError] = useState(false);

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

  const handleSaveAndNotify = (actualFuel, completionNotes) => {
    const updatedOrder = {
      ...order,
      fuelQuantity: actualFuel ? parseInt(actualFuel) : order.fuelQuantity,
      services: editedServices,
      completionNotes: completionNotes || '',
      completedAt: new Date().toISOString(),
      status: 'ready',
    };

    syncAdapters.syncToSheets('updateOrder', { order: updatedOrder });

    markOrderReadyForFrontDesk(order.id, {
      fuelQuantity: actualFuel ? parseInt(actualFuel) : order.fuelQuantity,
      completionNotes: completionNotes || '',
    });
    setShowCompleteModal(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-bold text-lg mustang-red-text">{customer?.tailNumber || 'Unknown'}</div>
          <div className="text-gray-600">{customer?.aircraftType || 'Unknown Type'}</div>
          <div className="text-sm text-gray-500">{customer?.pilotName || customer?.ownerName}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[order.status]}`}>
            {order.status.replace('-', ' ').toUpperCase()}
          </span>
          <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="mb-3">
        {order.fuelType && (
          <div className="bg-blue-50 border-2 border-blue-200 p-3 rounded-lg">
            <div className="font-semibold text-blue-900 mb-2">⛽ Fuel Service</div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm text-gray-600">Actual Gallons Pumped:</label>
                <input
                  type="number"
                  value={editedFuel}
                  onChange={(e) => setEditedFuel(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg font-bold text-lg"
                  placeholder="0"
                />
              </div>
              <div className="text-2xl font-bold text-gray-700 mt-5">{order.fuelType}</div>
            </div>
            {order.fuelQuantity !== editedFuel && (
              <div className="mt-2 text-sm text-orange-600">
                ⚠️ Customer requested {order.fuelQuantity}gal, you're billing {editedFuel}gal
              </div>
            )}
          </div>
        )}
        {order.hangar && (
          <div className="bg-gray-50 p-2 rounded mt-2">
            <span className="font-medium">Hangar:</span> {order.hangar}
          </div>
        )}
        {order.services && order.services.length > 0 && (
          <div className="bg-gray-50 p-2 rounded mt-2">
            <span className="font-medium">Services:</span> {order.services.join(', ')}
          </div>
        )}
      </div>

      {order.notes && (
        <div className="text-sm text-gray-600 mb-3 bg-blue-50 p-2 rounded">
          <span className="font-medium">Notes:</span> {order.notes}
        </div>
      )}
      {order.departureDate && (
        <div className="text-sm text-gray-600 mb-3 bg-green-50 border border-green-200 p-2 rounded">
          <span className="font-medium">✈️ Departure:</span>{' '}
          {new Date(order.departureDate + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
          })}
          {order.departureTime && ` at ${(() => {
            const [h, m] = order.departureTime.split(':');
            const ampm = h >= 12 ? 'PM' : 'AM';
            return ((h % 12) || 12) + ':' + m + ' ' + ampm;
          })()}`}
        </div>
      )}

      {latestOrderMessage && !isInProgressStatus(order.status) && (
        <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Latest Order Message</div>
          <div className="text-sm text-gray-800">
            <span className="font-bold mr-2">{latestOrderMessage.sender}:</span>
            {latestOrderMessage.text}
          </div>
        </div>
      )}

      {isInProgressStatus(order.status) && (
        <OrderMessageThread
          order={order}
          messages={messages}
          addMessage={addMessage}
          senderRole="RAMP"
          title="Ramp ↔ Front Desk Thread"
          emptyLabel="No messages on this aircraft yet. Use this instead of radio chatter when something changes."
        />
      )}

      <div className="flex gap-2 flex-wrap">
        {isPendingStatus(order.status) && (
          <button
            onClick={() => order.fuelType ? setShowFuelVerify(true) : startOrderService(order.id)}
            className="mustang-red mustang-red-hover text-white px-4 py-2 rounded text-sm font-medium transition"
          >
            ▶️ Start Service
          </button>
        )}
        {isInProgressStatus(order.status) && (
          <button
            onClick={() => setShowCompleteModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold transition flex-1"
          >
            ✅ COMPLETE - Send to Front Desk
          </button>
        )}
        {isInProgressStatus(order.status) && !order.fuelType && (
          <button
            onClick={() => markOrderReadyForFrontDesk(order.id)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition"
          >
            ✅ Complete (No Fuel)
          </button>
        )}
      </div>

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
                        setFuelVerified(true);
                        setShowFuelVerify(false);
                        startOrderService(order.id);
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
                      setFuelVerified(true);
                      setShowFuelVerify(false);
                      startOrderService(order.id);
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
