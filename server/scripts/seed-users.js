import { query } from '../db/client.js';
import { hashPassword } from '../lib/auth.js';

const allowInsecureDefaultSeedPasswords = ['1', 'true', 'yes', 'on'].includes(String(process.env.ALLOW_INSECURE_DEFAULT_SEED_PASSWORDS || '').trim().toLowerCase());
const requireExplicitSeedPasswords = process.env.NODE_ENV === 'production' && !allowInsecureDefaultSeedPasswords;
const smokeOnly = process.argv.includes('--smoke-only');

const USERS = [
  { id: 'usr-admin-1', username: 'steve', password: 'groundcore-steve', role: 'ADMIN', displayName: 'Steve', mustChangePassword: true },
  { id: 'usr-office-1', username: 'tacie', password: 'groundcore-tacie', role: 'OFFICE', displayName: 'Tacie', mustChangePassword: true },
  { id: 'usr-ramp-1', username: 'ramp', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Ramp Operations', mustChangePassword: true },
  { id: 'usr-kiosk-1', username: 'kiosk', password: 'groundcore-kiosk', role: 'KIOSK', displayName: 'Customer Kiosk', mustChangePassword: true },
  { id: 'usr-office-2', username: 'lindsey', password: 'groundcore-office', role: 'OFFICE', displayName: 'Lindsey', mustChangePassword: true },
  { id: 'usr-office-3', username: 'lizbeth', password: 'groundcore-office', role: 'OFFICE', displayName: 'LizBeth', mustChangePassword: true },
  { id: 'usr-office-4', username: 'amanda', password: 'groundcore-office', role: 'OFFICE', displayName: 'Amanda', mustChangePassword: true },
  { id: 'usr-ramp-2', username: 'neil', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Neil', mustChangePassword: true },
  { id: 'usr-ramp-3', username: 'john', password: 'groundcore-ramp', role: 'RAMP', displayName: 'John', mustChangePassword: true },
  { id: 'usr-ramp-4', username: 'wade', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Wade', mustChangePassword: true },
  { id: 'usr-ramp-5', username: 'todd', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Todd', mustChangePassword: true },
  { id: 'usr-ramp-6', username: 'clark', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Clark', mustChangePassword: true },
  { id: 'usr-ramp-7', username: 'mark', password: 'groundcore-ramp', role: 'RAMP', displayName: 'Mark', mustChangePassword: true },
  { id: 'usr-smoke-admin-1', username: 'smoke-admin', password: 'groundcore-smoke-admin', role: 'ADMIN', displayName: 'Smoke Admin', mustChangePassword: false },
  { id: 'usr-smoke-ramp-1', username: 'smoke-ramp-a', password: 'groundcore-smoke-ramp', role: 'RAMP', displayName: 'Smoke Ramp A', mustChangePassword: false },
  { id: 'usr-smoke-ramp-2', username: 'smoke-ramp-b', password: 'groundcore-smoke-ramp', role: 'RAMP', displayName: 'Smoke Ramp B', mustChangePassword: false },
  { id: 'usr-smoke-ramp-3', username: 'smoke-ramp-pilot', password: 'groundcore-smoke-ramp-pilot', role: 'RAMP', displayName: 'Smoke Ramp Pilot', mustChangePassword: false },
  { id: 'usr-smoke-office-1', username: 'smoke-office-a', password: 'groundcore-smoke-office', role: 'OFFICE', displayName: 'Smoke Office A', mustChangePassword: false },
  { id: 'usr-smoke-office-2', username: 'smoke-office-b', password: 'groundcore-smoke-office', role: 'OFFICE', displayName: 'Smoke Office B', mustChangePassword: false },
  { id: 'usr-smoke-office-3', username: 'smoke-office-pilot', password: 'groundcore-smoke-office-pilot', role: 'OFFICE', displayName: 'Smoke Office Pilot', mustChangePassword: false },
  { id: 'usr-smoke-password-1', username: 'smoke-password', password: 'groundcore-smoke-password', role: 'RAMP', displayName: 'Smoke Password Gate', mustChangePassword: true },
  { id: 'usr-smoke-ui-ramp-1', username: 'smoke-ui-ramp', password: 'groundcore-smoke-ui-ramp', role: 'RAMP', displayName: 'Smoke UI Ramp', mustChangePassword: true },
  { id: 'usr-smoke-ui-office-1', username: 'smoke-ui-office', password: 'groundcore-smoke-ui-office', role: 'OFFICE', displayName: 'Smoke UI Office', mustChangePassword: true },
];

async function seedUsers() {
  const seeded = [];

  const selectedUsers = smokeOnly ? USERS.filter((user) => user.username.startsWith('smoke-')) : USERS;
  for (const user of selectedUsers) {
    const password = resolveSeedPassword(user);
    const passwordHash = hashPassword(password);
    await query(`
      insert into app_users (
        id, username, password, password_hash, role, display_name, active, must_change_password
      ) values (
        $1, $2, null, $3, $4, $5, true, $6
      )
      on conflict (username) do update
      set password = null,
          password_hash = excluded.password_hash,
          role = excluded.role,
          display_name = excluded.display_name,
          active = true,
          must_change_password = excluded.must_change_password
    `, [
      user.id,
      user.username,
      passwordHash,
      user.role,
      user.displayName,
      user.mustChangePassword ?? true,
    ]);

    seeded.push({
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      mustChangePassword: user.mustChangePassword ?? true,
      passwordSource: password === user.password ? 'repo-default' : 'env-override',
    });
  }

  return seeded;
}

function resolveSeedPassword(user) {
  const envKey = `SEED_PASSWORD_${String(user.username || '').toUpperCase()}`;
  const override = String(process.env[envKey] || '').trim();
  if (override) return override;

  if (requireExplicitSeedPasswords) {
    throw new Error(`Missing ${envKey}. Production seeding requires explicit per-user temporary passwords unless ALLOW_INSECURE_DEFAULT_SEED_PASSWORDS=1 is set.`);
  }

  return user.password;
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
