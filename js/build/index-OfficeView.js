(() => {
  window.AirBossComponents = window.AirBossComponents || {};
  const CURRENT_FUEL_PRICES = {
    jetA: 7.09,
    avgas100LL: 6.45
  };
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
    getUnreadOrderThreadCount,
    markOrderThreadRead,
    closeOrder
  }) {
    const { useState } = React;
    const SERVICE_LABELS = {
      lav: "Lavatory",
      crew_car: "Crew Car",
      tiedown: "Tie-Down",
      gpu: "GPU",
      catering: "Catering",
      hangar: "Hangar",
      overnight: "Overnight",
      top_off: "Top Off"
    };
    const formatServiceLabel = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      return SERVICE_LABELS[raw] || raw.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    };
    const deps = window.AirBossComponentBridge.requireDeps(
      "OfficeView",
      window.AirBossDeps || {},
      ["isClosedStatus", "isReadyStatus", "getReadyForFrontDeskOrders", "getClosedOrders", "getTodayOrders", "getWeekOrders", "getFuelTotal", "getActiveRampOrders", "OrderMessageThread"]
    );
    const {
      isClosedStatus,
      isReadyStatus,
      getReadyForFrontDeskOrders,
      getClosedOrders,
      getTodayOrders,
      getWeekOrders,
      getFuelTotal,
      getActiveRampOrders,
      OrderMessageThread
    } = deps;
    const [filter, setFilter] = useState("all");
    const [expandedThreadOrderId, setExpandedThreadOrderId] = useState(null);
    const [finalizeOrderId, setFinalizeOrderId] = useState(null);
    const [confirmingSentOrderId, setConfirmingSentOrderId] = useState(null);
    const pendingTickets = tickets.filter((t) => t.status === "pending");
    const readyToBillOrders = getReadyForFrontDeskOrders(orders);
    const activeServiceOrders = getActiveRampOrders(orders).filter((order) => String(order.status).replace(/-/g, "_") === "in_progress");
    const unreadReadyThreads = readyToBillOrders.filter((order) => (getUnreadOrderThreadCount ? getUnreadOrderThreadCount(order.id) : 0) > 0).length;
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const preDepartureOrders = orders.filter(
      (o) => o.departureDate === tomorrowStr && !isClosedStatus(o.status) && !o.preDepartureSent
    );
    const generatePreDepartureEmail = (order, customer) => {
      const depTime = order.departureTime ? (() => {
        const [h, m] = order.departureTime.split(":");
        const ampm = h >= 12 ? "PM" : "AM";
        return (h % 12 || 12) + ":" + m + " " + ampm;
      })() : "your scheduled time";
      const subject = `See You Tomorrow - ${customer?.tailNumber} - Mustang Aviation`;
      const body = `Dear ${customer?.pilotName || customer?.ownerName || "Valued Customer"},

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
      const mailtoLink = `mailto:${customer?.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
      setConfirmingSentOrderId(order.id);
    };
    const markPreDepartureSentConfirmed = (order) => {
      updateOrderStatus(order.id, order.status, {
        preDepartureSent: true,
        preDepartureSentAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      setConfirmingSentOrderId(null);
    };
    const filteredOrders = (() => {
      if (filter === "archive") return getClosedOrders(orders);
      const readyQueue = getReadyForFrontDeskOrders(orders);
      if (filter === "today") return getTodayOrders(readyQueue);
      if (filter === "week") return getWeekOrders(readyQueue);
      return readyQueue;
    })();
    const fuelDashboardOrders = (() => {
      if (filter === "archive") return getClosedOrders(orders);
      if (filter === "today") return getTodayOrders(orders).filter((order) => !isClosedStatus(order.status) || Number(order.fuelActualGallons ?? order.fuelRequestedGallons ?? order.fuelQuantity ?? 0) > 0);
      if (filter === "week") return getWeekOrders(orders).filter((order) => !isClosedStatus(order.status) || Number(order.fuelActualGallons ?? order.fuelRequestedGallons ?? order.fuelQuantity ?? 0) > 0);
      return (orders || []).filter((order) => !isClosedStatus(order.status) || Number(order.fuelActualGallons ?? order.fuelRequestedGallons ?? order.fuelQuantity ?? 0) > 0);
    })();
    const totalJetA = Math.round(getFuelTotal(fuelDashboardOrders, "JET-A"));
    const total100LL = Math.round(getFuelTotal(fuelDashboardOrders, "100LL"));
    const finalizeOrder = orders.find((order) => order.id === finalizeOrderId) || null;
    const finalizeCustomer = finalizeOrder ? customers.find((c) => c.id === finalizeOrder.customerId) : null;
    const formatDepartureDate = (value) => {
      if (!value) return "Not scheduled";
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return String(value);
      return parsed.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    };
    const formatDepartureTime = (value) => {
      if (!value) return "time not set";
      const [rawHour, minute] = String(value).split(":");
      const hour = Number(rawHour);
      if (!Number.isFinite(hour) || minute === void 0) return String(value);
      const ampm = hour >= 12 ? "PM" : "AM";
      return `${hour % 12 || 12}:${minute} ${ampm}`;
    };
    const formatDepartureSummary = (dateValue, timeValue) => {
      if (!dateValue) return "Not scheduled";
      const dateLabel = formatDepartureDate(dateValue);
      const timeLabel = formatDepartureTime(timeValue);
      return `${dateLabel} \u2022 Departure Time ${timeLabel}`;
    };
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-3xl font-bold text-gray-800 mb-2" }, "Front Desk"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600" }, "Ready-to-bill aircraft, handoff notes, and order-level communication")), /* @__PURE__ */ React.createElement("div", { className: "mb-6 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "font-black uppercase tracking-wide text-emerald-800" }, "Fuel Prices"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-700" }, "Jet-A ", /* @__PURE__ */ React.createElement("span", { className: "font-black text-emerald-700" }, "$", CURRENT_FUEL_PRICES.jetA.toFixed(2), "/gal")), /* @__PURE__ */ React.createElement("div", { className: "text-gray-700" }, "100LL ", /* @__PURE__ */ React.createElement("span", { className: "font-black text-blue-700" }, "$", CURRENT_FUEL_PRICES.avgas100LL.toFixed(2), "/gal"))), preDepartureOrders.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-blue-600 text-white rounded-lg p-5 mb-6 shadow-xl" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl" }, "\u2708\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold" }, "Pre-Departure Emails Ready (", preDepartureOrders.length, ")"), /* @__PURE__ */ React.createElement("p", { className: "text-sm opacity-90" }, "These aircraft are departing tomorrow \u2014 send a courtesy check-in"))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 mt-3" }, preDepartureOrders.map((order) => {
      const customer = customers.find((c) => c.id === order.customerId);
      const depTime = order.departureTime ? (() => {
        const [h, m] = order.departureTime.split(":");
        const ampm = h >= 12 ? "PM" : "AM";
        return (h % 12 || 12) + ":" + m + " " + ampm;
      })() : "TBD";
      return /* @__PURE__ */ React.createElement("div", { key: order.id, className: "bg-white/15 rounded-lg px-4 py-3 flex justify-between items-center" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, customer?.tailNumber), /* @__PURE__ */ React.createElement("span", { className: "opacity-90 ml-2" }, customer?.pilotName || customer?.ownerName), /* @__PURE__ */ React.createElement("span", { className: "text-sm opacity-75 ml-2" }, "\u2014 departs tomorrow at ", depTime), !customer?.email && /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-yellow-300 text-xs font-bold" }, "\u26A0\uFE0F No email on file")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => generatePreDepartureEmail(order, customer),
          disabled: !customer?.email,
          className: `px-4 py-2 rounded-lg font-bold transition ${customer?.email ? "bg-white text-blue-600 hover:bg-blue-50" : "bg-gray-400 text-gray-200 cursor-not-allowed"}`
        },
        "Open Email"
      ), confirmingSentOrderId === order.id && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => markPreDepartureSentConfirmed(order),
          className: "px-4 py-2 rounded-lg font-bold transition bg-blue-900 text-white hover:bg-blue-950"
        },
        "Mark Sent"
      )));
    }))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "stat-card p-6 border-l-4 border-orange-500" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 text-sm font-medium uppercase tracking-wide" }, "Ready to Bill"), /* @__PURE__ */ React.createElement("div", { className: "text-3xl font-bold text-orange-600 mt-2" }, filter === "archive" ? 0 : filteredOrders.length)), /* @__PURE__ */ React.createElement("div", { className: "stat-card p-6 border-l-4 border-green-500" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 text-sm font-medium uppercase tracking-wide" }, "Jet-A (", filter, ")"), /* @__PURE__ */ React.createElement("div", { className: "text-3xl font-bold text-green-600 mt-2" }, totalJetA, " gal")), /* @__PURE__ */ React.createElement("div", { className: "stat-card p-6 border-l-4 border-blue-500" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 text-sm font-medium uppercase tracking-wide" }, "100LL (", filter, ")"), /* @__PURE__ */ React.createElement("div", { className: "text-3xl font-bold text-blue-600 mt-2" }, total100LL, " gal")), /* @__PURE__ */ React.createElement("div", { className: "stat-card p-6 border-l-4 border-yellow-500" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 text-sm font-medium uppercase tracking-wide" }, "Pending Alerts"), /* @__PURE__ */ React.createElement("div", { className: "text-3xl font-bold text-yellow-600 mt-2" }, pendingTickets.length))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-lg shadow-lg p-6 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-4 flex-wrap gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-gray-800" }, "Active Service Chat"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mt-1" }, "Live ramp \u2194 desk coordination by aircraft tail number. This replaces radio chatter during service.")), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-red-600" }, activeServiceOrders.length, " active aircraft")), activeServiceOrders.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300 px-4 py-4 mb-6" }, "No aircraft are currently in active service.") : /* @__PURE__ */ React.createElement("div", { className: "space-y-4 mb-6" }, activeServiceOrders.map((order) => {
      const customer = customers.find((c) => c.id === order.customerId);
      const unreadCount = getUnreadOrderThreadCount ? getUnreadOrderThreadCount(order.id) : 0;
      const requestedFuel = order.fuelRequestedGallons ?? order.fuelQuantity ?? 0;
      return /* @__PURE__ */ React.createElement("div", { key: `active-${order.id}`, className: `border rounded-xl p-4 transition ${unreadCount > 0 ? "border-red-300 bg-red-50/50 ring-2 ring-red-200 shadow-lg" : "border-blue-200 bg-blue-50/40"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start gap-3 mb-3 flex-wrap" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-lg text-blue-900" }, customer?.tailNumber || order.tailNumber || "Unknown Tail"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-700" }, customer?.aircraftType || order.aircraft || "Unknown Type", " \u2022 ", customer?.pilotName || customer?.ownerName || order.customerName || "Unknown customer"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 mt-1" }, order.fuelType ? `${order.fuelType} \u2022 ${requestedFuel} gal requested` : "No fuel requested")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-end gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800" }, String(order.status).replace(/[-_]/g, " ").toUpperCase()), unreadCount > 0 && /* @__PURE__ */ React.createElement("div", { className: "text-xs font-black px-2.5 py-1 rounded-full bg-red-600 text-white animate-pulse shadow-sm" }, unreadCount, " new"))), /* @__PURE__ */ React.createElement("div", { onClick: () => unreadCount > 0 && markOrderThreadRead && markOrderThreadRead(order.id) }, /* @__PURE__ */ React.createElement(
        OrderMessageThread,
        {
          key: `active-thread-${order.id}`,
          order,
          customer,
          messages,
          addMessage,
          senderRole: "OFFICE",
          title: `Service Chat \u2014 ${customer?.tailNumber || order.tailNumber || "Unknown Tail"}`,
          emptyLabel: "No service messages yet. Use this to coordinate with the line crew instead of the radio.",
          accent: "blue",
          compact: true,
          unreadCount,
          onOpen: markOrderThreadRead
        }
      )));
    }))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-lg shadow-lg p-6 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-4 flex-wrap gap-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-gray-800" }, "Ready to Bill"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 flex-wrap" }, ["today", "week", "all", "archive"].map((key) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        onClick: () => setFilter(key),
        className: `px-4 py-2 rounded-lg font-medium transition ${filter === key ? "mustang-red text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`
      },
      key.charAt(0).toUpperCase() + key.slice(1)
    )))), pendingTickets.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-yellow-800 mb-3" }, "\u26A0\uFE0F Ramp Alerts"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, pendingTickets.map((ticket) => /* @__PURE__ */ React.createElement("div", { key: ticket.id, className: "bg-white p-3 rounded flex justify-between items-center" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, ticket.tailNumber || ticket.type), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600" }, ticket.message || ticket.notes || "Ramp request")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => resolveTicket(ticket.id), className: "bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm" }, "Resolve"), /* @__PURE__ */ React.createElement("button", { onClick: () => deleteTicket(ticket.id), className: "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm" }, "Delete")))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, filteredOrders.map((order) => {
      const customer = customers.find((c) => c.id === order.customerId);
      const orderMessages = (messages || []).filter((message) => message.orderId === order.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const latestOrderMessage = orderMessages[orderMessages.length - 1] || null;
      const unreadCount = getUnreadOrderThreadCount ? getUnreadOrderThreadCount(order.id) : 0;
      const showThread = expandedThreadOrderId === order.id;
      return /* @__PURE__ */ React.createElement("div", { key: order.id, className: "border border-gray-200 rounded-lg p-4 hover:shadow-md transition" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start mb-3 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-lg mustang-red-text" }, customer?.tailNumber || order.tailNumber || "Unknown"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, customer?.aircraftType || order.aircraft || "Unknown Type"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-500" }, customer?.pilotName || customer?.ownerName || order.customerName)), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-end gap-2" }, /* @__PURE__ */ React.createElement("span", { className: `px-3 py-1 rounded-full text-sm font-medium ${isClosedStatus(order.status) ? "bg-gray-100 text-gray-800" : isReadyStatus(order.status) ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}` }, String(order.status).replace(/[-_]/g, " ").toUpperCase()), unreadCount > 0 && /* @__PURE__ */ React.createElement("div", { className: "text-xs font-black px-2 py-1 rounded-full bg-red-600 text-white" }, unreadCount, " new"))), order.completionNotes && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-700 bg-blue-50 p-3 rounded mb-3 border border-blue-200" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Handoff Notes:"), " ", order.completionNotes), /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement(
        OrderMessageThread,
        {
          key: `ready-thread-${order.id}-${orderMessages.length}`,
          order,
          customer,
          messages,
          addMessage,
          senderRole: "OFFICE",
          title: `Aircraft Thread \u2014 ${customer?.tailNumber || order.tailNumber || "Unknown Tail"}`,
          emptyLabel: "No aircraft messages yet. Use this to coordinate instead of the radio.",
          accent: "blue",
          compact: true,
          unreadCount,
          onOpen: markOrderThreadRead
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 flex-wrap" }, isReadyStatus(order.status) && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: () => recallOrder(order.id), className: "bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-medium" }, "\u21A9 Recall"), /* @__PURE__ */ React.createElement("button", { onClick: () => setFinalizeOrderId(order.id), className: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium" }, "Finalize"), !showThread && /* @__PURE__ */ React.createElement("button", { onClick: () => setExpandedThreadOrderId(order.id), className: "bg-gray-800 hover:bg-black text-white px-4 py-2 rounded text-sm font-medium" }, "\u{1F4AC} Reply to Ramp")), isClosedStatus(order.status) && /* @__PURE__ */ React.createElement("button", { onClick: () => recallOrder(order.id), className: "bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-medium" }, "\u21A9 Reopen"), customer?.email && /* @__PURE__ */ React.createElement("button", { onClick: () => generateCompletionEmail(order, customer), className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium" }, "\u2709 Email Customer")));
    }))), finalizeOrder && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "bg-green-700 text-white p-6 rounded-t-xl" }, /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-bold" }, "Finalize Billing Review"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 opacity-90" }, finalizeCustomer?.tailNumber || finalizeOrder.tailNumber, " \u2014 ", finalizeCustomer?.pilotName || finalizeCustomer?.ownerName || "Customer")), /* @__PURE__ */ React.createElement("div", { className: "p-6 space-y-5" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs uppercase tracking-wide text-gray-500 font-bold" }, "Aircraft"), /* @__PURE__ */ React.createElement("div", { className: "text-lg font-bold text-gray-900 mt-1" }, finalizeCustomer?.tailNumber || finalizeOrder.tailNumber || "Unknown"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600" }, finalizeCustomer?.aircraftType || finalizeOrder.aircraft || "Unknown Type"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 mt-1" }, finalizeCustomer?.pilotName || finalizeCustomer?.ownerName || finalizeOrder.customerName || "Unknown customer")), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs uppercase tracking-wide text-gray-500 font-bold" }, "Departure"), /* @__PURE__ */ React.createElement("div", { className: "text-lg font-bold text-gray-900 mt-1" }, formatDepartureSummary(finalizeOrder.departureDate, finalizeOrder.departureTime)))), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 rounded-lg p-4 border border-blue-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs uppercase tracking-wide text-blue-700 font-bold mb-2" }, "Fuel Summary"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3 text-sm" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500" }, "Fuel Type"), /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900" }, finalizeOrder.fuelType || "None")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500" }, "Requested"), /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900" }, finalizeOrder.fuelRequestedGallons ?? finalizeOrder.fuelQuantity ?? 0, " gal")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500" }, "Actual"), /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900" }, finalizeOrder.fuelActualGallons ?? finalizeOrder.fuelQuantity ?? 0, " gal"))), Number(finalizeOrder.fuelActualGallons ?? finalizeOrder.fuelQuantity ?? 0) !== Number(finalizeOrder.fuelRequestedGallons ?? finalizeOrder.fuelQuantity ?? 0) && /* @__PURE__ */ React.createElement("div", { className: "mt-3 text-sm font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded px-3 py-2" }, "\u26A0\uFE0F Fuel variance detected. Confirm billing is based on the actual gallons pumped.")), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs uppercase tracking-wide text-gray-500 font-bold mb-2" }, "Services & Notes"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-800" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Services:"), " ", finalizeOrder.services && finalizeOrder.services.length > 0 ? finalizeOrder.services.map(formatServiceLabel).join(", ") : "None"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-800 mt-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Handoff Notes:"), " ", finalizeOrder.completionNotes || "None"))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 p-6 bg-gray-50 rounded-b-xl" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setFinalizeOrderId(null),
        className: "flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-medium transition"
      },
      "Back"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (finalizeCustomer?.email) {
            generateCompletionEmail(finalizeOrder, finalizeCustomer);
          }
          closeOrder(finalizeOrder.id);
          setFinalizeOrderId(null);
        },
        className: "flex-1 bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-bold transition"
      },
      "Finalize & Draft Email"
    )))));
  };
})();
