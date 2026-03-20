        function OfficeView({ orders, customers, tickets, updateOrderStatus, recallOrder, resolveTicket, deleteTicket, generateCompletionEmail, messages, addMessage, closeOrder }) {
            const [filter, setFilter] = useState('today'); // 'today', 'week', 'all', 'archive'
            
            const pendingTickets = tickets.filter(t => t.status === 'pending');
            const readyToBillOrders = getReadyForFrontDeskOrders(orders);

            // === PRE-DEPARTURE EMAIL FEATURE ===
            // TODO: FIREBASE UPGRADE NEEDED — currently manual trigger only.
            // When Firebase is added, replace this with a Cloud Function (Firebase Scheduler)
            // that runs daily at 8:00 AM and auto-sends these emails without anyone
            // needing to be at the desk. See: firebase.google.com/docs/functions/schedule-functions
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

                // Mark as sent
                markPreDepartureSent(order.id);
            };
            // === END PRE-DEPARTURE EMAIL FEATURE ===
            
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

                    {/* === PRE-DEPARTURE EMAIL ALERT === */}
                    {/* TODO: FIREBASE UPGRADE — auto-send these at 8AM daily without manual trigger */}
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
                                                className="bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium text-sm transition"
                                            >
                                                📧 Send Email
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {/* === END PRE-DEPARTURE EMAIL ALERT === */}

                    {/* READY TO BILL - BIG ALERT */}
                    {readyToBillOrders.length > 0 && (
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg p-6 mb-6 shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-4xl">🔔</span>
                                        <h3 className="text-2xl font-bold">
                                            READY TO BILL ({readyToBillOrders.length})
                                        </h3>
                                    </div>
                                    <p className="opacity-90">Aircraft service completed - ready for customer billing</p>
                                </div>
                            </div>
                            <div className="mt-4 space-y-3">
                                {readyToBillOrders.map(order => {
                                    const customer = customers.find(c => c.id === order.customerId);
                                    return (
                                        <div key={order.id} className="bg-white/10 backdrop-blur rounded-lg p-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-xl">{order.tailNumber}</div>
                                                        {!customer?.email && (
                                                            <span className="text-xs bg-white bg-opacity-30 text-white font-bold px-2 py-0.5 rounded-full">⚠️ No email on file</span>
                                                        )}
                                                    </div>
                                                    <div className="opacity-90">
                                                        {customer?.pilotName} • {order.aircraft}
                                                    </div>
                                                    <div className="text-sm opacity-75 mt-1">
                                                        {order.fuelQuantity}gal {order.fuelType}
                                                        {order.services?.length > 0 && ` • ${order.services.length} services`}
                                                    </div>
                                                    {order.completionNotes && (
                                                        <div className="text-sm mt-2 bg-black bg-opacity-20 rounded-lg px-3 py-2">
                                                            🔒 <span className="font-medium">Internal note:</span> {order.completionNotes}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => recallOrder(order.id)}
                                                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition"
                                                        title="Send back to ramp"
                                                    >
                                                        ↩️ Recall to Ramp
                                                    </button>
                                                    <button
                                                        onClick={() => generateCompletionEmail(order, customer)}
                                                        className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition"
                                                    >
                                                        📧 Email Customer
                                                    </button>
                                                    <button
                                                        onClick={() => closeOrder(order.id)}
                                                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                                                    >
                                                        ✅ Finalize & Archive
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Pending Tickets from Ramp */}
                    {pendingTickets.length > 0 && (
                        <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">📢</span>
                                <h3 className="text-xl font-bold text-orange-800">
                                    Ramp Notifications ({pendingTickets.length})
                                </h3>
                            </div>
                            <div className="space-y-2">
                                {pendingTickets.map(ticket => {
                                    const order = orders.find(o => o.id === ticket.orderId);
                                    const customer = customers.find(c => c.id === ticket.customerId);
                                    return (
                                        <div key={ticket.id} className="bg-white rounded-lg p-4 border border-orange-200">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-lg mustang-red-text">
                                                        {ticket.tailNumber}
                                                    </div>
                                                    <div className="text-gray-700 font-medium">
                                                        {ticket.message}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {new Date(ticket.createdAt).toLocaleTimeString()} - {ticket.submittedBy}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            generateCompletionEmail(order, customer);
                                                        }}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition"
                                                        title="Send completion email"
                                                    >
                                                        📧 Email
                                                    </button>
                                                    <button
                                                        onClick={() => resolveTicket(ticket.id)}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition"
                                                    >
                                                        ✓ Resolve
                                                    </button>
                                                    <button
                                                        onClick={() => deleteTicket(ticket.id)}
                                                        className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm font-medium transition"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setFilter('today')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                filter === 'today' 
                                ? 'mustang-red text-white' 
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            📅 Today
                        </button>
                        <button
                            onClick={() => setFilter('week')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                filter === 'week' 
                                ? 'mustang-red text-white' 
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            📊 This Week
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                filter === 'all' 
                                ? 'mustang-red text-white' 
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            📋 All Time
                        </button>
                        <button
                            onClick={() => setFilter('archive')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                filter === 'archive' 
                                ? 'mustang-red text-white' 
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            🗄️ Archive
                        </button>
                    </div>

                    {/* Fuel Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="stat-card p-6">
                            <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Orders</div>
                            <div className="text-3xl font-bold mustang-red-text mt-2">{filteredOrders.length}</div>
                        </div>
                        <div className="stat-card p-6">
                            <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Jet-A Gallons</div>
                            <div className="text-3xl font-bold text-blue-600 mt-2">{totalJetA.toLocaleString()}</div>
                        </div>
                        <div className="stat-card p-6">
                            <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">100LL Gallons</div>
                            <div className="text-3xl font-bold text-green-600 mt-2">{total100LL.toLocaleString()}</div>
                        </div>
                        <div className="stat-card p-6">
                            <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Hangar Requests</div>
                            <div className="text-3xl font-bold text-purple-600 mt-2">
                                {filteredOrders.filter(o => o.hangar).length}
                            </div>
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Tail #</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Aircraft</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Fuel</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Services</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                No orders for selected period
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map(order => {
                                            const customer = customers.find(c => c.id === order.customerId);
                                            return (
                                                <tr key={order.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {new Date(order.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                        {customer?.tailNumber}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {customer?.aircraftType}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {order.fuelType ? `${order.fuelQuantity} gal ${order.fuelType}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {order.hangar || ''} {order.services?.join(', ') || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                            isClosedStatus(order.status) ? 'bg-gray-100 text-gray-800' :
                                                            isReadyStatus(order.status) ? 'bg-orange-100 text-orange-800' :
                                                            isInProgressStatus(order.status) ? 'bg-blue-100 text-blue-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        {isClosedStatus(order.status) && (
                                                            <button
                                                                onClick={() => recallOrder(order.id)}
                                                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs font-medium transition mr-2"
                                                                title="Recall to front desk"
                                                            >
                                                                ↩️ Recall
                                                            </button>
                                                        )}
                                                        {isClosedStatus(order.status) && customer?.email && (
                                                            <button
                                                                onClick={() => generateCompletionEmail(order, customer)}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition"
                                                                title="Send completion email"
                                                            >
                                                                📧 Email
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

