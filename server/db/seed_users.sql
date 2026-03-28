delete from app_users where id in (
  'usr-admin-1','usr-office-1','usr-ramp-1','usr-kiosk-1',
  'usr-office-2','usr-office-3','usr-office-4',
  'usr-ramp-2','usr-ramp-3','usr-ramp-4','usr-ramp-5','usr-ramp-6','usr-ramp-7'
)
   or username in (
  'admin','frontdesk','ramp','kiosk','steve','tacie',
  'lindsey','lizbeth','amanda','neil','john','wade','todd','clark','mark'
);

insert into app_users (id, username, password, password_hash, role, display_name, must_change_password)
values
  ('usr-admin-1', 'steve', null, '8c1bc319796be4201aa75265d79f19d4:f7fb01dcf7b755e7102f17ae194393905c0c4894cc3bc512868b4bb136ddd9bced15dfa7af938b025ccb7d0ee8a948410f4f281eea40b23a050e6fe2c86e9b15', 'ADMIN', 'Steve', true),
  ('usr-office-1', 'tacie', null, '5f7aab0ddb14421da6a864e3ee2ad14e:fe7d54f0f0aa11fbf3bdb9668aa0c24626d72903a01a1bbe819b3095a4c345394763bc8de9ac8f55a06989beaebd86927df4276266146f4dd2e0f1792d36574c', 'OFFICE', 'Tacie', true),
  ('usr-ramp-1', 'ramp', null, 'f46688111de872e0151fabfcd62a1873:370bf39def3b4d07e8d468888e6661385071d3edeba60b9644e14d1a61894373141664473c3a82ec432aa3aeae74bd500034708b90b590947ce0a9e8bb661fec', 'RAMP', 'Ramp Operations', true),
  ('usr-kiosk-1', 'kiosk', null, '97d5399b022706eab48b86ef880f3088:d46797ffb8647e25f3ce61e01ea60f2c4633303f210a3b8785b903465b9af72f73a381e3ada9d67d2d91dee6c14887693a111f7e2576b690a4cedb4ea801d81a', 'KIOSK', 'Customer Kiosk', true),
  ('usr-office-2', 'lindsey', null, 'c98fc0eaa2add0554506b74b3f244375:afe7decbd5c5a24af4f4f6cd61707269804ed813d9d4485b8a642fd274328b8e65cd4cbdadf3a4900348c22658428192017fe3c37d8c2f52bd853903659537f9', 'OFFICE', 'Lindsey', true),
  ('usr-office-3', 'lizbeth', null, 'c98fc0eaa2add0554506b74b3f244375:afe7decbd5c5a24af4f4f6cd61707269804ed813d9d4485b8a642fd274328b8e65cd4cbdadf3a4900348c22658428192017fe3c37d8c2f52bd853903659537f9', 'OFFICE', 'LizBeth', true),
  ('usr-office-4', 'amanda', null, 'c98fc0eaa2add0554506b74b3f244375:afe7decbd5c5a24af4f4f6cd61707269804ed813d9d4485b8a642fd274328b8e65cd4cbdadf3a4900348c22658428192017fe3c37d8c2f52bd853903659537f9', 'OFFICE', 'Amanda', true),
  ('usr-ramp-2', 'neil', null, 'f46688111de872e0151fabfcd62a1873:370bf39def3b4d07e8d468888e6661385071d3edeba60b9644e14d1a61894373141664473c3a82ec432aa3aeae74bd500034708b90b590947ce0a9e8bb661fec', 'RAMP', 'Neil', true),
  ('usr-ramp-3', 'john', null, 'f46688111de872e0151fabfcd62a1873:370bf39def3b4d07e8d468888e6661385071d3edeba60b9644e14d1a61894373141664473c3a82ec432aa3aeae74bd500034708b90b590947ce0a9e8bb661fec', 'RAMP', 'John', true),
  ('usr-ramp-4', 'wade', null, 'f46688111de872e0151fabfcd62a1873:370bf39def3b4d07e8d468888e6661385071d3edeba60b9644e14d1a61894373141664473c3a82ec432aa3aeae74bd500034708b90b590947ce0a9e8bb661fec', 'RAMP', 'Wade', true),
  ('usr-ramp-5', 'todd', null, 'f46688111de872e0151fabfcd62a1873:370bf39def3b4d07e8d468888e6661385071d3edeba60b9644e14d1a61894373141664473c3a82ec432aa3aeae74bd500034708b90b590947ce0a9e8bb661fec', 'RAMP', 'Todd', true),
  ('usr-ramp-6', 'clark', null, 'f46688111de872e0151fabfcd62a1873:370bf39def3b4d07e8d468888e6661385071d3edeba60b9644e14d1a61894373141664473c3a82ec432aa3aeae74bd500034708b90b590947ce0a9e8bb661fec', 'RAMP', 'Clark', true),
  ('usr-ramp-7', 'mark', null, 'f46688111de872e0151fabfcd62a1873:370bf39def3b4d07e8d468888e6661385071d3edeba60b9644e14d1a61894373141664473c3a82ec432aa3aeae74bd500034708b90b590947ce0a9e8bb661fec', 'RAMP', 'Mark', true)
on conflict (username) do update
set password = excluded.password,
    password_hash = excluded.password_hash,
    role = excluded.role,
    display_name = excluded.display_name,
    must_change_password = true,
    active = true;