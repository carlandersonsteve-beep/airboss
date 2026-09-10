(() => {
  window.AirBossComponents = window.AirBossComponents || {};
  window.AirBossComponents.CompletionModal = function CompletionModal({ order, customer, onClose, onConfirm }) {
    const { useMemo, useState } = React;
    const requestedFuel = Number(order.fuelRequestedGallons ?? order.fuelQuantity ?? 0);
    const [actualFuel, setActualFuel] = useState(order.fuelActualGallons ?? "");
    const [meterStart, setMeterStart] = useState(order.fuelMeterStart ?? "");
    const [meterEnd, setMeterEnd] = useState(order.fuelMeterEnd ?? "");
    const [completionNotes, setCompletionNotes] = useState(order.completionNotes || "");
    const validation = useMemo(() => {
      const hasFuelOrder = Boolean(order.fuelType);
      const parsedActualFuel = actualFuel === "" ? null : Number(actualFuel);
      const actualFuelNumber = actualFuel === "" || Number.isNaN(parsedActualFuel) ? null : parsedActualFuel;
      const parsedMeterStart = meterStart === "" ? null : Number(meterStart);
      const parsedMeterEnd = meterEnd === "" ? null : Number(meterEnd);
      const meterStartNumber = meterStart === "" || Number.isNaN(parsedMeterStart) ? null : parsedMeterStart;
      const meterEndNumber = meterEnd === "" || Number.isNaN(parsedMeterEnd) ? null : parsedMeterEnd;
      const meterDelta = meterStartNumber !== null && meterEndNumber !== null ? Number((meterEndNumber - meterStartNumber).toFixed(1)) : null;
      const rawFuelVariance = actualFuelNumber !== null ? actualFuelNumber - requestedFuel : 0;
      const fuelVariance = Number(rawFuelVariance.toFixed(1));
      const hasFuelVariance = actualFuelNumber !== null && Math.abs(fuelVariance) > 0;
      let error = "";
      if (hasFuelOrder && actualFuel === "") {
        error = "Enter actual gallons pumped before handing this order to Front Desk.";
      } else if (hasFuelOrder && actualFuelNumber === null) {
        error = "Actual gallons must be a valid number.";
      } else if (hasFuelOrder && actualFuelNumber < 0) {
        error = "Actual gallons cannot be negative.";
      } else if (hasFuelOrder && meterStart !== "" && meterStartNumber === null) {
        error = "Meter start must be a valid number.";
      } else if (hasFuelOrder && meterEnd !== "" && meterEndNumber === null) {
        error = "Meter end must be a valid number.";
      } else if (meterDelta !== null && meterDelta < 0) {
        error = "Meter end cannot be less than meter start.";
      } else if (hasFuelVariance && !completionNotes.trim()) {
        error = "Add a note explaining why actual fuel differs from requested fuel.";
      }
      return {
        actualFuelNumber,
        meterStartNumber,
        meterEndNumber,
        meterDelta,
        fuelVariance,
        hasFuelVariance,
        error
      };
    }, [actualFuel, meterStart, meterEnd, completionNotes, order.fuelType, requestedFuel]);
    return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "mustang-red text-white p-6 rounded-t-xl" }, /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-bold" }, "Complete Service"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 opacity-90" }, customer?.tailNumber, " - ", customer?.pilotName || customer?.ownerName)), /* @__PURE__ */ React.createElement("div", { className: "p-6 space-y-4" }, order.fuelType && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Actual Fuel Pumped (", order.fuelType, ")"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        min: "0",
        step: "0.1",
        value: actualFuel,
        onChange: (e) => setActualFuel(e.target.value),
        className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500",
        placeholder: "Enter actual gallons"
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Meter Start"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        min: "0",
        step: "0.1",
        value: meterStart,
        onChange: (e) => setMeterStart(e.target.value),
        className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500",
        placeholder: "Optional start reading"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Meter End"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        min: "0",
        step: "0.1",
        value: meterEnd,
        onChange: (e) => setMeterEnd(e.target.value),
        className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500",
        placeholder: "Optional end reading"
      }
    ))), validation.meterDelta !== null && /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Meter Delta:"), " ", validation.meterDelta, " gal"), validation.hasFuelVariance && /* @__PURE__ */ React.createElement("div", { className: "mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-amber-900" }, "\u26A0\uFE0F Fuel variance warning"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-amber-800 mt-1" }, "Requested: ", requestedFuel, " gal \xB7 Actual: ", actualFuel, " gal \xB7 Difference: ", validation.fuelVariance > 0 ? "+" : "", validation.fuelVariance.toFixed(1), " gal"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-amber-700 mt-1" }, "Leave a note for Front Desk explaining why actual gallons differ."))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Notes for Front Desk"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: completionNotes,
        onChange: (e) => setCompletionNotes(e.target.value),
        className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500",
        rows: "4",
        placeholder: "Billing notes, issues, completed services, etc."
      }
    ), validation.hasFuelVariance && !completionNotes.trim() && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-amber-700 mt-2" }, "Add a note explaining the fuel variance before handing off to Front Desk.")), validation.error && /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" }, validation.error)), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 p-6 bg-gray-50 rounded-b-xl" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onClose,
        className: "flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-medium transition"
      },
      "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onConfirm(actualFuel, completionNotes, {
          meterStart: validation.meterStartNumber,
          meterEnd: validation.meterEndNumber
        }),
        disabled: Boolean(validation.error),
        className: `flex-1 px-6 py-3 rounded-lg font-bold transition ${validation.error ? "bg-orange-300 text-white cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700 text-white"}`
      },
      "Save & Notify Front Desk"
    ))));
  };
})();
