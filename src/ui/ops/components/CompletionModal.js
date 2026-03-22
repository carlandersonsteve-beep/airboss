window.AirBossComponents = window.AirBossComponents || {};

window.AirBossComponents.CompletionModal = function CompletionModal({ order, customer, onClose, onConfirm }) {
  const { useState } = React;
  const requestedFuel = Number(order.fuelRequestedGallons ?? order.fuelQuantity ?? 0);
  const [actualFuel, setActualFuel] = useState(order.fuelActualGallons ?? '');
  const [completionNotes, setCompletionNotes] = useState(order.completionNotes || '');
  const actualFuelNumber = actualFuel === '' ? null : Number(actualFuel);
  const hasFuelVariance = actualFuel !== '' && !Number.isNaN(actualFuelNumber) && requestedFuel !== actualFuelNumber;
  const fuelVariance = hasFuelVariance ? actualFuelNumber - requestedFuel : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="mustang-red text-white p-6 rounded-t-xl">
          <h3 className="text-2xl font-bold">Complete Service</h3>
          <p className="mt-1 opacity-90">{customer?.tailNumber} - {customer?.pilotName || customer?.ownerName}</p>
        </div>

        <div className="p-6 space-y-4">
          {order.fuelType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actual Fuel Pumped ({order.fuelType})
              </label>
              <input
                type="number"
                value={actualFuel}
                onChange={(e) => setActualFuel(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="Enter actual gallons"
              />
              {hasFuelVariance && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                  <div className="text-sm font-bold text-amber-900">⚠️ Fuel variance warning</div>
                  <div className="text-sm text-amber-800 mt-1">
                    Requested: {requestedFuel} gal · Actual: {actualFuel} gal · Difference: {fuelVariance > 0 ? '+' : ''}{fuelVariance} gal
                  </div>
                  <div className="text-xs text-amber-700 mt-1">
                    Double-check the gallons and leave a note for Front Desk if this variance is intentional.
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes for Front Desk
            </label>
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              rows="4"
              placeholder="Billing notes, issues, completed services, etc."
            />
            {hasFuelVariance && !completionNotes.trim() && (
              <div className="text-xs text-amber-700 mt-2">
                Add a note explaining the fuel variance before handing off to Front Desk.
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(actualFuel, completionNotes)}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold transition"
          >
            Save & Notify Front Desk
          </button>
        </div>
      </div>
    </div>
  );
};
