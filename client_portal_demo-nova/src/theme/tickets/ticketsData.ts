import type { IconName } from '../ui/Icon';

export type TicketCategory = 'sales' | 'account' | 'support';
export type TicketStatus = 'open' | 'inProgress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  subject: string;
  message: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  assignee: string | null;
}

export interface TicketAttachment {
  name: string;
  size: number;
}

export type TicketActivity =
  | { kind: 'message'; id: string; author: string; body: string; at: Date; attachments: TicketAttachment[] }
  | { kind: 'status'; id: string; author: string; from: TicketStatus; to: TicketStatus; at: Date };

export const initialTickets: Ticket[] = [
  {
    id: 'WxJw5zSD',
    subject: 'xv',
    message: 'asASAD',
    category: 'sales',
    status: 'inProgress',
    priority: 'urgent',
    createdAt: new Date(2026, 7, 17),
    assignee: null,
  },
];

/** Thread copied from the ticket screenshot, oldest first. */
export const ticketActivity: Record<string, TicketActivity[]> = {
  WxJw5zSD: [
    { kind: 'message', id: 'm1', author: 'Assigned', body: 'asASAD', at: new Date(2026, 7, 17, 13, 16, 20), attachments: [] },
    { kind: 'status', id: 's1', author: 'Support Team', from: 'open', to: 'resolved', at: new Date(2026, 7, 17, 13, 18, 3) },
    { kind: 'status', id: 's2', author: 'Support Team', from: 'resolved', to: 'inProgress', at: new Date(2026, 7, 22, 17, 1, 20) },
    { kind: 'status', id: 's3', author: 'Support Team', from: 'inProgress', to: 'resolved', at: new Date(2026, 9, 8, 12, 24, 4) },
    { kind: 'status', id: 's4', author: 'Support Team', from: 'resolved', to: 'open', at: new Date(2026, 9, 8, 12, 24, 6) },
    { kind: 'status', id: 's5', author: 'Support Team', from: 'open', to: 'inProgress', at: new Date(2026, 9, 8, 12, 24, 10) },
  ],
};

export const ticketDetailCopy = {
  backToTickets: 'Back to Tickets',
  ticket: 'Ticket',
  ticketDetails: 'Ticket details',
  reference: 'Reference',
  status: 'Status',
  department: 'Department',
  created: 'Created',
  priority: 'Priority',
  assignee: 'Assignee',
  assigned: 'Assigned',
  manageTicket: 'Manage ticket',
  markResolved: 'Mark as resolved',
  closeTicket: 'Close ticket',
  reopenTicket: 'Reopen ticket',
  messagePlaceholder: 'Enter your message here',
  attachFiles: 'Attach file(s)',
  postReply: 'Post reply',
  all: 'All',
  attachments: 'Attachments',
  noAttachments: 'No attachments on this ticket yet.',
  replyPosted: 'Reply posted',
  statusUpdated: 'Ticket status updated',
  copied: 'Reference copied',
  notFoundTitle: 'Ticket not found',
  notFoundHint: 'This ticket does not exist or is no longer available.',
  you: 'Demo Ib',
  statusChanged: (from: string, to: string) => `Status changed from ${from} to ${to}`,
};

export const MESSAGE_MAX_LENGTH = 1000;
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_EXTENSIONS = ['pdf', 'doc', 'docx'];
export const ATTACHMENT_ACCEPT = 'image/*,.pdf,.doc,.docx';

/** Copied from the New Ticket screenshot. */
export const createTicketCopy = {
  title: 'New Ticket',
  department: 'Department',
  selectDepartment: 'Select Department',
  priority: 'Priority',
  selectPriority: 'Select Priority',
  subject: 'Subject',
  subjectPlaceholder: 'Brief description of your issue',
  description: 'Description',
  descriptionPlaceholder: 'Please provide detailed information about your issue...',
  attachment: 'Attachment (Optional)',
  browseFiles: 'Browse files',
  dropHint: 'Click to select file, drag and drop, or paste (Ctrl+V) image',
  supportedFormats: 'Supported formats: Images, PDF, DOC, DOCX (Max 5MB)',
  attachmentRejected: 'Some files were skipped. Only images, PDF, DOC and DOCX up to 5MB are allowed.',
  required: 'This field is required',
  cancel: 'Cancel',
  submit: 'Create Ticket',
  created: 'Ticket created',
};

export const departmentLabel: Record<TicketCategory, string> = {
  sales: 'Sales Department',
  account: 'Account Department',
  support: 'Support Department',
};

/** Matches the sentence case in the activity log ("In progress"), unlike the title-case status chips. */
export const statusChangeLabel: Record<TicketStatus, string> = {
  open: 'Open',
  inProgress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const categoryIcon: Record<TicketCategory, IconName> = { sales: 'card', account: 'user', support: 'inbox' };
export const statuses: TicketStatus[] = ['open', 'inProgress', 'resolved', 'closed'];
export const priorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];
export const trackerSteps: TicketStatus[] = ['open', 'inProgress', 'resolved'];

export const priorityStyle: Record<TicketPriority, { edge: string; chip: string }> = {
  low: { edge: 'bg-success', chip: 'bg-success-soft text-success' },
  medium: { edge: 'bg-info', chip: 'bg-info-soft text-info' },
  high: { edge: 'bg-warning', chip: 'bg-warning-soft text-warning' },
  urgent: { edge: 'bg-danger', chip: 'bg-danger-soft text-danger' },
};

export const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const timestampFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
});

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
