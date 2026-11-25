import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { Transaction } from '@/core/types';
import { StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import type { Column } from '../ui/Table';

const typeIcon: Record<Transaction['type'], IconName> = {
  deposit: 'deposit',
  withdrawal: 'withdrawal',
  transfer: 'transfer',
  internal: 'transfer',
};

export const transactionColumns: Column<Transaction>[] = [
  {
    key: 'type',
    header: translate('table.type'),
    render: (tx) => (
      <span className="inline-flex items-center gap-2.5 font-medium">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-muted">
          <Icon name={typeIcon[tx.type]} size={16} />
        </span>
        {translate(`txType.${tx.type}`)}
      </span>
    ),
  },
  { key: 'date', header: translate('table.date'), render: (tx) => <span className="text-fg-muted">{formatDate(tx.createdAt)}</span> },
  { key: 'account', header: translate('table.account'), render: (tx) => <span className="font-mono text-xs">{tx.accountLogin}</span> },
  { key: 'method', header: translate('table.method'), render: (tx) => tx.method },
  {
    key: 'amount',
    header: translate('table.amount'),
    align: 'right',
    render: (tx) => <span className="font-semibold tabular-nums">{formatMoney(tx.amount, tx.currency)}</span>,
  },
  { key: 'status', header: translate('table.status'), align: 'right', render: (tx) => <StatusBadge status={tx.status} /> },
];
