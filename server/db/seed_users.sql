insert into app_users (id, username, password, role, display_name)
values
  ('usr-admin-1', 'admin', 'mustang-admin', 'ADMIN', 'Mustang Admin'),
  ('usr-office-1', 'frontdesk', 'mustang-office', 'OFFICE', 'Front Desk'),
  ('usr-ramp-1', 'ramp', 'mustang-ramp', 'RAMP', 'Ramp Operations'),
  ('usr-kiosk-1', 'kiosk', 'mustang-kiosk', 'KIOSK', 'Kiosk')
on conflict (username) do update
set password = excluded.password,
    role = excluded.role,
    display_name = excluded.display_name,
    active = true;
