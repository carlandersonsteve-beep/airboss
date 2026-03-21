window.AirBossComponents = window.AirBossComponents || {};

window.AirBossComponents.OrderMessageThread = function OrderMessageThread({
  order,
  messages,
  addMessage,
  senderRole = 'RAMP',
  title = 'Order Thread',
  emptyLabel = 'No order messages yet.',
  accent = 'orange',
  compact = false,
  unreadCount = 0,
  onOpen,
}) {
  const { useMemo, useRef, useEffect, useState } = React;
  const [text, setText] = useState('');
  const endRef = useRef(null);

  const threadMessages = useMemo(() => {
    return (messages || [])
      .filter(message => message.orderId === order?.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, order?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    onOpen && onOpen(order?.id);
  }, [threadMessages.length, order?.id]);

  const handleSend = () => {
    if (!text.trim() || !order?.id) return;
    addMessage(text.trim(), order.id, order.tailNumber || order.aircraft || null);
    setText('');
  };

  const containerClass = compact
    ? 'bg-gray-50 border border-gray-200 rounded-lg p-3'
    : 'bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3';

  const titleColor = accent === 'blue' ? 'text-blue-900' : 'text-orange-900';
  const badgeColor = accent === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700';

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className={`text-sm font-bold ${titleColor}`}>{title}</div>
          <div className="text-xs text-gray-500">Live order communication between ramp and front desk</div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <div className="text-xs font-black px-2 py-1 rounded-full bg-red-600 text-white">
              {unreadCount} new
            </div>
          )}
          <div className={`text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}>
            {threadMessages.length} msg{threadMessages.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-2 mb-3 pr-1">
        {threadMessages.length === 0 && (
          <div className="text-sm text-gray-500 bg-white rounded-lg border border-dashed border-gray-300 px-3 py-3">
            {emptyLabel}
          </div>
        )}
        {threadMessages.map(message => {
          const isSender = message.sender === senderRole;
          return (
            <div key={message.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
                message.sender === 'RAMP'
                  ? 'bg-blue-600 text-white rounded-tl-sm'
                  : 'bg-gray-700 text-white rounded-tr-sm'
              }`}>
                <div className="text-[11px] font-bold opacity-80 mb-0.5">{message.sender}</div>
                <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>
                <div className="text-[11px] opacity-60 mt-1 text-right">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows="2"
          placeholder="Message front desk about this aircraft..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
        />
        <button
          onClick={handleSend}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
        >
          Send
        </button>
      </div>
    </div>
  );
};
