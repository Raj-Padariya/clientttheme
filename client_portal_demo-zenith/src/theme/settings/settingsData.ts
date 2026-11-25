import type { IconName } from '../ui/Icon';

export type SettingsTabId = 'profile' | 'documents' | 'withdrawal' | 'activities' | 'security' | 'email';

export interface SettingsTab {
  id: SettingsTabId;
  label: string;
  icon: IconName;
}

export const settingsTabs: SettingsTab[] = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'documents', label: 'Documents', icon: 'fileText' },
  { id: 'withdrawal', label: 'Withdrawal Methods', icon: 'withdrawal' },
  { id: 'activities', label: 'Activities', icon: 'history' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'email', label: 'Email Preferences', icon: 'bell' },
];

export const accountIdentity = {
  initials: 'DI',
  name: 'demo ib',
  email: 'demoib@gmail.com',
  completeCta: 'Complete Your Profile',
};

export type ProfileFieldId =
  | 'mobile'
  | 'firstName'
  | 'lastName'
  | 'title'
  | 'gender'
  | 'dateOfBirth'
  | 'country'
  | 'nationality'
  | 'state'
  | 'city'
  | 'addressLine1'
  | 'addressLine2'
  | 'pincode';

export interface ProfileField {
  id: ProfileFieldId;
  label: string;
  required: boolean;
  kind: 'text' | 'date' | 'textarea' | 'phone';
  section: 'basic' | 'address';
}

export const profileSections = {
  basic: 'Basic Profile Information',
  address: 'Residential Address',
} as const;

export const profileEmail = { label: 'Email Address', value: 'demoib@gmail.com' };
export const phoneCountry = { dialCode: '+244', country: 'Angola' };

export const profileFields: ProfileField[] = [
  { id: 'mobile', label: 'Mobile Number', required: true, kind: 'phone', section: 'basic' },
  { id: 'firstName', label: 'First Name', required: true, kind: 'text', section: 'basic' },
  { id: 'lastName', label: 'Last Name', required: true, kind: 'text', section: 'basic' },
  { id: 'title', label: 'Title', required: true, kind: 'text', section: 'basic' },
  { id: 'gender', label: 'Gender', required: true, kind: 'text', section: 'basic' },
  { id: 'dateOfBirth', label: 'Date of Birth (18+)', required: true, kind: 'date', section: 'basic' },
  { id: 'country', label: 'Country', required: true, kind: 'text', section: 'address' },
  { id: 'nationality', label: 'Nationality', required: true, kind: 'text', section: 'address' },
  { id: 'state', label: 'State', required: true, kind: 'text', section: 'address' },
  { id: 'city', label: 'City', required: true, kind: 'text', section: 'address' },
  { id: 'addressLine1', label: 'Address Line 1', required: true, kind: 'textarea', section: 'address' },
  { id: 'addressLine2', label: 'Address Line 2', required: false, kind: 'textarea', section: 'address' },
  { id: 'pincode', label: 'Pincode / ZIP', required: false, kind: 'text', section: 'address' },
];

export const initialProfileValues: Record<ProfileFieldId, string> = {
  mobile: '9876789876',
  firstName: 'demo',
  lastName: 'ib',
  title: 'Mr',
  gender: '',
  dateOfBirth: '2008-06-30',
  country: 'Angola',
  nationality: 'Angolan',
  state: 'Cunene Province',
  city: '',
  addressLine1: 'hjgj',
  addressLine2: 'hjwe',
  pincode: '987898',
};

export const profileSaveLabel = 'Save & Continue';

export type DocumentStatus = 'approved' | 'under_review';

export interface VerificationDocument {
  id: string;
  group: 'identity' | 'address';
  title: string;
  description: string;
  status: DocumentStatus;
  required: boolean;
}

export const documentGroups = {
  identity: 'Identity Documents',
  address: 'Address Documents',
} as const;

export const documentStatusLabel: Record<DocumentStatus, string> = {
  approved: 'APPROVED',
  under_review: 'UNDER REVIEW',
};

export const verificationStatus = {
  heading: 'Verification Status',
  status: 'under_review' as DocumentStatus,
  message: 'Your documents are being reviewed by our verification team.',
  refreshStatus: 'Refresh Status',
  refreshDocuments: 'Refresh Documents',
  view: 'View',
  notRequired: 'Not Required',
};

