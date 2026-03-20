export const STORAGE_KEYS = {
  CUSTOMERS: 'fbo_customers',
  ORDERS: 'fbo_orders',
  TICKETS: 'fbo_tickets',
  MESSAGES: 'fbo_messages',
  LAST_READ_CHAT: 'fbo_last_read_chat',
  MARKETING_LIST: 'marketing_list',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  READY_FOR_FRONT_DESK: 'ready_for_front_desk',
  CLOSED: 'closed',
};

// Maps current legacy statuses to the canonical model.
export const LEGACY_ORDER_STATUS_MAP = {
  pending: ORDER_STATUS.PENDING,
  'in-progress': ORDER_STATUS.IN_PROGRESS,
  ready: ORDER_STATUS.READY_FOR_FRONT_DESK,
  finalized: ORDER_STATUS.CLOSED,
  completed: ORDER_STATUS.READY_FOR_FRONT_DESK,
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Pending',
  [ORDER_STATUS.IN_PROGRESS]: 'In Progress',
  [ORDER_STATUS.READY_FOR_FRONT_DESK]: 'Ready for Front Desk',
  [ORDER_STATUS.CLOSED]: 'Closed',
};

export const FUEL_TYPES = ['JET-A', '100LL'];

export const ORDER_SERVICES = [
  'GPU',
  'Lavatory',
  'Water',
  'Catering',
  'De-icing',
  'Oxygen',
  'Tow',
  'Coffee',
  'Ice',
];

export const KIOSK_SERVICE_OPTIONS = [
  { id: 'lav', label: '🚽 Lavatory Service', icon: '🚽' },
  { id: 'gpu', label: '⚡ GPU (Ground Power)', icon: '⚡' },
  { id: 'oxygen', label: '🫁 Oxygen Service', icon: '🫁' },
  { id: 'deice', label: '❄️ De-icing', icon: '❄️' },
  { id: 'tiedown', label: '⛓️ Tiedown', icon: '⛓️' },
  { id: 'crew_car', label: '🚗 Crew Car', icon: '🚗' },
  { id: 'coffee', label: '☕ Coffee', icon: '☕' },
  { id: 'ice', label: '🧊 Ice', icon: '🧊' },
];

export const SENDER_ROLES = {
  RAMP: 'RAMP',
  OFFICE: 'OFFICE',
};

export const MESSAGE_CHANNELS = {
  GENERAL: 'general',
  ORDER: 'order',
};
