import { query } from '../db/client.js';
import { hashPassword } from '../lib/auth.js';

const USERS = [
  { id: 'usr-admin-1', username: 'steve', password: 'groundcore-steve', role: 'ADMIN', displayName: 'Steve' },
  { id: 'usr-office-1', username: 'tacie', password: 'groundcore-tacie', role: 'OFFICE', displayName: 'Tacie' },
  { id: 'usr-ramp-1', username: 'ramp', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Ramp Operations' },
  { id: 'usr-kiosk-1', username: 'kiosk', password: 'groundcore-kiosk', role: 'KIOSK', displayName: 'Customer Kiosk' },
  { id: 'usr-office-2', username: 'lindsey', password: 'groundcore-office', role: 'OFFICE', displayName: 'Lindsey' },
  { id: 'usr-office-3', username: 'lizbeth', password: 'groundcore-office', role: 'OFFICE', displayName: 'LizBeth' },
  { id: 'usr-office-4', username: 'amanda', password: 'groundcore-office', role: 'OFFICE', displayName: 'Amanda' },
  { id: 'usr-ramp-2', username: 'neil', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Neil' },
  { id: 'usr-ramp-3', username: 'john', password: 'groundcore-ramp', role: 'RAMP', displayName: 'John' },
  { id: 'usr-ramp-4', username: 'wade', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Wade' },
  { id: 'usr-ramp-5', username: 'todd', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Todd' },
  { id: 'usr-ramp-6', username: 'clark', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Clark' },
  { id: 'usr-ramp-7', username: 'mark', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Mark' },
];

async function seedUsers() {
  const seeded = [];

  for (const user of USERS) {
    const passwordHash = hashPassword(user.password);
    await query(`
      insert into app_users (
        id, username, password, password_hash, role, display_name, active, must_change_password
      ) values (
        $1, $2, null, $3, $4, $5, true, true
      )
      on conflict (username) do update
      set password = null,
          password_hash = excluded.password_hash,
          role = excluded.role,
          display_name = excluded.display_name,
          active = true,
          must_change_password = true
    `, [
      user.id,
      user.username,
      passwordHash,
      user.role,
      user.displayName,
    ]);

    seeded.push({
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      mustChangePassword: true,
    });
  }

  return seeded;
}

seedUsers()
  .then((seeded) => {
    console.log(JSON.stringify({ ok: true, seeded }, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exit(1);
  });
