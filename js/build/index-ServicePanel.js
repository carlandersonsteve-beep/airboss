(() => {
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
    onBack
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
    const formatLabel = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      return SERVICE_LABELS[raw] || raw.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    };
    const deps = window.AirBossComponentBridge.requireDeps(
      "ServicePanel",
      window.AirBossDeps || {},
      ["syncAdapters", "OrderMessageThread", "CompletionModal"]
    );
    const {
      syncAdapters,
      OrderMessageThread,
      CompletionModal
    } = deps;
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const unreadCount = getUnreadOrderThreadCount ? getUnreadOrderThreadCount(order.id) : 0;
    const requestedFuel = order.fuelRequestedGallons ?? order.fuelQuantity ?? 0;
    const departureDateValue = order.departureDate ? new Date(order.departureDate) : null;
    const hasValidDepartureDate = departureDateValue && !Number.isNaN(departureDateValue.getTime());
    const handleSaveAndNotify = async (actualFuel, completionNotes, meterData = {}) => {
      const parsedActualFuel = actualFuel === "" || actualFuel === null || actualFuel === void 0 ? order.fuelActualGallons ?? order.fuelQuantity ?? order.fuelRequestedGallons ?? null : parseFloat(actualFuel);
      const finalActualFuel = Number.isNaN(parsedActualFuel) ? null : parsedActualFuel;
      const updatedOrder = {
        ...order,
        fuelActualGallons: finalActualFuel,
        fuelMeterStart: meterData.meterStart ?? order.fuelMeterStart ?? null,
        fuelMeterEnd: meterData.meterEnd ?? order.fuelMeterEnd ?? null,
        services: order.services || [],
        completionNotes: completionNotes || "",
        completedAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: "ready"
      };
      setShowCompleteModal(false);
      try {
        syncAdapters.syncToSheets("updateOrder", { order: updatedOrder });
      } catch (error) {
        console.log("Order sync bridge failed during completion", error.message);
      }
      try {
        await markOrderReadyForFrontDesk(order.id, {
          status: "ready",
          completedAt: updatedOrder.completedAt,
          fuelActualGallons: finalActualFuel,
          fuelMeterStart: meterData.meterStart ?? order.fuelMeterStart ?? null,
          fuelMeterEnd: meterData.meterEnd ?? order.fuelMeterEnd ?? null,
          completionNotes: completionNotes || ""
        });
        onBack && onBack();
      } catch (error) {
        console.log("Complete service transition failed", error.message);
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
        submittedBy: "Ramp",
        notes: ""
      });
    };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl border-2 border-orange-200 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "mustang-red text-white px-6 py-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-4 flex-wrap" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs uppercase tracking-[0.25em] opacity-80 font-bold" }, "Active Service"), /* @__PURE__ */ React.createElement("h3", { className: "text-3xl font-black mt-2" }, customer?.tailNumber || order.tailNumber || "Unknown Tail"), /* @__PURE__ */ React.createElement("div", { className: "text-lg opacity-95 mt-1" }, customer?.aircraftType || order.aircraftType || "Unknown Type"), /* @__PURE__ */ React.createElement("div", { className: "text-sm opacity-90 mt-1" }, customer?.pilotName || customer?.ownerName || order.customerName || "Unknown customer")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 flex-wrap" }, unreadCount > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-white text-red-600 px-3 py-1 rounded-full text-sm font-black" }, unreadCount, " new desk repl", unreadCount === 1 ? "y" : "ies"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onBack,
        className: "bg-white/15 hover:bg-white/25 text-white border border-white/30 px-4 py-2 rounded-lg text-sm font-bold transition"
      },
      "\u2190 Back to Ramp Queue"
    )))), /* @__PURE__ */ React.createElement("div", { className: "p-6 space-y-5" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 xl:grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: `rounded-xl border-2 p-4 ${order.fuelType ? order.fuelType === "JET-A" || order.fuelType === "Jet-A" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"}` }, /* @__PURE__ */ React.createElement("div", { className: "text-xs uppercase tracking-wide font-bold text-gray-500" }, "Fuel"), order.fuelType ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "text-3xl font-black mt-2 text-gray-900" }, requestedFuel, " gal"), /* @__PURE__ */ React.createElement("div", { className: `text-lg font-bold mt-1 ${order.fuelType === "JET-A" || order.fuelType === "Jet-A" ? "text-amber-900" : "text-blue-900"}` }, order.fuelType), /* @__PURE__ */ React.createElement("div", { className: `text-sm mt-2 ${order.fuelType === "JET-A" || order.fuelType === "Jet-A" ? "text-amber-900" : "text-blue-900"}` }, "Actual gallons are captured when Ramp completes and hands this aircraft to Front Desk.")) : /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 mt-2" }, "No fuel order on this aircraft.")), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs uppercase tracking-wide font-black text-indigo-700" }, "Requested Services"), order.services && order.services.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mt-3" }, order.services.map((service) => /* @__PURE__ */ React.createElement("span", { key: service, className: "bg-white border border-indigo-300 text-indigo-900 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm" }, formatLabel(service)))) : /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 mt-2" }, "No extra services requested."), order.hangarOvernight && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-700 mt-3" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Parking:"), " ", order.hangarOvernight === "yes" ? "Hangar overnight requested" : "Outside parking requested")), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-gray-200 bg-gray-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs uppercase tracking-wide font-bold text-gray-500" }, "Departure"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-700 mt-2" }, order.departureDate ? hasValidDepartureDate ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-gray-900" }, departureDateValue.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    })), /* @__PURE__ */ React.createElement("div", { className: "mt-1" }, order.departureTime ? (() => {
      const [h, m] = order.departureTime.split(":");
      const ampm = h >= 12 ? "PM" : "AM";
      return `Scheduled out at ${h % 12 || 12}:${m} ${ampm}`;
    })() : "Departure time not set")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-gray-900" }, String(order.departureDate)), /* @__PURE__ */ React.createElement("div", { className: "mt-1" }, order.departureTime || "Departure time not set")) : "No departure set"), order.purpose && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-700 mt-3" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Purpose:"), " ", formatLabel(order.purpose)))), order.notes && /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-blue-200 bg-blue-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs uppercase tracking-wide font-bold text-blue-700 mb-2" }, "Arrival / Service Notes"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-800 whitespace-pre-wrap" }, order.notes)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] gap-5" }, /* @__PURE__ */ React.createElement(
      OrderMessageThread,
      {
        key: `service-thread-${order.id}-${messages ? messages.filter((message) => message.orderId === order.id).length : 0}`,
        order,
        customer,
        messages,
        addMessage,
        senderRole: "RAMP",
        title: "Ramp \u2194 Front Desk Thread",
        emptyLabel: "No messages on this aircraft yet. Use this instead of radio chatter when something changes.",
        unreadCount,
        onOpen: markOrderThreadRead
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-gray-200 bg-gray-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-gray-900 mb-3" }, "Quick Alerts"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => createAlert("customer_waiting", "Customer waiting at aircraft / needs front desk attention"),
        className: "bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg text-sm font-bold transition"
      },
      "\u26A0\uFE0F Customer Waiting"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => createAlert("crew_car", "Crew car requested for this aircraft"),
        className: "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition"
      },
      "\u{1F697} Crew Car"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => createAlert("desk_help", "Ramp needs front desk assistance on this aircraft"),
        className: "bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition"
      },
      "\u{1F4E3} Need Desk Help"
    )), /* @__PURE__ */ React.createElement("div", { className: "mt-4 rounded-lg bg-white border border-gray-200 p-3 text-sm text-gray-700" }, "This aircraft stays in focused service mode until Ramp completes service. Then it moves into Front Desk\u2019s ready-to-bill queue.")))), /* @__PURE__ */ React.createElement("div", { className: "px-6 py-5 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row gap-3 md:items-center md:justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600" }, "Focused service mode is active. The rest of the ramp queue stays visible below as secondary context."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowCompleteModal(true),
        className: "bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-black transition shadow-lg"
      },
      "\u2705 Complete / Send to Front Desk"
    ))), showCompleteModal && /* @__PURE__ */ React.createElement(
      CompletionModal,
      {
        order,
        customer,
        onClose: () => setShowCompleteModal(false),
        onConfirm: handleSaveAndNotify
      }
    ));
  };
})();