export const verificationDocuments: VerificationDocument[] = [
  { id: 'id-front', group: 'identity', title: 'ID Proof Front', description: 'Valid passport or national ID (front side)', status: 'approved', required: true },
  { id: 'id-back', group: 'identity', title: 'ID Proof Back', description: 'Valid passport or national ID (back side)', status: 'approved', required: false },
  { id: 'address-front', group: 'address', title: 'Address Proof Front', description: 'Recent utility bill or address proof (front side)', status: 'approved', required: true },
  { id: 'address-back', group: 'address', title: 'Address Proof Back', description: 'Address proof document (back side)', status: 'under_review', required: true },
];

export const cryptoNetworks = [
  'TRC-20',
  'BEP-20',
  'ERC-20',
  'USDT ERC20',
  'USDT BEP20',
  'USDT TRC20',
  'USDT SOL',
  'USDT POLYGON',
  'USDT TON',
  'USDT OPTIMISM',
  'USDT ARBITRUM',
  'USDC ERC20',
  'USDC BEP20',
  'USDC SOL',
  'USDC BASE',
  'USDC POLYGON',
  'USDC OPTIMISM',
  'USDC ARBITRUM',
  'DOGECOIN',
  'TRX',
];

export const withdrawalFormCopy = {
  cryptoHeading: 'Cryptocurrency Details',
  cryptoSubtitle: 'Enter your cryptocurrency information',
  network: 'Network',
  networkPlaceholder: 'Select network',
  networkHint: 'Only networks enabled by your broker are listed.',
  cryptoAddress: 'Crypto Address',
  cryptoProof: 'Crypto Proof Image',
  localHeading: 'Local Transfer Details',
  localSubtitle: 'Enter your local transfer information',
  holderName: 'Holder Name',
  holderPlaceholder: 'Enter holder name',
  holderHint: 'Only letters, spaces, hyphens, apostrophes, and periods are allowed',
  localProof: 'Local Proof Image',
  chooseFile: 'Choose File',
  noFile: 'No file chosen',
  cancel: 'Cancel',
  sendOtp: 'Send OTP',
};

export interface WithdrawalMethodOption {
  id: 'crypto' | 'local';
  label: string;
  icon: IconName;
}

export const withdrawalCopy = {
  heading: 'Add Withdrawal Method',
  subtitle: 'Choose a withdrawal method and fill in the details below.',
  refresh: 'Refresh',
  listHeading: 'Your Withdrawal Methods',
  empty: 'No withdrawal methods added yet',
};

export const withdrawalMethodOptions: WithdrawalMethodOption[] = [
  { id: 'crypto', label: 'Cryptocurrency', icon: 'crypto' },
  { id: 'local', label: 'Local Transfer', icon: 'bank' },
];

export interface LoginSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActivity: string;
  current: boolean;
}

export const sessionsCopy = {
  heading: 'Active Sessions',
  description: "These are the devices that have logged into your account. You can revoke any session that you don't recognize.",
  currentBadge: 'CURRENT SESSION',
  activeNow: 'Active now',
  lastActivityPrefix: 'Last activity:',
  logout: 'Logout',
};

export const loginSessions: LoginSession[] = [
  { id: 's1', device: 'Windows PC', location: 'Ahmedabad, Gujarat, India', ip: '171.61.163.0', lastActivity: 'Active now', current: true },
  { id: 's2', device: 'Macintosh', location: 'Ahmedabad, Gujarat, India', ip: '171.61.164.211', lastActivity: 'Just now', current: false },
  { id: 's3', device: 'Macintosh', location: 'Ahmedabad, Gujarat, India', ip: '171.61.166.129', lastActivity: '9/22/2026', current: false },
  { id: 's4', device: 'Windows PC', location: 'Ahmedabad, Gujarat, India', ip: '171.61.166.129', lastActivity: '9/9/2026', current: false },
  { id: 's5', device: 'Windows PC', location: 'Ahmedabad, Gujarat, India', ip: '171.61.166.129', lastActivity: '9/9/2026', current: false },
  { id: 's6', device: 'Linux PC', location: 'Jamnagar, Gujarat, India', ip: '152.59.15.83', lastActivity: '9/7/2026', current: false },
  { id: 's7', device: 'Linux PC', location: 'Ahmedabad, Gujarat, India', ip: '171.61.165.83', lastActivity: '8/13/2026', current: false },
  { id: 's8', device: 'Linux PC', location: 'Ahmedabad, Gujarat, India', ip: '171.61.163.167', lastActivity: '7/21/2026', current: false },
];

