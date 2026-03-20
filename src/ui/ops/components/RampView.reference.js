        function RampView({ customers, orders, tickets, onNewOrder, onNewCustomer, onQuickFuel, updateOrderStatus, addTicket, messages, addMessage, startOrderService, markOrderReadyForFrontDesk }) {
            const todayOrders = getTodayOrders(orders);

            // Ramp only sees pending and in-progress work for today.
            const activeOrders = getActiveRampOrders(orders);

            return (
                <div>
                    {/* Mobile Quick Action */}
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

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                            <div className="text-3xl font-bold text-gray-700 mt-2">
                                {getClosedOrders(todayOrders).length}
                            </div>
                        </div>
                    </div>

                    {/* Active Orders */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Active Orders</h3>
                        {activeOrders.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No active orders. Click "Aircraft Arrival" to start.</p>
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
        }

