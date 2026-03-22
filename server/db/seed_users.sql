delete from app_users where id in (
  'usr-admin-1','usr-office-1','usr-ramp-1','usr-kiosk-1',
  'usr-office-2','usr-office-3','usr-office-4',
  'usr-ramp-2','usr-ramp-3','usr-ramp-4','usr-ramp-5','usr-ramp-6','usr-ramp-7'
)
   or username in (
  'admin','frontdesk','ramp','kiosk','steve','tacie',
  'lindsey','lizbeth','amanda','neil','john','wade','todd','clark','mark'
);

insert into app_users (id, username, password, role, display_name, must_change_password)
values
  ('usr-admin-1', 'steve', 'airboss-steve', 'ADMIN', 'Steve', true),
  ('usr-office-1', 'tacie', 'airboss-tacie', 'OFFICE', 'Tacie', true),
  ('usr-ramp-1', 'ramp', 'airboss-ramp', 'RAMP', 'Ramp Operations', true),
  ('usr-kiosk-1', 'kiosk', 'airboss-kiosk', 'KIOSK', 'Customer Kiosk', true),
  ('usr-office-2', 'lindsey', 'airboss-office', 'OFFICE', 'Lindsey', true),
  ('usr-office-3', 'lizbeth', 'airboss-office', 'OFFICE', 'LizBeth', true),
  ('usr-office-4', 'amanda', 'airboss-office', 'OFFICE', 'Amanda', true),
  ('usr-ramp-2', 'neil', 'airboss-ramp', 'RAMP', 'Neil', true),
  ('usr-ramp-3', 'john', 'airboss-ramp', 'RAMP', 'John', true),
  ('usr-ramp-4', 'wade', 'airboss-ramp', 'RAMP', 'Wade', true),
  ('usr-ramp-5', 'todd', 'airboss-ramp', 'RAMP', 'Todd', true),
  ('usr-ramp-6', 'clark', 'airboss-ramp', 'RAMP', 'Clark', true),
  ('usr-ramp-7', 'mark', 'airboss-ramp', 'RAMP', 'Mark', true)
on conflict (username) do update
set password = excluded.password,
    role = excluded.role,
    display_name = excluded.display_name,
    must_change_password = true,
    active = true;