export const activitiesCopy = {
  heading: 'Account Activities',
  subtitle: 'View your activity history, filter events, and manage active login sessions.',
  filtersHeading: 'Activity Filters',
  activityType: 'Activity Type',
  dateRange: 'Date Range',
  status: 'Status',
  apply: 'Apply Filters',
  cancel: 'Cancel',
  recentHeading: 'Recent Activities',
  countSuffix: 'ACTIVITIES',
  ipAddress: 'IP ADDRESS',
  location: 'LOCATION',
  device: 'DEVICE',
};

export const activityTypeOptions = ['All Activities', 'Successful Login'] as const;
export const activityStatusOptions = ['All Status', 'Success'] as const;
export const dateRangeOptions = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
] as const;

export interface AccountActivity {
  id: string;
  title: (typeof activityTypeOptions)[number];
  detail: string;
  status: 'SUCCESS';
  timeAgo: string;
  daysAgo: number;
  ip: string;
  location: string;
  device: string;
}

export const accountActivities: AccountActivity[] = [
  { id: 'a1', title: 'Successful Login', detail: 'Logged in from Macintosh', status: 'SUCCESS', timeAgo: '20 hours ago', daysAgo: 1, ip: '171.61.164.211', location: 'Ahmedabad, Gujarat, India', device: 'Macintosh' },
  { id: 'a2', title: 'Successful Login', detail: 'Logged in from Windows PC', status: 'SUCCESS', timeAgo: '4 days ago', daysAgo: 4, ip: '171.61.163.0', location: 'Ahmedabad, Gujarat, India', device: 'Windows PC' },
  { id: 'a3', title: 'Successful Login', detail: 'Logged in from Macintosh', status: 'SUCCESS', timeAgo: '5 days ago', daysAgo: 5, ip: '171.61.163.0', location: 'Ahmedabad, Gujarat, India', device: 'Macintosh' },
];

export const securityCopy = {
  passwordHeading: 'Password Security',
  verified: 'VERIFIED',
  lastChanged: 'Last changed: 9/28/2026',
  changePassword: 'Change Password',
  apiHeading: 'Robot Trading API Key',
  apiIntroBefore: 'Use one API key with your account number for self-hosted trading. Send requests with',
  apiCodeAccount: 'account number',
  apiIntroMiddle: 'and',
  apiCodeHeader: 'X-API-Key',
  apiIntroAfter: 'header.',
  apiDisabledTitle: 'This feature is not enabled for your account. Contact Administrator to activate Robot Trading.',
  apiDisabledBody: 'Once enabled, you will be able to generate an API key and use it with your self-hosted account numbers.',
};

export interface EmailPreference {
  id: 'promotions' | 'newsletters' | 'product';
  title: string;
  description: string;
  icon: IconName;
}

export const emailCopy = {
  heading: 'Email Notifications',
  subtitle: "Choose which marketing emails you'd like to receive. Important account emails are always sent.",
  marketingHeading: 'Marketing emails',
  alwaysOnHeading: 'Always-on emails',
  alwaysOnBody:
    "For your security and account activity, these emails are always delivered and can't be turned off: login & security alerts, deposits, withdrawals, KYC status, and scheduled maintenance notices.",
  save: 'Save Preferences',
};

export const alwaysOnEmails: { label: string; icon: IconName }[] = [
  { label: 'Login & security alerts', icon: 'lock' },
  { label: 'Deposits', icon: 'deposit' },
  { label: 'Withdrawals', icon: 'withdrawal' },
  { label: 'KYC status', icon: 'kyc' },
  { label: 'Scheduled maintenance notices', icon: 'settings' },
];

export const emailPreferences: EmailPreference[] = [
  { id: 'promotions', title: 'Promotions & offers', description: 'Bonuses, campaigns and special offers.', icon: 'gift' },
  { id: 'newsletters', title: 'Newsletters', description: 'Market updates and periodic newsletters.', icon: 'mail' },
  { id: 'product', title: 'Product updates', description: 'New features and platform announcements.', icon: 'bolt' },
];
