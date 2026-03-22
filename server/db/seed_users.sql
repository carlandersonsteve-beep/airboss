delete from app_users where id in ('usr-admin-1','usr-office-1','usr-ramp-1','usr-kiosk-1')
   or username in ('admin','frontdesk','ramp','kiosk','steve','tacie');

insert into app_users (id, username, password, role, display_name)
values
  ('usr-admin-1', 'steve', 'airboss-steve', 'ADMIN', 'Steve'),
  ('usr-office-1', 'tacie', 'airboss-tacie', 'OFFICE', 'Tacie'),
  ('usr-ramp-1', 'ramp', 'airboss-ramp', 'RAMP', 'Ramp Operations'),
  ('usr-kiosk-1', 'kiosk', 'airboss-kiosk', 'KIOSK', 'Customer Kiosk');
