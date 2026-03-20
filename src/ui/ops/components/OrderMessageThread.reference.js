        function OrderMessageThread({ order, rampNote, setRampNote }) {
            return (
                <div className="mt-3 border-t pt-3">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">📝 Notes for Front Desk</div>
                    <div className="text-xs text-gray-400 italic mb-2">Typed here automatically forwards when you complete the order.</div>
                    <textarea
                        value={rampNote}
                        onChange={e => setRampNote(e.target.value)}
                        placeholder="e.g. Pilot requested receipt, left main low on oil, crew car out front..."
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                        rows="2"
                    />
                </div>
            );
        }

        function ChatView({ messages, orders, addMessage, onOpen }) {
            const [text, setText] = useState('');
            const [sender, setSender] = useState('RAMP');
            const endRef = React.useRef(null);

            // General chat = messages with no orderId
            const generalMsgs = messages.filter(m => !m.orderId)
                .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

            useEffect(() => {
                onOpen && onOpen();
                endRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, []);

            useEffect(() => {
                endRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, [generalMsgs.length]);

            const handleSend = () => {
                if (!text.trim()) return;
                addMessage(text.trim(), sender, null, null);
                setText('');
            };

            return (
                <div className="flex flex-col" style={{height: 'calc(100vh - 160px)'}}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">💬 Ramp Chat</h2>
                        <div className="text-sm text-gray-500">General team communication — no radios needed</div>
                    </div>
                    
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl p-4 mb-4 space-y-2 border border-gray-200">
                        {generalMsgs.length === 0 && (
                            <div className="text-center text-gray-400 py-16">
                                <div className="text-4xl mb-3">💬</div>
                                <div className="font-medium">No messages yet</div>
                                <div className="text-sm mt-1">Use this for general ramp-to-office communication</div>
                            </div>
                        )}
                        {generalMsgs.map(m => (
                            <div key={m.id} className={`flex ${m.sender === 'OFFICE' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs rounded-2xl px-4 py-2 ${
                                    m.sender === 'RAMP' 
                                    ? 'bg-blue-600 text-white rounded-tl-sm' 
                                    : 'bg-gray-700 text-white rounded-tr-sm'
                                }`}>
                                    <div className="text-xs font-bold opacity-75 mb-0.5">{m.sender}</div>
                                    <div className="text-sm">{m.text}</div>
                                    <div className="text-xs opacity-50 mt-1 text-right">
                                        {new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={endRef} />
                    </div>

                    {/* Input */}
                    <div className="flex gap-3 items-center bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                        <select value={sender} onChange={e=>setSender(e.target.value)} 
                            className="text-sm font-bold border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-400">
                            <option value="RAMP">⚙️ Ramp</option>
                            <option value="OFFICE">💼 Office</option>
                        </select>
                        <input
                            value={text}
                            onChange={e=>setText(e.target.value)}
                            onKeyDown={e=>e.key==='Enter'&&handleSend()}
                            placeholder="Type a message and press Enter..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                        />
                        <button onClick={handleSend}
                            className="mustang-red mustang-red-hover text-white px-5 py-2 rounded-lg font-bold transition">
                            Send
                        </button>
                    </div>
                </div>
            );
        }
        // === MESSAGING FEATURE END ===
