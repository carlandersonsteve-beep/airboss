        function CompletionModal({ order, customer, initialNote, onClose, onConfirm }) {
            const [actualFuel, setActualFuel] = useState(order.fuelQuantity || '');
            const [completionNotes, setCompletionNotes] = useState(initialNote || '');

            return (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-4">
                            <div className="text-xl font-bold">✅ Complete Service</div>
                            <div className="text-sm opacity-90 mt-1">
                                {customer?.tailNumber} — {customer?.pilotName || customer?.ownerName}
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {order.fuelType && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">
                                        ⛽ Actual Gallons Pumped ({order.fuelType})
                                    </label>
                                    <input
                                        type="number"
                                        value={actualFuel}
                                        onChange={e => setActualFuel(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg text-2xl font-bold text-center focus:outline-none focus:border-orange-500"
                                        placeholder="0"
                                        autoFocus
                                    />
                                    {order.fuelQuantity > 0 && (
                                        <div className="text-xs text-gray-500 mt-1 text-center">
                                            Customer requested: {order.fuelQuantity} gal
                                            {actualFuel && parseInt(actualFuel) !== order.fuelQuantity && (
                                                <span className="text-orange-600 font-medium"> — billing {actualFuel} gal</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">
                                    📝 Notes for Front Desk
                                </label>
                                <textarea
                                    value={completionNotes}
                                    onChange={e => setCompletionNotes(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                                    rows="3"
                                    placeholder="e.g. Pilot requested receipt, left main low on oil, customer wants callback before departure..."
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-lg font-medium transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => onConfirm(actualFuel, completionNotes)}
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-4 py-3 rounded-lg font-bold transition"
                                >
                                    📢 Notify Front Desk
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        const OrderCard = getExtractedComponent('OrderCard');

        window.AirBossDeps = {
            syncAdapters,
            isPendingStatus,
            isInProgressStatus,
            isReadyStatus,
            isClosedStatus,
            getTodayOrders,
            getActiveRampOrders,
            getReadyForFrontDeskOrders,
            getClosedOrders,
