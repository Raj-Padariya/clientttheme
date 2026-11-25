export type AppNotificationKind = 'scratch' | 'account';

export interface AppNotification {
  id: string;
  kind: AppNotificationKind;
  title: string;
  body: string;
  /** How long before "now" the notification arrived; turned into a timestamp when the store loads. */
  ageSeconds: number;
  read: boolean;
  href?: string;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const SCRATCH_HREF = '/promotion/scratch-card';
const ACCOUNTS_HREF = '/accounts';
const scratchReadyBody = 'Your next scratch card is ready to be revealed. Head over to the Scratch Card section to see what you won!';

// Newest first. The first five are copied from the reference screenshot.
export const mockNotifications: AppNotification[] = [
  { id: 'NT-10', kind: 'scratch', title: 'SCRATCH CARD NEW', body: 'A new SCRATCH CARD NEW event was recorded.', ageSeconds: 13, read: false, href: SCRATCH_HREF },
  { id: 'NT-9', kind: 'scratch', title: 'New Scratch Card Ready!', body: scratchReadyBody, ageSeconds: 9 * HOUR, read: true, href: SCRATCH_HREF },
  { id: 'NT-8', kind: 'scratch', title: 'New Scratch Card Ready!', body: scratchReadyBody, ageSeconds: 21 * HOUR, read: false, href: SCRATCH_HREF },
  { id: 'NT-7', kind: 'account', title: 'Account Created', body: 'Live account 2000079 created successfully.', ageSeconds: DAY + 2 * HOUR, read: false, href: ACCOUNTS_HREF },
  { id: 'NT-6', kind: 'scratch', title: 'Scratch Card Revealed', body: 'Better luck next time! No reward this time.', ageSeconds: DAY + 3 * HOUR, read: false, href: SCRATCH_HREF },
  // Demo items behind "Load More" (not in the screenshot); one unread so the badge reads 5 like the reference.
  { id: 'NT-5', kind: 'scratch', title: 'New Scratch Card Ready!', body: scratchReadyBody, ageSeconds: 2 * DAY + 4 * HOUR, read: false, href: SCRATCH_HREF },
  { id: 'NT-4', kind: 'account', title: 'Account Created', body: 'Demo account 2000000 created successfully.', ageSeconds: 3 * DAY, read: true, href: ACCOUNTS_HREF },
  { id: 'NT-3', kind: 'scratch', title: 'Scratch Card Revealed', body: 'Better luck next time! No reward this time.', ageSeconds: 4 * DAY + 6 * HOUR, read: true, href: SCRATCH_HREF },
  { id: 'NT-2', kind: 'scratch', title: 'New Scratch Card Ready!', body: scratchReadyBody, ageSeconds: 5 * DAY, read: true, href: SCRATCH_HREF },
  { id: 'NT-1', kind: 'account', title: 'Account Created', body: 'Live account 2000078 created successfully.', ageSeconds: 6 * DAY + 30 * MINUTE, read: true, href: ACCOUNTS_HREF },
];
