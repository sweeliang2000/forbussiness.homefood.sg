export const SIGN_UP = '/api/auth/signup';
export const EMAIL_VERIFICATION = '/api/auth/confirm';
export const SIGN_IN = '/api/auth/signIn';
export const RESEND_VERIFICATION_CODE = '/api/auth/resendCode';
export const FORGOT_PASSWORD = '/api/auth/forgotPassword';
export const CONFIRM_FORGOT_PASSWORD = '/api/auth/confirmForgotPassword';
export const VERIFY_TOKEN = '/api/auth/verifytoken';
export const REFRESH_USER_COOKIE = '/api/data/refreshUserCookie';
export const GLOBAL_SIGN_OUT = '/api/auth/globalSignOut';
export const SIGN_OUT = '/api/auth/signoutuser';

export const OFFICIAL_BUSINESS_INFORMATION = '/api/data/official-business-information';
export const CUSTOMER_FACING_INFORMATION = '/api/data/customerDetails';
export const STAMP_MANAGEMENT = '/api/data/stampManagement';
export const CARD_DESIGN_SETTING = '/api/data/cardDesignSetting';
export const ADD_USER = '/api/data/InviteUser';
export const LIST_LOCATIONS = '/api/data/listOfLocations';
export const REWARDS = '/api/data/rewards';
export const CREATE_REWARD = '/api/data/reward';
export const UPDATE_REWARD = '/api/data/reward';
export const DELETE_REWARD = '/api/data/reward';
export const ARCHIVE_REWARD = '/api/data/reward/archive';

// Scan to Win QR Codes
export const SCAN_TO_WIN_QR_CODES = '/api/data/scanToWinQRCodes';
export const CREATE_SCAN_TO_WIN_QR_CODE = '/api/data/scanToWinQRCode';
export const DELETE_SCAN_TO_WIN_QR_CODE = '/api/data/scanToWinQRCode';

export const CHECKOUT_SESSION_STRIPE = '/api/subscription/create-checkout-session';
export const PREVIEW_UPGRADE_SUBSCRIPTION = '/api/subscription/preview-upgrade';
export const UPGRADE_SUBSCRIPTION = '/api/subscription/upgrade';
export const UPGRADE_STATUS = '/api/subscription/upgrade-status';
export const DOWNGRADE_SUBSCRIPTION = '/api/subscription/downgrade';
export const CANCEL_SCHEDULE = '/api/subscription/cancel-schedule';
export const SUBSCRIPTION_END_DATE = '/api/subscription/end-date';
export const CREATE_PORTAL_SESSION = '/api/subscription/create-portal-session';
export const SHOP_SUBSCRIPTION_STATUS = '/api/data/shopSubscriptionStatus';
export const REDEMPTION_CODE = '/api/data/redemption-code';
export const GET_LIST_OF_USERS = '/api/data/getListOfUsers';
export const DELETE_INVITED_USER = '/api/data/invitedUser';
export const DELETE_USER_FROM_SHOP = '/api/data/userFromShop';
export const UPDATE_USER_ROLE = '/api/data/userRole';
export const INVITATION_STATUS = '/api/auth/invitationStatus';
export const ACCEPT_INVITATION = '/api/auth/acceptInvitation';
export const REJECT_INVITATION = '/api/auth/rejectInvitation';

export const CHECKLIST_STATUS = '/api/data/checklistStatus';
export const RELEASE_STATUS = '/api/data/releaseStatus';
export const RELEASE_CONTACT = '/api/data/releaseContact';
export const SEND_FOR_REVIEW = '/api/data/sendForReview';
export const CANCEL_RELEASE = '/api/data/cancelRelease';
export const CANCEL_SCHEDULED_RELEASE = '/api/data/cancelScheduledRelease';
export const RELEASED_HISTORY = '/api/data/releasedHistory';
export const PUBLISH_UPDATE = '/api/data/publish/customer-facing-business-details';

export const STRIPE_CONNECT_ACCOUNT_STATUS = '/api/stripe-connect/account-status';
export const STRIPE_CONNECT_CREATE_ACCOUNT = '/api/stripe-connect/create-connect-account';
export const STRIPE_CONNECT_CREATE_ACCOUNT_LINK = '/api/stripe-connect/create-account-link';
export const STRIPE_CONNECT_DASHBOARD_LINK = '/api/stripe-connect/dashboard-link';

export const MENU = '/api/menu';

export const ORDERING_SETTINGS = '/api/data/orderingSettings';
export const CALENDAR_OVERRIDES = '/api/data/calendarOverrides';
export const CALENDAR_OVERRIDE = '/api/data/calendarOverride';