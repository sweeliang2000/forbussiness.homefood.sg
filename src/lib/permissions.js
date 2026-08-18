/**
 * Who may do what, in one place.
 *
 * Deliberately NOT `server-only`: the API routes enforce this matrix and the
 * console's pages read the same matrix to decide what to grey out. Two copies
 * of these rules would drift, and the drift is invisible until an Operator
 * clicks an enabled button and gets a 403 toast.
 *
 * The unit is a capability, not a route, because one capability can span
 * several endpoints (saving a draft and publishing it are the same permission)
 * and because the console needs a name for "the thing this button does".
 */

export const ROLES = { OWNER: 'Owner', MANAGER: 'Manager', OPERATOR: 'Operator' };

const { OWNER, MANAGER, OPERATOR } = ROLES;

export const CAP = {
  BUSINESS_DETAILS_EDIT: 'business_details.edit',
  CUSTOMER_DETAILS_EDIT: 'customer_details.edit',
  RELEASE_SUBMIT: 'release.submit',
  MENU_EDIT: 'menu.edit',
  MENU_AVAILABILITY: 'menu.availability',
  ORDERING_SETTINGS_EDIT: 'ordering_settings.edit',
  DELIVERY_TOGGLE: 'delivery.toggle',
  CALENDAR_OVERRIDE_EDIT: 'calendar_override.edit',
  ORDERS_MANAGE: 'orders.manage',
  SHOP_OPEN_TOGGLE: 'shop_open.toggle',
  LOYALTY_TERMINAL: 'loyalty.terminal',
  LOYALTY_CONFIG: 'loyalty.config',
  PAYMENTS_EDIT: 'payments.edit',
  USERS_INVITE: 'users.invite',
  USERS_MANAGE: 'users.manage',
  BILLING: 'billing',
};

/**
 * The three operational capabilities an Operator holds beyond the loyalty
 * terminal — sold-out, delivery on/off, and the ordering calendar — are the
 * ones that take effect immediately rather than through a publish. That is not
 * a coincidence: an Operator cannot publish, so a draft-only permission would
 * be a permission to change nothing.
 */
export const CAPABILITY_ROLES = {
  [CAP.BUSINESS_DETAILS_EDIT]: [OWNER, MANAGER],
  [CAP.CUSTOMER_DETAILS_EDIT]: [OWNER, MANAGER],
  [CAP.RELEASE_SUBMIT]: [OWNER, MANAGER],
  [CAP.MENU_EDIT]: [OWNER, MANAGER],
  [CAP.MENU_AVAILABILITY]: [OWNER, MANAGER, OPERATOR],
  [CAP.ORDERING_SETTINGS_EDIT]: [OWNER, MANAGER],
  [CAP.DELIVERY_TOGGLE]: [OWNER, MANAGER, OPERATOR],
  [CAP.CALENDAR_OVERRIDE_EDIT]: [OWNER, MANAGER, OPERATOR],
  [CAP.ORDERS_MANAGE]: [OWNER, MANAGER, OPERATOR],
  [CAP.SHOP_OPEN_TOGGLE]: [OWNER, MANAGER, OPERATOR],
  [CAP.LOYALTY_TERMINAL]: [OWNER, MANAGER, OPERATOR],
  [CAP.LOYALTY_CONFIG]: [OWNER, MANAGER],
  [CAP.PAYMENTS_EDIT]: [OWNER, MANAGER],
  [CAP.USERS_INVITE]: [OWNER, MANAGER],
  [CAP.USERS_MANAGE]: [OWNER],
  [CAP.BILLING]: [OWNER],
};

/**
 * What a route with no declared capability requires. Every write is a
 * management action until someone says otherwise, so forgetting the annotation
 * locks Operators out rather than letting them through.
 */
export const DEFAULT_WRITE_ROLES = [OWNER, MANAGER];

/**
 * Completes "Only an Owner can …" / "You are not allowed to …". Used for the
 * API's 403 message and the console's tooltip, so both say the same thing.
 */
export const CAPABILITY_LABELS = {
  [CAP.BUSINESS_DETAILS_EDIT]: 'change the official business details',
  [CAP.CUSTOMER_DETAILS_EDIT]: 'change the customer-facing details',
  [CAP.RELEASE_SUBMIT]: 'send the shop for review',
  [CAP.MENU_EDIT]: 'change the menu',
  [CAP.MENU_AVAILABILITY]: 'change item availability',
  [CAP.ORDERING_SETTINGS_EDIT]: 'change the ordering settings',
  [CAP.DELIVERY_TOGGLE]: 'turn delivery on or off',
  [CAP.CALENDAR_OVERRIDE_EDIT]: 'change the ordering calendar',
  [CAP.ORDERS_MANAGE]: 'manage orders',
  [CAP.SHOP_OPEN_TOGGLE]: 'open or close the shop',
  [CAP.LOYALTY_TERMINAL]: 'use the loyalty terminal',
  [CAP.LOYALTY_CONFIG]: 'change the loyalty programme',
  [CAP.PAYMENTS_EDIT]: 'change the payment setup',
  [CAP.USERS_INVITE]: 'invite users',
  [CAP.USERS_MANAGE]: 'manage users',
  [CAP.BILLING]: 'manage billing',
};

/** Roles allowed to exercise `capability`, or the default write set. */
export const rolesFor = (capability) =>
  (capability && CAPABILITY_ROLES[capability]) || DEFAULT_WRITE_ROLES;

/**
 * @param {string|null|undefined} role  a value from ROLES
 * @param {string} capability           a value from CAP
 */
export function can(role, capability) {
  if (!role) return false;
  return rolesFor(capability).includes(role);
}

/**
 * "Only an Owner or Manager can change the menu."
 *
 * Written from the allowed roles rather than the caller's, so it tells someone
 * who to ask instead of only that they were refused.
 */
export function deniedMessage(capability) {
  const roles = rolesFor(capability);
  const who =
    roles.length === 1
      ? roles[0]
      : `${roles.slice(0, -1).join(', ')} or ${roles[roles.length - 1]}`;
  const what = CAPABILITY_LABELS[capability] || 'perform this action';
  return `Only an ${who} can ${what}.`;
}
