window.AirBossComponents = window.AirBossComponents || {};

window.AirBossComponents.OrderMessageThread = function OrderMessageThread({ order, rampNote, setRampNote }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Ramp Notes for Front Desk
      </label>
      <textarea
        value={rampNote}
        onChange={(e) => setRampNote(e.target.value)}
        placeholder="Add notes for front desk (billing, issues, special handling...)"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
        rows="3"
      />
    </div>
  );
};
