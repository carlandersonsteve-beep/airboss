(() => {
  const { useState, useEffect } = React;
  const syncAdapters = {
    async syncToSheets() {
      return { ok: true, mode: "disabled" };
    },
    async backupJsonPayload() {
      return { ok: true, mode: "disabled" };
    }
  };
  const Storage = {
    get: (key) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        return null;
      }
    },
    set: (key, value) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    remove: (key) => {
      localStorage.removeItem(key);
    }
  };
  const API_BASE_URL = `${window.location.protocol === "file:" ? "http://localhost:8787" : window.location.origin}`;
  const SESSION_KEY = "groundcore_session";
  const VIEW_KEY = "groundcore_view";
  const isFileProtocol = window.location.protocol === "file:";
  function isLocalDevEnvironment() {
    const host = window.location.hostname;
    return isFileProtocol || host === "localhost" || host === "127.0.0.1";
  }
  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
        if (window.caches?.keys) {
          const keys = await window.caches.keys();
          await Promise.all(keys.map((key) => window.caches.delete(key)));
        }
        console.log("Local dev: cleared old service workers and caches");
      } catch (error) {
        console.log("Service worker cleanup failed", error.message);
      }
    });
  }
  const api = {
    async request(path, options = {}) {
      const mergedHeaders = {
        "Content-Type": "application/json",
        ...options.headers || {}
      };
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: mergedHeaders
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `Request failed: ${response.status}`);
      }
      return payload;
    },
    bootstrap() {
      return this.request("/bootstrap");
    },
    config() {
      return this.request("/config");
    },
    createCustomer(customer) {
      return this.request("/customers", {
        method: "POST",
        body: JSON.stringify(customer)
      });
    },
    createOrder(order) {
      return this.request("/orders", {
        method: "POST",
        body: JSON.stringify(order)
      });
    },
    postOrderMessage(orderId, payload) {
      return this.request(`/orders/${orderId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    postGeneralMessage(payload) {
      return this.request("/messages", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    createAlert(alert2) {
      return this.request("/alerts", {
        method: "POST",
        body: JSON.stringify(alert2)
      });
    },
    resolveAlert(alertId) {
      return this.request(`/alerts/${alertId}/resolve`, {
        method: "POST"
      });
    },
    deleteAlert(alertId) {
      return this.request(`/alerts/${alertId}`, {
        method: "DELETE"
      });
    },
    updateOrder(orderId, patch) {
      return this.request(`/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
    },
    markOrderThreadRead(orderId, role, lastReadAt = Date.now()) {
      return this.request(`/orders/${orderId}/read`, {
        method: "POST",
        body: JSON.stringify({ role, lastReadAt })
      });
    },
    login(username, password) {
      return this.request("/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
    },
    changePassword(username, currentPassword, newPassword) {
      return this.request("/change-password", {
        method: "POST",
        body: JSON.stringify({ username, currentPassword, newPassword })
      });
    },
    logout() {
      return this.request("/logout", {
        method: "POST"
      });
    }
  };
  const runtime = window.AirBossRuntime;
  const getExtractedComponent = (name) => {
    const component = window.AirBossComponents && window.AirBossComponents[name];
    if (!component) {
      throw new Error(`Missing extracted component: ${name}`);
    }
    return component;
  };
  const normalizeOrderStatus = (status) => runtime.normalizeOrderStatus(status);
  const isPendingStatus = (status) => normalizeOrderStatus(status) === "pending";
  const isInProgressStatus = (status) => normalizeOrderStatus(status) === "in_progress";
  const isReadyStatus = (status) => normalizeOrderStatus(status) === "ready_for_front_desk";
  const isClosedStatus = (status) => normalizeOrderStatus(status) === "closed";
  const getTodayOrders = (orders, now = /* @__PURE__ */ new Date()) => runtime.orderSelectors.today(orders, now);
  const getActiveRampOrders = (orders, now = /* @__PURE__ */ new Date()) => runtime.orderSelectors.activeRamp(orders, now);
  const getReadyForFrontDeskOrders = (orders) => runtime.orderSelectors.readyForFrontDesk(orders);
  const getGeneralChatMessages = (messages) => (messages || []).filter((message) => !message.orderId);
  const getClosedOrders = (orders) => runtime.orderSelectors.closed(orders);
  const getWeekOrders = (orders, now = /* @__PURE__ */ new Date()) => runtime.orderSelectors.thisWeek(orders, now);
  const getFuelTotal = (orders, fuelType) => fuelType === "JET-A" ? runtime.orderSelectors.jetATotal(orders) : runtime.orderSelectors.avgasTotal(orders);
  const buildExportSnapshot = ({ customers, orders, tickets, messages }) => ({
    customers,
    orders,
    tickets,
    messages,
    exportDate: (/* @__PURE__ */ new Date()).toISOString(),
    version: "1.0"
  });
  function FBOSystem() {
    const [session, setSession] = useState(() => Storage.get(SESSION_KEY));
    const [authError, setAuthError] = useState("");
    const [loginForm, setLoginForm] = useState({ username: "", password: "" });
    const [passwordSetup, setPasswordSetup] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [showPasswordSetup, setShowPasswordSetup] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
    const getDefaultViewForRole = (role) => {
      if (role === "ADMIN" || role === "OFFICE") return "office";
      if (role === "RAMP") return "ramp";
      if (role === "KIOSK") return "ramp";
      return "ramp";
    };
    const [view, setView] = useState(() => {
      const savedView = Storage.get(VIEW_KEY);
      return typeof savedView === "string" && savedView ? savedView : "ramp";
    });
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showNewCustomer, setShowNewCustomer] = useState(false);
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [showQuickFuel, setShowQuickFuel] = useState(false);
    const [messages, setMessages] = useState([]);
    const [lastReadChat, setLastReadChat] = useState(() => Storage.get("fbo_last_read_chat") || 0);
    const [orderThreadReadState, setOrderThreadReadState] = useState(() => Storage.get("fbo_order_thread_reads") || { RAMP: {}, OFFICE: {} });
    const [backendMode, setBackendMode] = useState("unknown");
    const [appMode, setAppMode] = useState(isLocalDevEnvironment() ? "local-dev" : "shared");
    const [backendWarning, setBackendWarning] = useState("");
    const pendingWritesRef = React.useRef(0);
    const markBackendWriteSuccess = () => {
      setBackendMode((current) => current === "local" ? "local" : "postgres");
      setBackendWarning("");
    };
    const currentRole = session?.role || "OFFICE";
    const horseAudioRef = React.useRef(null);
    const horseAudioUnlockedRef = React.useRef(false);
    useEffect(() => {
      const audio = new Audio("assets/horse.mp3");
      audio.preload = "auto";
      horseAudioRef.current = audio;
      const unlockHorseAudio = () => {
        const unlockedAudio = horseAudioRef.current;
        if (!unlockedAudio || horseAudioUnlockedRef.current) return;
        horseAudioUnlockedRef.current = true;
        const originalTime = unlockedAudio.currentTime || 0;
        unlockedAudio.muted = true;
        const unlockPromise = unlockedAudio.play();
        if (unlockPromise && typeof unlockPromise.then === "function") {
          unlockPromise.then(() => {
            unlockedAudio.pause();
            unlockedAudio.currentTime = originalTime;
            unlockedAudio.muted = false;
          }).catch(() => {
            horseAudioUnlockedRef.current = false;
          });
        } else {
          unlockedAudio.pause();
          unlockedAudio.currentTime = originalTime;
          unlockedAudio.muted = false;
        }
      };
      const unlockEvents = ["click", "keydown", "touchstart"];
      unlockEvents.forEach((eventName) => {
        window.addEventListener(eventName, unlockHorseAudio, { passive: true });
      });
      return () => {
        unlockEvents.forEach((eventName) => {
          window.removeEventListener(eventName, unlockHorseAudio);
        });
        if (horseAudioRef.current) {
          horseAudioRef.current.pause();
          horseAudioRef.current = null;
        }
      };
    }, []);
    const playHorse = () => {
      try {
        const audio = horseAudioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch((e) => console.log("Horse failed:", e));
        }
      } catch (e) {
        console.log("Horse failed:", e);
      }
    };
    const prevGeneralChatCountRef = React.useRef(null);
    const prevOrderThreadCountRef = React.useRef(null);
    useEffect(() => {
      const generalMessages = (messages || []).filter((message) => !message.orderId);
      if (prevGeneralChatCountRef.current === null) {
        prevGeneralChatCountRef.current = generalMessages.length;
        return;
      }
      const incomingGeneralMessages = generalMessages.slice(prevGeneralChatCountRef.current);
      const hasNewGeneralFromOther = incomingGeneralMessages.some((message) => message.sender !== currentRole);
      if (hasNewGeneralFromOther) playHorse();
      prevGeneralChatCountRef.current = generalMessages.length;
    }, [messages, currentRole]);
    useEffect(() => {
      const orderThreadMessages = (messages || []).filter((message) => Boolean(message.orderId));
      if (prevOrderThreadCountRef.current === null) {
        prevOrderThreadCountRef.current = orderThreadMessages.length;
        return;
      }
      const incomingOrderThreadMessages = orderThreadMessages.slice(prevOrderThreadCountRef.current);
      const hasNewOrderThreadFromOther = incomingOrderThreadMessages.some((message) => message.sender !== currentRole);
      if (hasNewOrderThreadFromOther) playHorse();
      prevOrderThreadCountRef.current = orderThreadMessages.length;
    }, [messages, currentRole]);
    useEffect(() => {
      if (!isLocalDevEnvironment()) {
        return;
      }
      const savedCustomers = Storage.get("fbo_customers") || [];
      const savedOrders = Storage.get("fbo_orders") || [];
      const savedTickets = Storage.get("fbo_tickets") || [];
      const savedMessages = Storage.get("fbo_messages") || [];
      const savedReads = Storage.get("fbo_order_thread_reads") || { RAMP: {}, OFFICE: {} };
      setCustomers(savedCustomers);
      setOrders(savedOrders);
      setTickets(savedTickets);
      setMessages(savedMessages);
      setOrderThreadReadState(savedReads);
    }, []);
    useEffect(() => {
      let cancelled = false;
      const loadConfig = async () => {
        try {
          const config = await api.config();
          if (cancelled) return;
          setAppMode(config.appMode || (isLocalDevEnvironment() ? "local-dev" : "shared"));
        } catch (error) {
          if (cancelled) return;
          setAppMode(isLocalDevEnvironment() ? "local-dev" : "shared");
        }
      };
      const loadBootstrap = async () => {
        if (!session?.username) {
          setBackendMode("signin-required");
          setBackendWarning("");
          return;
        }
        if (pendingWritesRef.current > 0) return;
        try {
          const data = await api.bootstrap();
          if (cancelled) return;
          setBackendMode(data.mode || "postgres");
          setBackendWarning("");
          setCustomers(data.customers || []);
          setOrders(data.orders || []);
          setTickets(data.alerts || []);
          setMessages(data.messages || []);
          setOrderThreadReadState(data.threadReads || { RAMP: {}, OFFICE: {} });
        } catch (error) {
          if (cancelled) return;
          console.log("Flightline OS bootstrap unavailable", error.message);
          if (appMode === "local-dev") {
            setBackendMode("local-fallback");
            setBackendWarning("Backend unavailable \u2014 local cache is active for development only.");
          } else {
            setBackendMode("shared-unavailable");
            setBackendWarning("Shared backend unavailable \u2014 data may be stale and new writes should not be trusted until connectivity is restored.");
          }
        }
      };
      loadConfig();
      loadBootstrap();
      const intervalId = session?.username ? window.setInterval(loadBootstrap, 5e3) : null;
      return () => {
        cancelled = true;
        if (intervalId) window.clearInterval(intervalId);
      };
    }, [session?.username, session?.mustChangePassword, appMode]);
    useEffect(() => {
      if (appMode !== "local-dev") return;
      Storage.set("fbo_customers", customers);
    }, [customers, appMode]);
    useEffect(() => {
      if (appMode !== "local-dev") return;
      Storage.set("fbo_orders", orders);
    }, [orders, appMode]);
    useEffect(() => {
      if (appMode !== "local-dev") return;
      Storage.set("fbo_tickets", tickets);
    }, [tickets, appMode]);
    useEffect(() => {
      if (appMode !== "local-dev") return;
      Storage.set("fbo_messages", messages);
    }, [messages, appMode]);
    useEffect(() => {
      if (appMode !== "local-dev") return;
      Storage.set("fbo_order_thread_reads", orderThreadReadState);
    }, [orderThreadReadState, appMode]);
    useEffect(() => {
      if (!view) return;
      Storage.set(VIEW_KEY, view);
    }, [view]);
    useEffect(() => {
      if (!session?.role) return;
      if (!roleAllows(session.role, view)) {
        setView(getDefaultViewForRole(session.role));
      }
    }, [session?.role, view]);
    const createMessageRecord = (text, sender, orderId = null, tailNumber = null) => runtime.messageService.createMessagePayload({
      text,
      senderRole: sender,
      senderName: session?.displayName || session?.username || sender,
      orderId,
      tailNumber
    });
    const appendMessageRecord = (messageRecord) => {
      setMessages((prev) => [...prev, messageRecord]);
      return messageRecord;
    };
    const addMessage = async (text, sender, orderId = null, tailNumber = null) => {
      const messageRecord = appendMessageRecord(createMessageRecord(text, sender, orderId, tailNumber));
      if (orderId) {
        try {
          const response = await api.postOrderMessage(orderId, {
            ...messageRecord,
            senderRole: sender
          });
          setMessages((prev) => prev.map((m) => m.id === messageRecord.id ? response.item : m));
          markBackendWriteSuccess();
        } catch (error) {
          console.log("Order message backend sync failed", error.message);
          setBackendWarning(appMode === "local-dev" ? "Order message sync failed \u2014 kept locally for development only." : "Order message sync failed \u2014 shared backend did not confirm persistence.");
        }
      } else {
        try {
          const response = await api.postGeneralMessage({
            ...messageRecord,
            senderRole: sender
          });
          setMessages((prev) => prev.map((m) => m.id === messageRecord.id ? response.item : m));
          markBackendWriteSuccess();
        } catch (error) {
          console.log("General message backend sync failed", error.message);
          setBackendWarning(appMode === "local-dev" ? "General chat sync failed \u2014 kept locally for development only." : "General chat sync failed \u2014 shared backend did not confirm persistence.");
        }
      }
      return messageRecord;
    };
    const markChatRead = () => {
      const now = Date.now();
      setLastReadChat(now);
      Storage.set("fbo_last_read_chat", now);
    };
    const handleLogin = async () => {
      setAuthError("");
      try {
        const response = await api.login(loginForm.username.trim(), loginForm.password);
        const nextSession = { ...response.user };
        delete nextSession.token;
        setSession(nextSession);
        Storage.set(SESSION_KEY, nextSession);
        if (response.user.mustChangePassword) return;
        if (response.user.role === "ADMIN") setView("office");
        if (response.user.role === "RAMP") setView("ramp");
        if (response.user.role === "OFFICE") setView("office");
        if (response.user.role === "KIOSK") window.location.href = "/kiosk";
      } catch (error) {
        setAuthError(error.message || "Login failed");
      }
    };
    const handlePasswordChange = async () => {
      setAuthError("");
      const currentPassword = passwordSetup.currentPassword || loginForm.password;
      if (!currentPassword) {
        setAuthError("Enter your current temporary password.");
        return;
      }
      if (!passwordSetup.newPassword || passwordSetup.newPassword.length < 12) {
        setAuthError("New password must be at least 12 characters.");
        return;
      }
      if (passwordSetup.newPassword !== passwordSetup.confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
      try {
        const response = await api.changePassword(loginForm.username.trim(), currentPassword, passwordSetup.newPassword);
        const nextSession = { ...response.user };
        delete nextSession.token;
        setSession(nextSession);
        Storage.set(SESSION_KEY, nextSession);
        setLoginForm((prev) => ({ ...prev, password: passwordSetup.newPassword }));
        setPasswordSetup({ currentPassword: "", newPassword: "", confirmPassword: "" });
        // Start from a clean authenticated bootstrap after rotating a temporary
        // password. This avoids leaving the operator in the pre-rotation state.
        window.location.reload();
        return;
      } catch (error) {
        setAuthError(error.message || "Password update failed");
      }
    };
    const handleLogout = async () => {
      try {
        if (session?.username) {
          await api.logout();
        }
      } catch (error) {
        console.log("Logout request failed", error.message);
      } finally {
        setSession(null);
        Storage.remove(SESSION_KEY);
        Storage.remove(VIEW_KEY);
      }
    };
    const markOrderThreadRead = async (role, orderId) => {
      if (!role || !orderId) return;
      const latestVisibleMessageAt = (messages || []).reduce((max, message) => {
        if (message.orderId !== orderId) return max;
        if (message.sender === role) return max;
        const createdAt = new Date(message.createdAt).getTime();
        return Number.isFinite(createdAt) ? Math.max(max, createdAt) : max;
      }, 0);
      const now = Math.max(Date.now(), latestVisibleMessageAt);
      setOrderThreadReadState((prev) => ({
        ...prev,
        [role]: {
          ...prev[role] || {},
          [orderId]: now
        }
      }));
      try {
        await api.markOrderThreadRead(orderId, role, now);
        markBackendWriteSuccess();
      } catch (error) {
        console.log("Thread read sync failed", error.message);
        if (appMode !== "local-dev") {
          setBackendWarning("Thread read sync failed \u2014 unread state may be stale until shared connectivity is restored.");
        }
      }
    };
    const getUnreadOrderThreadCount = (role, orderId) => {
      if (!role || !orderId) return 0;
      const lastReadAt = orderThreadReadState[role] && orderThreadReadState[role][orderId] || 0;
      return (messages || []).filter((message) => message.orderId === orderId && message.sender !== role && new Date(message.createdAt).getTime() > lastReadAt).length;
    };
    const roleAllows = (role, targetView) => {
      if (role === "ADMIN" || role === "STEVE") return ["ramp", "office", "chat", "calendar"].includes(targetView);
      if (role === "RAMP") return ["ramp", "chat"].includes(targetView);
      if (role === "OFFICE") return ["office", "chat", "calendar"].includes(targetView);
      if (role === "KIOSK") return false;
      return false;
    };
    const createCustomerRecord = (customer) => runtime.customerService.createCustomerPayload(customer);
    const addCustomer = async (customer) => {
      const newCustomer = createCustomerRecord(customer);
      setCustomers((prev) => [...prev, newCustomer]);
      syncAdapters.syncToSheets("addCustomer", { customer: newCustomer });
      try {
        const response = await api.createCustomer(newCustomer);
        setCustomers((prev) => prev.map((c) => c.id === newCustomer.id ? response.item : c));
        markBackendWriteSuccess();
      } catch (error) {
        console.log("Customer backend sync failed", error.message);
        setBackendWarning(appMode === "local-dev" ? "Customer save failed to sync \u2014 kept locally for development only." : "Customer save failed \u2014 shared backend did not confirm persistence.");
      }
      return newCustomer;
    };
    const updateCustomer = (id, updates) => {
      setCustomers((prev) => prev.map((c) => c.id === id ? runtime.customerService.updateCustomer(c, updates) : c));
    };
    const createOrderRecord = (order) => runtime.orderService.createOrderPayload(order);
    const persistOrderPatch = (orderId, patch) => {
      setOrders((currentOrders) => currentOrders.map((o) => o.id === orderId ? { ...o, ...patch } : o));
    };
    const markPreDepartureSent = (orderId) => {
      persistOrderPatch(orderId, { preDepartureSent: true });
    };
    const backupOrderUpdate = (updatedOrder) => {
      syncAdapters.backupJsonPayload("order-update", { order: updatedOrder });
    };
    const transitionOrder = async (orderId, transitionFn) => {
      const currentOrder = orders.find((o) => o.id === orderId);
      if (!currentOrder) {
        return null;
      }
      const updatedOrder = transitionFn(currentOrder);
      backupOrderUpdate(updatedOrder);
      pendingWritesRef.current += 1;
      setOrders((currentOrders) => currentOrders.map((o) => o.id === orderId ? updatedOrder : o));
      try {
        const response = await api.updateOrder(orderId, updatedOrder);
        setOrders((prev) => prev.map((o) => o.id === orderId ? response.item : o));
        markBackendWriteSuccess();
        return response.item;
      } catch (error) {
        console.log("Order backend sync failed", error.message, error.details || error.detail || error);
        setBackendWarning(appMode === "local-dev" ? "Order sync failed \u2014 local development state kept." : `Order sync failed \u2014 ${error.detail || error.message || "shared backend did not confirm persistence."}`);
        return updatedOrder;
      } finally {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
      }
    };
    const startOrderService = (orderId) => {
      return transitionOrder(orderId, (order) => runtime.orderService.startService(order));
    };
    const markOrderReadyForFrontDesk = (orderId, extraFields = {}) => {
      return transitionOrder(orderId, (order) => runtime.orderService.completeService(order, extraFields));
    };
    const closeOrder = (orderId) => {
      return transitionOrder(orderId, (order) => runtime.orderService.closeOrder(order));
    };
    const addOrder = async (order) => {
      const newOrder = createOrderRecord(order);
      setOrders((prev) => [...prev, newOrder]);
      setShowNewOrder(false);
      setSelectedCustomer(null);
      syncAdapters.syncToSheets("addOrder", { order: newOrder });
      try {
        const response = await api.createOrder(newOrder);
        setOrders((prev) => prev.map((o) => o.id === newOrder.id ? response.item : o));
        markBackendWriteSuccess();
      } catch (error) {
        console.log("Order backend sync failed", error.message);
        setBackendWarning(appMode === "local-dev" ? "Order creation failed to sync \u2014 kept locally for development only." : "Order creation failed \u2014 shared backend did not confirm persistence.");
      }
    };
    const updateOrderStatus = (orderId, status, extraFields = {}) => {
      transitionOrder(orderId, (order) => runtime.orderService.transition(order, status, extraFields));
    };
    const recallOrder = (orderId) => {
      transitionOrder(orderId, (order) => runtime.orderService.recallOrder(order));
    };
    const createTicketRecord = (ticket) => runtime.ticketService.createTicketPayload(ticket);
    const addTicket = async (ticket) => {
      const newTicket = createTicketRecord(ticket);
      setTickets((prev) => [...prev, newTicket]);
      try {
        const response = await api.createAlert(newTicket);
        setTickets((prev) => prev.map((t) => t.id === newTicket.id ? response.item : t));
        markBackendWriteSuccess();
      } catch (error) {
        console.log("Alert backend sync failed", error.message);
        setBackendWarning(appMode === "local-dev" ? "Alert sync failed \u2014 kept locally for development only." : "Alert sync failed \u2014 shared backend did not confirm persistence.");
      }
      return newTicket;
    };
    const resolveTicket = async (ticketId) => {
      setTickets((prev) => prev.map((t) => t.id === ticketId ? runtime.ticketService.resolveTicket(t) : t));
      try {
        const response = await api.resolveAlert(ticketId);
        setTickets((prev) => prev.map((t) => t.id === ticketId ? response.item : t));
        markBackendWriteSuccess();
      } catch (error) {
        console.log("Alert resolve sync failed", error.message);
        if (appMode !== "local-dev") {
          setBackendWarning("Alert resolve sync failed \u2014 shared backend may still show this alert as pending.");
        }
      }
    };
    const deleteTicket = async (ticketId) => {
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      try {
        await api.deleteAlert(ticketId);
        markBackendWriteSuccess();
      } catch (error) {
        console.log("Alert delete sync failed after local removal", error.message);
        if (appMode !== "local-dev") {
          setBackendWarning("Alert delete sync failed \u2014 shared backend may still contain this alert.");
        }
      }
    };
    const exportData = () => {
      const data = buildExportSnapshot({ customers, orders, tickets, messages });
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mustang-aviation-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      alert("Data exported successfully!");
    };
    const importData = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedData = JSON.parse(event.target.result);
            if (confirm("This will replace all current data. Are you sure?")) {
              setCustomers(importedData.customers || []);
              setOrders(importedData.orders || []);
              setTickets(importedData.tickets || []);
              setMessages(importedData.messages || []);
              alert("Data imported successfully!");
            }
          } catch (error) {
            alert("Error importing data: Invalid file format");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    };
    const generateCompletionEmail = (order, customer) => {
      const subject = `Service Complete - ${customer?.tailNumber || order.tailNumber} - Mustang Aviation`;
      const actualFuelGallons = order.fuelActualGallons ?? order.fuelRequestedGallons ?? order.fuelQuantity ?? 0;
      const requestedFuelGallons = order.fuelRequestedGallons ?? order.fuelQuantity ?? 0;
      const services = [];
      if (order.fuelType) {
        services.push(`${actualFuelGallons} gallons of ${order.fuelType}`);
        if (Number(actualFuelGallons) !== Number(requestedFuelGallons)) {
          services.push(`Requested fuel was ${requestedFuelGallons} gallons`);
        }
      }
      if (order.hangarOvernight === "yes") {
        services.push("Hangar overnight - secured indoors");
      } else if (order.hangarOvernight === "no") {
        services.push("Outside tie-down parking");
      }
      if (order.services && order.services.length > 0) {
        const serviceLabels = {
          "lav": "Lavatory Service",
          "gpu": "GPU (Ground Power)",
          "oxygen": "Oxygen Service",
          "deice": "De-icing",
          "tiedown": "Tiedown",
          "crew_car": "Crew Car",
          "coffee": "Coffee",
          "ice": "Ice"
        };
        order.services.forEach((s) => {
          services.push(serviceLabels[s] || s);
        });
      }
      const departureDateLabel = (() => {
        if (!order.departureDate) return null;
        const parsed = new Date(order.departureDate);
        if (Number.isNaN(parsed.getTime())) return String(order.departureDate);
        return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      })();
      const departureTimeLabel = (() => {
        if (!order.departureTime) return null;
        const [rawHour, minute] = String(order.departureTime).split(":");
        const hour = Number(rawHour);
        if (!Number.isFinite(hour) || minute === void 0) return String(order.departureTime);
        const ampm = hour >= 12 ? "PM" : "AM";
        return `${hour % 12 || 12}:${minute} ${ampm}`;
      })();
      const departureLine = departureDateLabel ? `Scheduled departure: ${departureDateLabel}${departureTimeLabel ? ` at ${departureTimeLabel}` : ""}` : null;
      const body = `Dear ${customer.pilotName || customer.ownerName || "Valued Customer"},

Thank you for choosing Mustang Aviation. Your aircraft ${customer.tailNumber} (${customer.aircraftType}) has been serviced and is ready.

SERVICES PROVIDED:
${services.length > 0 ? services.map((s) => "   - " + s).join("\n") : "   - No additional services recorded"}
${departureLine ? `

${departureLine}` : ""}
${order.completionNotes ? `

Service notes: ${order.completionNotes}` : ""}

We appreciate your business and hope you had a great stop in Pierre. If you need anything else before departure, just reply to this email or give us a call.

If you have a moment, we would appreciate an honest Google review about your experience today. It helps other crews find us and gives us useful feedback on what we are doing well and where we need to improve.

Google review link:
<https://www.google.com/search?hl=en-US&gl=us&q=Mustang+Aviation,+4000+Airport+Rd,+Pierre,+SD+57501&ludocid=2121711043370683222&lsig=AB86z5UAUrJ8GXbUVV9_905NtLFP&source=g.page.m.ia._&laa=nmx-review-solicitation-ia2#lrd=0x8780129af1c25acb:0x1d71d4f3e0220b56,1,,,,>

info@mustangaviation.aero
www.mustangaviation.aero

Safe travels,

Mustang Aviation
Pierre Regional Airport (KPIR)
Phone: 605.224.9000  |  Toll Free: 1.800.456.1712

"Where the Midwest Meets the Wild West"`;
      const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, "_self");
    };
    if (!session) {
      return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center px-4 py-10" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-center mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "text-4xl font-black mustang-red-text mb-2" }, "Flightline OS"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Mustang Aviation operations access"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 mt-2" }, "Sign in to the right surface and get straight to work.")), backendWarning && /* @__PURE__ */ React.createElement("div", { className: `mb-4 px-4 py-3 rounded-lg border text-sm font-medium ${appMode === "local-dev" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-red-50 border-red-200 text-red-700"}` }, backendWarning), authError && /* @__PURE__ */ React.createElement("div", { className: "mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium" }, authError), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Username"), /* @__PURE__ */ React.createElement(
        "input",
        {
          value: loginForm.username,
          onChange: (e) => setLoginForm({ ...loginForm, username: e.target.value }),
          className: "w-full px-4 py-3 border border-gray-300 rounded-lg",
          placeholder: "Enter assigned username",
          autoComplete: "username"
        }
      )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Password"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "password",
          value: loginForm.password,
          onChange: (e) => setLoginForm({ ...loginForm, password: e.target.value }),
          onKeyDown: (e) => e.key === "Enter" && handleLogin(),
          className: "w-full px-4 py-3 border border-gray-300 rounded-lg",
          placeholder: "Enter password",
          autoComplete: "current-password"
        }
      )), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleLogin,
          className: "w-full mustang-red mustang-red-hover text-white px-6 py-3 rounded-lg font-bold"
        },
        "Sign In"
      ), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold" }, "Pilot-safe access note"), /* @__PURE__ */ React.createElement("div", { className: "mt-1" }, "Flightline OS no longer displays seeded credentials on this screen."), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-amber-800" }, "Operators should distribute assigned usernames and temporary passwords out-of-band, then require each user to complete the first-login password change flow before normal use.")))));
    }
    if (session.mustChangePassword) {
      return /* @__PURE__ */ React.createElement(
        "div",
        { className: "min-h-screen flex items-center justify-center px-4 py-10" },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-200" },
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "text-center mb-6" },
            /* @__PURE__ */ React.createElement("div", { className: "text-3xl font-black mustang-red-text mb-2" }, "Set Your Password"),
            /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Welcome, ", session.displayName || session.username, ". Your temporary password must be replaced before Flightline OS will unlock the rest of the ops surface.")
          ),
          authError && /* @__PURE__ */ React.createElement("div", { className: "mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium" }, authError),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "space-y-4" },
            /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900" }, "Use a private password that is not shared with other team members. After this step, the temporary seeded password should be treated as expired."),
            /* @__PURE__ */ React.createElement(
              "div",
              null,
              /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Current Temporary Password"),
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "relative" },
                /* @__PURE__ */ React.createElement("input", {
                  type: showPasswordSetup.currentPassword ? "text" : "password",
                  value: passwordSetup.currentPassword,
                  onChange: (e) => setPasswordSetup({ ...passwordSetup, currentPassword: e.target.value }),
                  className: "w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg",
                  placeholder: "Enter current temporary password",
                  autoComplete: "current-password"
                }),
                /* @__PURE__ */ React.createElement("button", {
                  type: "button",
                  onClick: () => setShowPasswordSetup((prev) => ({ ...prev, currentPassword: !prev.currentPassword })),
                  className: "absolute inset-y-0 right-0 px-4 text-sm font-semibold text-gray-500 hover:text-gray-800"
                }, showPasswordSetup.currentPassword ? "Hide" : "Show")
              )
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              null,
              /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "New Password"),
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "relative" },
                /* @__PURE__ */ React.createElement("input", {
                  type: showPasswordSetup.newPassword ? "text" : "password",
                  value: passwordSetup.newPassword,
                  onChange: (e) => setPasswordSetup({ ...passwordSetup, newPassword: e.target.value }),
                  className: "w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg",
                  placeholder: "At least 12 characters",
                  autoComplete: "new-password"
                }),
                /* @__PURE__ */ React.createElement("button", {
                  type: "button",
                  onClick: () => setShowPasswordSetup((prev) => ({ ...prev, newPassword: !prev.newPassword })),
                  className: "absolute inset-y-0 right-0 px-4 text-sm font-semibold text-gray-500 hover:text-gray-800"
                }, showPasswordSetup.newPassword ? "Hide" : "Show")
              )
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              null,
              /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Confirm New Password"),
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "relative" },
                /* @__PURE__ */ React.createElement("input", {
                  type: showPasswordSetup.confirmPassword ? "text" : "password",
                  value: passwordSetup.confirmPassword,
                  onChange: (e) => setPasswordSetup({ ...passwordSetup, confirmPassword: e.target.value }),
                  onKeyDown: (e) => e.key === "Enter" && handlePasswordChange(),
                  className: "w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg",
                  placeholder: "Repeat new password",
                  autoComplete: "new-password"
                }),
                /* @__PURE__ */ React.createElement("button", {
                  type: "button",
                  onClick: () => setShowPasswordSetup((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword })),
                  className: "absolute inset-y-0 right-0 px-4 text-sm font-semibold text-gray-500 hover:text-gray-800"
                }, showPasswordSetup.confirmPassword ? "Hide" : "Show")
              )
            ),
            /* @__PURE__ */ React.createElement("button", {
              onClick: handlePasswordChange,
              className: "w-full mustang-red mustang-red-hover text-white px-6 py-3 rounded-lg font-bold"
            }, "Save Password & Continue")
          )
        )
      );
    }
    const frontDeskReadyCount = getReadyForFrontDeskOrders(orders).length;
    const generalChatMessages = getGeneralChatMessages(messages);
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen w-full" }, /* @__PURE__ */ React.createElement("header", { className: "wood-header text-white shadow-lg w-full" }, /* @__PURE__ */ React.createElement("div", { className: "w-full px-4 py-6 lg:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center flex-wrap gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-bold western-text flex items-center gap-2" }, "Flightline OS"), /* @__PURE__ */ React.createElement("div", { className: "text-sm opacity-90 western-text", style: { color: "#c9a961" } }, 'Mustang Aviation \u2022 Pierre, SD \u2022 "Where the Midwest Meets the Wild West"')), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 p-1 rounded-lg", style: { background: "rgba(0,0,0,0.3)" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => roleAllows(currentRole, "ramp") && setView("ramp"),
        disabled: !roleAllows(currentRole, "ramp"),
        className: `px-6 py-3 rounded-lg font-bold text-lg transition relative ${view === "ramp" ? "mustang-red text-white shadow-lg" : "bg-transparent text-white hover:bg-white/10"} ${!roleAllows(currentRole, "ramp") ? "opacity-40 cursor-not-allowed" : ""}`
      },
      "RAMP",
      getActiveRampOrders(orders).length > 0 && /* @__PURE__ */ React.createElement("span", { className: "absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse" }, getActiveRampOrders(orders).length)
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => roleAllows(currentRole, "office") && setView("office"),
        disabled: !roleAllows(currentRole, "office"),
        className: `px-6 py-3 rounded-lg font-bold text-lg transition relative ${view === "office" ? "mustang-red text-white shadow-lg" : "bg-transparent text-white hover:bg-white/10"} ${!roleAllows(currentRole, "office") ? "opacity-40 cursor-not-allowed" : ""}`
      },
      "FRONT DESK",
      frontDeskReadyCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse" }, frontDeskReadyCount)
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (roleAllows(currentRole, "chat")) {
            setView("chat");
            markChatRead();
          }
        },
        disabled: !roleAllows(currentRole, "chat"),
        className: `px-6 py-3 rounded-lg font-bold text-lg transition relative ${view === "chat" ? "mustang-red text-white shadow-lg" : "bg-transparent text-white hover:bg-white/10"} ${!roleAllows(currentRole, "chat") ? "opacity-40 cursor-not-allowed" : ""}`
      },
      "\u{1F4AC} CHAT",
      generalChatMessages.filter((m) => new Date(m.createdAt).getTime() > lastReadChat).length > 0 && view !== "chat" && /* @__PURE__ */ React.createElement("span", { className: "absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse" }, generalChatMessages.filter((m) => new Date(m.createdAt).getTime() > lastReadChat).length)
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => roleAllows(currentRole, "calendar") && setView("calendar"),
        disabled: !roleAllows(currentRole, "calendar"),
        className: `px-6 py-3 rounded-lg font-bold text-lg transition relative ${view === "calendar" ? "mustang-red text-white shadow-lg" : "bg-transparent text-white hover:bg-white/10"} ${!roleAllows(currentRole, "calendar") ? "opacity-40 cursor-not-allowed" : ""}`
      },
      "\u{1F4C5} CALENDAR"
    )), /* @__PURE__ */ React.createElement("div", { className: "hidden md:flex gap-2 items-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-white/80 font-medium px-3 py-2 rounded-lg bg-black/20" }, session.displayName || session.username, " \xB7 ", currentRole, " \xB7 ", appMode === "local-dev" ? "LOCAL DEV" : "SHARED"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleLogout,
        className: "bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition",
        title: "Sign out"
      },
      "\u21A9 Logout"
    )))))), /* @__PURE__ */ React.createElement("main", { className: "w-full px-4 py-8 lg:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "card-wood rounded-xl p-6 w-full" }, /* @__PURE__ */ React.createElement("div", { className: `mb-4 px-4 py-2 rounded-lg text-sm font-medium ${backendMode === "postgres" ? "bg-green-50 text-green-800 border border-green-200" : backendMode === "local-fallback" ? "bg-yellow-50 text-yellow-800 border border-yellow-200" : backendMode === "shared-unavailable" ? "bg-red-50 text-red-800 border border-red-200" : "bg-gray-50 text-gray-700 border border-gray-200"}` }, backendMode === "postgres" ? "Shared backend connected \u2014 live Postgres-backed sync active." : backendMode === "local-fallback" ? "Backend unavailable \u2014 local browser cache is active for development only." : backendMode === "shared-unavailable" ? "Shared backend unavailable \u2014 do not trust unsynced writes until connectivity is restored." : "Checking backend connection..."), backendWarning && /* @__PURE__ */ React.createElement("div", { className: `mb-4 px-4 py-2 rounded-lg text-sm font-medium border ${appMode === "local-dev" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-red-50 border-red-200 text-red-700"}` }, backendWarning), view === "ramp" && /* @__PURE__ */ React.createElement(
      RampView,
      {
        customers,
        orders,
        tickets,
        onNewOrder: () => setShowNewOrder(true),
        onNewCustomer: () => setShowNewCustomer(true),
        onQuickFuel: () => setShowQuickFuel(true),
        onViewOffice: () => setView("office"),
        updateOrderStatus,
        addTicket,
        messages,
        addMessage: (text, orderId, tailNumber) => addMessage(text, "RAMP", orderId, tailNumber),
        getUnreadOrderThreadCount: (orderId) => getUnreadOrderThreadCount("RAMP", orderId),
        markOrderThreadRead: (orderId) => markOrderThreadRead("RAMP", orderId),
        startOrderService,
        markOrderReadyForFrontDesk
      }
    ), view === "office" && /* @__PURE__ */ React.createElement(
      OfficeView,
      {
        orders,
        customers,
        tickets,
        updateOrderStatus,
        recallOrder,
        resolveTicket,
        deleteTicket,
        generateCompletionEmail,
        messages,
        addMessage: (text, orderId, tailNumber) => addMessage(text, "OFFICE", orderId, tailNumber),
        getUnreadOrderThreadCount: (orderId) => getUnreadOrderThreadCount("OFFICE", orderId),
        markOrderThreadRead: (orderId) => markOrderThreadRead("OFFICE", orderId),
        closeOrder
      }
    ), view === "chat" && /* @__PURE__ */ React.createElement(
      ChatView,
      {
        messages: generalChatMessages,
        addMessage: (text) => addMessage(text, currentRole, null, null),
        senderRole: currentRole,
        onOpen: markChatRead
      }
    ), view === "calendar" && /* @__PURE__ */ React.createElement(CalendarView, { orders, customers }))), showNewCustomer && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[70]" }, /* @__PURE__ */ React.createElement(
      CustomerModal,
      {
        onClose: () => setShowNewCustomer(false),
        onSave: (customer) => {
          const newCust = addCustomer(customer);
          setShowNewCustomer(false);
          if (showNewOrder) {
            setSelectedCustomer(newCust);
          }
        }
      }
    )), showNewOrder && /* @__PURE__ */ React.createElement(
      OrderModal,
      {
        customers,
        selectedCustomer,
        onClose: () => {
          setShowNewOrder(false);
          setSelectedCustomer(null);
        },
        onSave: addOrder,
        onNewCustomer: () => setShowNewCustomer(true)
      }
    ), showQuickFuel && /* @__PURE__ */ React.createElement(
      QuickFuelModal,
      {
        customers,
        orders,
        onClose: () => setShowQuickFuel(false),
        addTicket
      }
    ));
  }
  const RampView = getExtractedComponent("RampView");
  const OrderMessageThread = getExtractedComponent("OrderMessageThread");
  function ChatView({ messages, addMessage, onOpen, senderRole = "OFFICE" }) {
    const [text, setText] = useState("");
    const endRef = React.useRef(null);
    const generalMsgs = messages.filter((m) => !m.orderId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    useEffect(() => {
      onOpen && onOpen();
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);
    useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [generalMsgs.length]);
    const handleSend = () => {
      if (!text.trim()) return;
      addMessage(text.trim(), null, null);
      setText("");
    };
    return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col", style: { height: "calc(100vh - 160px)" } }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-800" }, "\u{1F4AC} General Ops Channel"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-500" }, "Secondary team chatter. Aircraft-specific communication belongs on the order thread.")), /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold px-3 py-1 rounded-full bg-gray-200 text-gray-700" }, "Posting as ", senderRole)), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto bg-gray-50 rounded-xl p-4 mb-4 space-y-2 border border-gray-200" }, generalMsgs.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-center text-gray-400 py-16" }, /* @__PURE__ */ React.createElement("div", { className: "text-4xl mb-3" }, "\u{1F4AC}"), /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, "No messages yet"), /* @__PURE__ */ React.createElement("div", { className: "text-sm mt-1" }, "Use this for general ramp-to-office communication")), generalMsgs.map((m) => /* @__PURE__ */ React.createElement("div", { key: m.id, className: `flex ${m.sender === "OFFICE" ? "justify-end" : "justify-start"}` }, /* @__PURE__ */ React.createElement("div", { className: `max-w-xs rounded-2xl px-4 py-2 ${m.sender === "RAMP" ? "bg-blue-600 text-white rounded-tl-sm" : "bg-gray-700 text-white rounded-tr-sm"}` }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold opacity-75 mb-0.5" }, m.sender), /* @__PURE__ */ React.createElement("div", { className: "text-sm" }, m.text), /* @__PURE__ */ React.createElement("div", { className: "text-xs opacity-50 mt-1 text-right" }, new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))))), /* @__PURE__ */ React.createElement("div", { ref: endRef })), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 items-center bg-white rounded-xl p-3 border border-gray-200 shadow-sm" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        value: text,
        onChange: (e) => setText(e.target.value),
        onKeyDown: (e) => e.key === "Enter" && handleSend(),
        placeholder: "Type a message and press Enter...",
        className: "flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleSend,
        className: "mustang-red mustang-red-hover text-white px-5 py-2 rounded-lg font-bold transition"
      },
      "Send"
    )));
  }
  function CalendarView({ orders, customers }) {
    const [calView, setCalView] = useState("month");
    const [current, setCurrent] = useState(/* @__PURE__ */ new Date());
    const startOf = (d, unit) => {
      const dt = new Date(d);
      if (unit === "month") {
        dt.setDate(1);
        dt.setHours(0, 0, 0, 0);
      }
      if (unit === "week") {
        const day = dt.getDay();
        dt.setDate(dt.getDate() - day);
        dt.setHours(0, 0, 0, 0);
      }
      if (unit === "day") {
        dt.setHours(0, 0, 0, 0);
      }
      return dt;
    };
    const isSameDay = (a, b) => {
      const da = new Date(a), db = new Date(b);
      return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
    };
    const navigate = (dir) => {
      const d = new Date(current);
      if (calView === "month") d.setMonth(d.getMonth() + dir);
      if (calView === "week") d.setDate(d.getDate() + dir * 7);
      if (calView === "day") d.setDate(d.getDate() + dir);
      setCurrent(d);
    };
    const customerMap = React.useMemo(() => {
      const map = {};
      (customers || []).forEach((c) => {
        map[c.id] = c;
      });
      return map;
    }, [customers]);
    const getEvents = (date) => {
      const events = [];
      orders.forEach((o) => {
        const cust = customerMap[o.customerId] || {};
        const tail = o.tailNumber || o.aircraft || cust.tailNumber || "?";
        const customer = o.customerName || o.pilotName || cust.pilotName || cust.company || "";
        if (o.createdAt && isSameDay(o.createdAt, date)) {
          events.push({ type: "arrival", tail, customer, time: new Date(o.createdAt), order: o });
        }
        if (o.departureDate && isSameDay(o.departureDate, date)) {
          const depTime = o.departureTime ? (() => {
            const d = new Date(o.departureDate);
            const [h, m] = o.departureTime.split(":");
            d.setHours(+h, +m);
            return d;
          })() : new Date(o.departureDate);
          events.push({ type: "departure", tail, customer, time: depTime, order: o });
        }
      });
      return events.sort((a, b) => a.time - b.time);
    };
    const EventPill = ({ ev }) => /* @__PURE__ */ React.createElement("div", { className: `text-xs px-1.5 py-0.5 rounded font-semibold truncate mb-0.5 ${ev.type === "arrival" ? "bg-green-100 text-green-800 border border-green-300" : "bg-blue-100 text-blue-800 border border-blue-300"}`, title: `${ev.type === "arrival" ? "\u2708\uFE0F ARR" : "\u{1F6EB} DEP"} ${ev.tail} ${ev.customer} ${ev.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` }, ev.type === "arrival" ? "\u2193" : "\u2191", " ", ev.tail);
    const MonthView = () => {
      const monthStart = startOf(current, "month");
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const startPad = monthStart.getDay();
      const days = [];
      for (let i = 0; i < startPad; i++) days.push(null);
      for (let d = 1; d <= monthEnd.getDate(); d++) days.push(new Date(current.getFullYear(), current.getMonth(), d));
      const today = /* @__PURE__ */ new Date();
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-7 mb-1" }, ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => /* @__PURE__ */ React.createElement("div", { key: d, className: "text-center text-xs font-bold text-gray-500 py-2" }, d))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-7 gap-1" }, days.map((day, i) => {
        if (!day) return /* @__PURE__ */ React.createElement("div", { key: `pad-${i}` });
        const evs = getEvents(day);
        const isToday = isSameDay(day, today);
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: day.toISOString(),
            className: `min-h-20 rounded-lg p-1.5 border ${isToday ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"} cursor-pointer hover:shadow-md transition`,
            onClick: () => {
              setCurrent(day);
              setCalView("day");
            }
          },
          /* @__PURE__ */ React.createElement("div", { className: `text-xs font-bold mb-1 ${isToday ? "text-red-600" : "text-gray-700"}` }, day.getDate()),
          evs.slice(0, 3).map((ev, j) => /* @__PURE__ */ React.createElement(EventPill, { key: j, ev })),
          evs.length > 3 && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400" }, "+", evs.length - 3, " more")
        );
      })));
    };
    const WeekView = () => {
      const weekStart = startOf(current, "week");
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      });
      const today = /* @__PURE__ */ new Date();
      return /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-7 gap-1" }, days.map((day) => {
        const evs = getEvents(day);
        const isToday = isSameDay(day, today);
        return /* @__PURE__ */ React.createElement("div", { key: day.toISOString(), className: `rounded-lg border ${isToday ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"} overflow-hidden` }, /* @__PURE__ */ React.createElement("div", { className: `text-center text-xs font-bold py-2 ${isToday ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"}` }, day.toLocaleDateString([], { weekday: "short" }), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { className: "text-lg" }, day.getDate())), /* @__PURE__ */ React.createElement("div", { className: "p-1 min-h-32" }, evs.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-300 text-center mt-4" }, "\u2014"), evs.map((ev, j) => /* @__PURE__ */ React.createElement("div", { key: j, className: `text-xs p-1.5 rounded mb-1 border-l-4 ${ev.type === "arrival" ? "bg-green-50 border-green-500" : "bg-blue-50 border-blue-500"}` }, /* @__PURE__ */ React.createElement("div", { className: "font-bold" }, ev.type === "arrival" ? "\u2193 ARR" : "\u2191 DEP"), /* @__PURE__ */ React.createElement("div", { className: "font-mono" }, ev.tail), ev.customer && /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 truncate" }, ev.customer), /* @__PURE__ */ React.createElement("div", { className: "text-gray-400" }, ev.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))))));
      }));
    };
    const DayView = () => {
      const evs = getEvents(current);
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const getEventsForHour = (h) => evs.filter((ev) => ev.time.getHours() === h);
      return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-lg border border-gray-200 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-100 px-4 py-3 font-bold text-gray-700 text-center" }, current.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })), evs.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-center text-gray-400 py-16 text-lg" }, "No arrivals or departures scheduled"), /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto max-h-[600px]" }, hours.map((h) => {
        const hEvs = getEventsForHour(h);
        if (evs.length > 0 && hEvs.length === 0 && (h < evs[0]?.time.getHours() - 1 || h > evs[evs.length - 1]?.time.getHours() + 1)) return null;
        return /* @__PURE__ */ React.createElement("div", { key: h, className: `flex border-b border-gray-100 min-h-12 ${hEvs.length > 0 ? "bg-white" : "bg-gray-50"}` }, /* @__PURE__ */ React.createElement("div", { className: "w-16 text-right pr-3 pt-2 text-xs text-gray-400 font-mono shrink-0" }, h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`), /* @__PURE__ */ React.createElement("div", { className: "flex-1 p-1 flex flex-wrap gap-2" }, hEvs.map((ev, j) => /* @__PURE__ */ React.createElement("div", { key: j, className: `flex items-center gap-2 px-3 py-2 rounded-lg border-l-4 text-sm ${ev.type === "arrival" ? "bg-green-50 border-green-500" : "bg-blue-50 border-blue-500"}` }, /* @__PURE__ */ React.createElement("span", { className: "text-lg" }, ev.type === "arrival" ? "\u2708\uFE0F" : "\u{1F6EB}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-bold" }, ev.type === "arrival" ? "ARRIVAL" : "DEPARTURE", " \u2014 ", ev.tail), ev.customer && /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 text-xs" }, ev.customer), /* @__PURE__ */ React.createElement("div", { className: "text-gray-400 text-xs" }, ev.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })))))));
      })));
    };
    const headerLabel = () => {
      if (calView === "month") return current.toLocaleDateString([], { month: "long", year: "numeric" });
      if (calView === "week") {
        const ws = startOf(current, "week");
        const we = new Date(ws);
        we.setDate(we.getDate() + 6);
        return `${ws.toLocaleDateString([], { month: "short", day: "numeric" })} \u2013 ${we.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
      }
      return current.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    };
    const totalArrivals = orders.filter((o) => o.createdAt).length;
    const totalDepartures = orders.filter((o) => o.departureDate).length;
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-4 mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-3xl font-bold text-gray-800" }, "\u{1F4C5} Flight Calendar"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-500 text-sm mt-1" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 mr-4" }, /* @__PURE__ */ React.createElement("span", { className: "w-3 h-3 rounded bg-green-400 inline-block" }), " ", totalArrivals, " Arrivals"), /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "w-3 h-3 rounded bg-blue-400 inline-block" }), " ", totalDepartures, " Departures"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex rounded-lg overflow-hidden border border-gray-300" }, ["month", "week", "day"].map((v) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: v,
        onClick: () => setCalView(v),
        className: `px-4 py-2 text-sm font-semibold transition ${calView === v ? "mustang-red text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`
      },
      v.charAt(0).toUpperCase() + v.slice(1)
    ))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => navigate(-1), className: "p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-bold" }, "\u2039"), /* @__PURE__ */ React.createElement("button", { onClick: () => setCurrent(/* @__PURE__ */ new Date()), className: "px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-sm font-semibold" }, "Today"), /* @__PURE__ */ React.createElement("button", { onClick: () => navigate(1), className: "p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-bold" }, "\u203A")), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-gray-700 text-lg" }, headerLabel()))), calView === "month" && /* @__PURE__ */ React.createElement(MonthView, null), calView === "week" && /* @__PURE__ */ React.createElement(WeekView, null), calView === "day" && /* @__PURE__ */ React.createElement(DayView, null));
  }
  const CompletionModal = getExtractedComponent("CompletionModal");
  const OrderCard = getExtractedComponent("OrderCard");
  const ServicePanel = getExtractedComponent("ServicePanel");
  const publishAirBossDeps = () => {
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
      getWeekOrders,
      getFuelTotal,
      getActiveRampOrders,
      OrderMessageThread,
      CompletionModal,
      OrderCard,
      ServicePanel
    };
  };
  publishAirBossDeps();
  const OfficeView = getExtractedComponent("OfficeView");
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0, 3) + "-" + digits.slice(3);
    return digits.slice(0, 3) + "-" + digits.slice(3, 6) + "-" + digits.slice(6);
  };
  function CustomerModal({ onClose, onSave, customer }) {
    const [formData, setFormData] = useState({
      tailNumber: customer?.tailNumber || "",
      aircraftType: customer?.aircraftType || "",
      ownerName: customer?.ownerName || "",
      pilotName: customer?.pilotName || "",
      phone: customer?.phone || "",
      email: customer?.email || "",
      // blank = girl types it in manually
      company: customer?.company || "",
      homeBase: customer?.homeBase || "",
      notes: customer?.notes || ""
    });
    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.tailNumber) {
        alert("Tail number is required");
        return;
      }
      onSave(formData);
    };
    return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-bold mb-6 text-gray-800" }, customer ? "Edit Customer" : "New Customer"), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Tail Number *"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: formData.tailNumber,
        onChange: (e) => setFormData({ ...formData, tailNumber: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
        placeholder: "N12345",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Aircraft Type"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: formData.aircraftType,
        onChange: (e) => setFormData({ ...formData, aircraftType: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
        placeholder: "Citation CJ3"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Owner Name"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: formData.ownerName,
        onChange: (e) => setFormData({ ...formData, ownerName: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Pilot Name"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: formData.pilotName,
        onChange: (e) => setFormData({ ...formData, pilotName: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Phone"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "tel",
        value: formData.phone,
        onChange: (e) => setFormData({ ...formData, phone: formatPhone(e.target.value) }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
        placeholder: "605-555-1234"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Email"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "email",
        value: formData.email,
        onChange: (e) => setFormData({ ...formData, email: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Company"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: formData.company,
        onChange: (e) => setFormData({ ...formData, company: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Home Base"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: formData.homeBase,
        onChange: (e) => setFormData({ ...formData, homeBase: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
        placeholder: "KJFK"
      }
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Notes / Preferences"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: formData.notes,
        onChange: (e) => setFormData({ ...formData, notes: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
        rows: "3",
        placeholder: "Preferred fuel type, special requests, etc."
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        className: "flex-1 mustang-red mustang-red-hover text-white px-6 py-3 rounded-lg font-medium transition"
      },
      "Save Customer"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onClose,
        className: "flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-medium transition"
      },
      "Cancel"
    ))))));
  }
  function OrderModal({ customers, selectedCustomer, onClose, onSave, onNewCustomer }) {
    const [formData, setFormData] = useState({
      customerId: selectedCustomer?.id || "",
      fuelType: "",
      fuelQuantity: "",
      hangar: "",
      services: [],
      notes: "",
      departureDate: "",
      departureTime: ""
    });
    const [formError, setFormError] = useState("");
    const serviceOptions = ["GPU", "Lavatory", "Water", "Catering", "De-icing", "Oxygen", "Tow", "Coffee", "Ice"];
    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.customerId) {
        setFormError("Please select a customer.");
        return;
      }
      if (formData.fuelType && !(parseFloat(formData.fuelQuantity) > 0)) {
        setFormError("Enter requested fuel gallons greater than 0 when a fuel type is selected.");
        return;
      }
      setFormError("");
      onSave(formData);
    };
    const toggleService = (service) => {
      setFormData({
        ...formData,
        services: formData.services.includes(service) ? formData.services.filter((s) => s !== service) : [...formData.services, service]
      });
    };
    return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-bold mb-6 text-gray-800" }, "Aircraft Arrival / New Order"), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, formError && /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" }, formError), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Customer / Aircraft *"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
      "select",
      {
        value: formData.customerId,
        onChange: (e) => setFormData({ ...formData, customerId: e.target.value }),
        className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
        required: true
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Select Aircraft..."),
      customers.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.tailNumber, " - ", c.aircraftType, " (", c.ownerName || c.pilotName, ")"))
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          setFormError("");
          onNewCustomer();
        },
        className: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
      },
      "+ New"
    ))), /* @__PURE__ */ React.createElement("div", { className: "border-t pt-4" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-gray-800 mb-3" }, "Fuel Order"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Fuel Type"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: formData.fuelType,
        onChange: (e) => setFormData({
          ...formData,
          fuelType: e.target.value,
          fuelQuantity: e.target.value ? formData.fuelQuantity : ""
        }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "No Fuel Required"),
      /* @__PURE__ */ React.createElement("option", { value: "JET-A" }, "JET-A"),
      /* @__PURE__ */ React.createElement("option", { value: "100LL" }, "100LL")
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Quantity (gallons)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        value: formData.fuelQuantity,
        onChange: (e) => setFormData({ ...formData, fuelQuantity: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
        placeholder: "0",
        disabled: !formData.fuelType
      }
    )))), /* @__PURE__ */ React.createElement("div", { className: "border-t pt-4" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-gray-800 mb-3" }, "Hangar"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: formData.hangar,
        onChange: (e) => setFormData({ ...formData, hangar: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "No Hangar"),
      /* @__PURE__ */ React.createElement("option", { value: "Transient" }, "Transient"),
      /* @__PURE__ */ React.createElement("option", { value: "Overnight" }, "Overnight")
    )), /* @__PURE__ */ React.createElement("div", { className: "border-t pt-4" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-gray-800 mb-3" }, "Services"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2" }, serviceOptions.map((service) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: service,
        type: "button",
        onClick: () => toggleService(service),
        className: `px-3 py-2 rounded-lg font-medium transition ${formData.services.includes(service) ? "mustang-red text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`
      },
      service
    )))), /* @__PURE__ */ React.createElement("div", { className: "border-t pt-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Notes / Special Requests"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: formData.notes,
        onChange: (e) => setFormData({ ...formData, notes: e.target.value }),
        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
        rows: "3",
        placeholder: "Any special instructions..."
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        className: "flex-1 mustang-red mustang-red-hover text-white px-6 py-3 rounded-lg font-medium transition"
      },
      "Create Order"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onClose,
        className: "flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-medium transition"
      },
      "Cancel"
    ))))));
  }
  function QuickFuelModal({ customers, orders, onClose, addTicket }) {
    const [selectedOrder, setSelectedOrder] = useState("");
    const [fuelQuantity, setFuelQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const activeOrders = orders.filter(
      (o) => isInProgressStatus(o.status) && o.fuelType
    );
    const handleSubmit = (e) => {
      e.preventDefault();
      const order = orders.find((o) => o.id === selectedOrder);
      if (!order) {
        alert("Please select an order");
        return;
      }
      const customer = customers.find((c) => c.id === order.customerId);
      addTicket({
        type: "fueling_complete",
        orderId: order.id,
        customerId: order.customerId,
        tailNumber: customer?.tailNumber,
        aircraftType: customer?.aircraftType,
        fuelType: order.fuelType,
        fuelQuantity: fuelQuantity || order.fuelQuantity,
        message: `Fueling complete: ${fuelQuantity || order.fuelQuantity} gal ${order.fuelType}${notes ? " - " + notes : ""}`,
        submittedBy: "Line Service",
        notes
      });
      alert("Front desk notified!");
      onClose();
    };
    return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-lg shadow-xl max-w-md w-full" }, /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-bold mb-4 text-gray-800" }, "\u26A1 Quick Fuel Entry"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600 mb-6" }, "Notify front desk that fueling is complete"), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Select Aircraft *"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: selectedOrder,
        onChange: (e) => {
          setSelectedOrder(e.target.value);
          const order = orders.find((o) => o.id === e.target.value);
          if (order) setFuelQuantity(order.fuelQuantity || "");
        },
        className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-lg",
        required: true
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Choose aircraft..."),
      activeOrders.map((order) => {
        const customer = customers.find((c) => c.id === order.customerId);
        return /* @__PURE__ */ React.createElement("option", { key: order.id, value: order.id }, customer?.tailNumber, " - ", order.fuelType);
      })
    ), activeOrders.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mt-2" }, "No active fuel orders")), selectedOrder && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Fuel Quantity (gallons) *"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        value: fuelQuantity,
        onChange: (e) => setFuelQuantity(e.target.value),
        className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-lg",
        placeholder: "Enter gallons",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Notes (optional)"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: notes,
        onChange: (e) => setNotes(e.target.value),
        className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-lg",
        rows: "2",
        placeholder: "Any issues or special notes..."
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: !selectedOrder,
        className: "flex-1 mustang-red mustang-red-hover text-white px-6 py-4 rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      },
      "\u{1F4E2} Notify Front Desk"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onClose,
        className: "px-6 py-4 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium transition"
      },
      "Cancel"
    ))))));
  }
  ReactDOM.render(/* @__PURE__ */ React.createElement(FBOSystem, null), document.getElementById("root"));
})();
