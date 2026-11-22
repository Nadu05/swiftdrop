import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUserAccessPath,
  getDashboardRouteForRole,
  normalizeRoleName,
  resolveDashboardRoute,
  resolvePostAuthRedirect,
  resolvePrimaryRole,
  toAuthUser,
} from './role-resolver';

test('1. Customer login resolves CUSTOMER and opens Customer dashboard', () => {
  const user = toAuthUser({
    userId: 'u-cust',
    fullName: 'Nimal Perera',
    email: 'customer@swiftdrop.lk',
    phone: null,
    roles: ['CUSTOMER'],
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  });
  assert.equal(resolvePrimaryRole(user), 'CUSTOMER');
  assert.equal(resolveDashboardRoute(user), '/customer/dashboard');
  assert.equal(resolvePostAuthRedirect(user), '/customer/dashboard');
});

test('2. Admin login resolves ADMIN/HEAD_OFFICE_ADMIN and opens Admin dashboard (never Customer)', () => {
  const adminUser = toAuthUser({
    userId: 'u-admin',
    fullName: 'System Administrator',
    email: 'admin@swiftdrop.lk',
    phone: null,
    roles: ['ADMIN', 'HEAD_OFFICE_ADMIN'],
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  });
  assert.equal(resolvePrimaryRole(adminUser), 'HEAD_OFFICE_ADMIN');
  assert.equal(resolveDashboardRoute(adminUser), '/admin/dashboard');
  assert.equal(resolvePostAuthRedirect(adminUser), '/admin/dashboard');
});

test('3. Stale customer callbackUrl cannot redirect Admin into Customer portal', () => {
  const adminUser = toAuthUser({
    userId: 'u-admin',
    fullName: 'System Administrator',
    email: 'admin@swiftdrop.lk',
    phone: null,
    roles: ['ADMIN', 'HEAD_OFFICE_ADMIN'],
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  });
  assert.equal(canUserAccessPath('/customer/dashboard', adminUser), false);
  assert.equal(
    resolvePostAuthRedirect(adminUser, '/customer/dashboard'),
    '/admin/dashboard'
  );
});

test('4. MAIN_ADMIN and ROLE_ADMIN normalize and open Admin dashboard', () => {
  assert.equal(normalizeRoleName('ROLE_ADMIN'), 'ADMIN');
  assert.equal(normalizeRoleName('ROLE-MAIN_ADMIN'), 'MAIN_ADMIN');

  const mainAdmin = toAuthUser({
    userId: 'u-main',
    fullName: 'Main Admin',
    email: 'main@swiftdrop.lk',
    phone: null,
    roles: ['ROLE_MAIN_ADMIN'],
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  });
  assert.equal(resolvePrimaryRole(mainAdmin), 'MAIN_ADMIN');
  assert.equal(resolveDashboardRoute(mainAdmin), '/admin/dashboard');
  assert.equal(canUserAccessPath('/admin/dashboard', mainAdmin), true);
  assert.equal(canUserAccessPath('/customer/dashboard', mainAdmin), false);
});

test('5. Customer cannot access Admin or Organization routes', () => {
  const customerUser = toAuthUser({
    userId: 'u-cust',
    fullName: 'Nimal Perera',
    email: 'customer@swiftdrop.lk',
    phone: null,
    roles: ['CUSTOMER'],
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  });
  assert.equal(canUserAccessPath('/admin', customerUser), false);
  assert.equal(canUserAccessPath('/admin/dashboard', customerUser), false);
  assert.equal(canUserAccessPath('/organization', customerUser), false);
  assert.equal(canUserAccessPath('/merchant/dashboard', customerUser), false);
  assert.equal(canUserAccessPath('/customer/dashboard', customerUser), true);
  assert.equal(
    resolvePostAuthRedirect(customerUser, '/admin/dashboard'),
    '/customer/dashboard'
  );
});

test('6. Merchant role routes to Merchant dashboard and cannot access Admin routes', () => {
  const merchantOnly = toAuthUser({
    userId: 'u-merch',
    fullName: 'Ceylon Exports',
    email: 'merchant@swiftdrop.lk',
    phone: null,
    roles: ['MERCHANT'],
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  });
  assert.equal(resolvePrimaryRole(merchantOnly), 'MERCHANT');
  assert.equal(resolveDashboardRoute(merchantOnly), '/merchant/dashboard');
  assert.equal(canUserAccessPath('/merchant/dashboard', merchantOnly), true);
  assert.equal(canUserAccessPath('/admin/dashboard', merchantOnly), false);
  assert.equal(canUserAccessPath('/customer/dashboard', merchantOnly), false);

  const merchantWithCustomer = toAuthUser({
    userId: 'u-merch-2',
    fullName: 'Ceylon Exports',
    email: 'merchant2@swiftdrop.lk',
    phone: null,
    roles: ['MERCHANT', 'CUSTOMER'],
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  });
  assert.equal(resolvePrimaryRole(merchantWithCustomer), 'MERCHANT');
  assert.equal(resolveDashboardRoute(merchantWithCustomer), '/merchant/dashboard');
});

test('7. Missing or unknown roles do NOT silently default to CUSTOMER', () => {
  const emptyRolesUser = toAuthUser({
    userId: 'u-none',
    fullName: 'No Role User',
    email: 'norole@swiftdrop.lk',
    phone: null,
    roles: [],
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  });
  assert.deepEqual(emptyRolesUser.roles, []);
  assert.equal(resolvePrimaryRole(emptyRolesUser), null);
  assert.equal(
    resolveDashboardRoute(emptyRolesUser),
    '/access-denied?reason=unresolved_role'
  );
  assert.equal(canUserAccessPath('/customer/dashboard', emptyRolesUser), false);

  const unknownRoleUser = toAuthUser({
    userId: 'u-unknown',
    fullName: 'Unknown Role',
    email: 'unknown@swiftdrop.lk',
    phone: null,
    roles: ['LEGACY_EXTERNAL_USER'],
    accountStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  });
  assert.equal(resolvePrimaryRole(unknownRoleUser), null);
  assert.equal(
    getDashboardRouteForRole('LEGACY_EXTERNAL_USER'),
    '/access-denied?reason=unknown_role'
  );
  assert.equal(
    resolveDashboardRoute(unknownRoleUser),
    '/access-denied?reason=unresolved_role'
  );
});
