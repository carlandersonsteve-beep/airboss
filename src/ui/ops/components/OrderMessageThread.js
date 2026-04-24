window.AirBossComponents = window.AirBossComponents || {};

window.AirBossComponents.OrderMessageThread = function OrderMessageThread({
  order,
  customer,
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
  const { useMemo, useRef, useEffect, useLayoutEffect, useState } = React;
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const threadMessages = useMemo(() => {
    return (messages || [])
      .filter(message => message.orderId === order?.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, order?.id]);

  const threadTailLabel = useMemo(() => {
    const messageTail = threadMessages.find(message => message?.tailNumber)?.tailNumber;
    const titleTail = typeof title === 'string'
      ? (title.match(/N[0-9A-Z-]+/i)?.[0] || null)
      : null;
    return messageTail || customer?.tailNumber || order?.tailNumber || order?.aircraft || titleTail || 'Unknown Tail';
  }, [threadMessages, customer?.tailNumber, order?.tailNumber, order?.aircraft, title]);

  const handleMarkRead = () => {
    if (!order?.id || !onOpen) return;
    onOpen(order.id);
  };

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [order?.id, threadMessages.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const syncScroll = () => {
      container.scrollTop = container.scrollHeight;
    };
    const rafId = window.requestAnimationFrame(syncScroll);
    const timeoutId = window.setTimeout(syncScroll, 40);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [order?.id, threadMessages.length]);

  const handleSend = () => {
    if (!text.trim() || !order?.id) return;
    addMessage(text.trim(), order.id, customer?.tailNumber || order?.tailNumber || order?.aircraft || null);
    setText('');
    inputRef.current?.blur();
  };

  const containerClass = compact
    ? 'bg-gray-50 border border-gray-200 rounded-lg p-3 h-[320px] flex flex-col overflow-hidden'
    : 'bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 h-[360px] flex flex-col overflow-hidden';

  const titleColor = accent === 'blue' ? 'text-blue-900' : 'text-orange-900';
  const badgeColor = accent === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700';
  const resolvedThreadTail = threadTailLabel;
  const placeholder = senderRole === 'OFFICE'
    ? 'Message the line crew about this aircraft...'
    : 'Message front desk about this aircraft...';

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

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-3 pr-1"
        onClick={handleMarkRead}
      >
        {threadMessages.length === 0 && (
          <div className="text-sm text-gray-500 bg-white rounded-lg border border-dashed border-gray-300 px-3 py-3">
            {emptyLabel}
          </div>
        )}
        {threadMessages.map(message => {
          const isSender = message.sender === senderRole;
          const tailLabel = message.tailNumber || resolvedThreadTail;
          const speakerLabel = `${message.senderName || message.sender || 'Unknown'}, ${tailLabel}`;
          return (
            <div key={message.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
                message.sender === 'RAMP'
                  ? 'bg-blue-600 text-white rounded-tl-sm'
                  : 'bg-gray-700 text-white rounded-tr-sm'
              }`}>
                <div className="text-[11px] font-bold opacity-80 mb-0.5">{speakerLabel}</div>
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
          ref={inputRef}
          value={text}
          onFocus={handleMarkRead}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows="2"
          placeholder={placeholder}
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
