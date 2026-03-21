export function bootstrapPayload() {
  return {
    ok: true,
    mode: 'scaffold',
    version: 1,
    customers: [],
    orders: [],
    alerts: [],
    threadReads: {
      RAMP: {},
      OFFICE: {},
    },
    messages: [],
    note: 'Bootstrap shape is ready. Next step: hydrate from Postgres and add changed-since polling.',
  };
}
