'use client';

import { useState } from 'react';
import { translate } from '@/core/i18n';
import { useHistory } from '@/core/pages/useHistory';
import type { TransactionType } from '@/core/types';
import { transactionColumns } from '../history/transactionColumns';
import { Button, IconButton } from '../ui/Button';
import { Card, CardHeader, StatCard } from '../ui/Card';
import { Alert, Badge, EmptyState, Skeleton, Spinner, StatusBadge } from '../ui/Feedback';
import { Checkbox, Field, Input, PasswordInput, Select, fieldErrorId } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import { DataTable } from '../ui/Table';
import { Tabs, type TabItem } from '../ui/Tabs';

type KitTab = 'all' | TransactionType;

const kitTabs: TabItem<KitTab>[] = [
  { value: 'all', label: translate('uiKit.tabAll') },
  { value: 'deposit', label: translate('txType.deposit') },
  { value: 'withdrawal', label: translate('txType.withdrawal') },
  { value: 'transfer', label: translate('txType.transfer') },
];

export default function UiKitPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<KitTab>('all');
  const { data, isLoading } = useHistory();
  const rows = data?.filter((tx) => tab === 'all' || tx.type === tab);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('uiKit.title')} description={translate('uiKit.subtitle')} />

      <Card>
        <CardHeader title={translate('uiKit.buttons')} />
        <div className="flex flex-wrap items-center gap-3">
          <Button>{translate('uiKit.primary')}</Button>
          <Button variant="secondary">{translate('uiKit.secondary')}</Button>
          <Button variant="outline">{translate('uiKit.outline')}</Button>
          <Button variant="ghost">{translate('uiKit.ghost')}</Button>
          <Button variant="danger">{translate('uiKit.danger')}</Button>
          <Button loading>{translate('uiKit.loading')}</Button>
          <Button size="sm" leftIcon="plus">
            {translate('uiKit.small')}
          </Button>
          <Button size="lg" rightIcon="chevronRight">
            {translate('uiKit.large')}
          </Button>
          <IconButton icon="bell" label={translate('common.notifications')} />
        </div>
      </Card>

      <Card>
        <CardHeader title={translate('uiKit.inputs')} />
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={translate('uiKit.sampleLabel')} htmlFor="kit-amount" hint={translate('uiKit.sampleHint')}>
            <Input id="kit-amount" inputMode="decimal" leftIcon="wallet" placeholder={translate('uiKit.samplePlaceholder')} />
          </Field>
          <Field label={translate('uiKit.sampleLabel')} htmlFor="kit-amount-error" error={translate('uiKit.sampleError')}>
            <Input
              id="kit-amount-error"
              invalid
              defaultValue="25000"
              aria-describedby={fieldErrorId('kit-amount-error')}
            />
          </Field>
          <Field label={translate('auth.password')} htmlFor="kit-password">
            <PasswordInput id="kit-password" placeholder={translate('auth.passwordPlaceholder')} />
          </Field>
          <Field label={translate('uiKit.sampleSelect')} htmlFor="kit-method" optional>
            <Select id="kit-method" defaultValue="bank">
              <option value="bank">{translate('uiKit.optionOne')}</option>
              <option value="usdt">{translate('uiKit.optionTwo')}</option>
            </Select>
          </Field>
          <Checkbox label={translate('uiKit.sampleCheckbox')} defaultChecked />
        </div>
      </Card>

      <Card>
        <CardHeader title={translate('uiKit.feedback')} />
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{translate('uiKit.badgeNeutral')}</Badge>
            <Badge tone="primary" dot>
              {translate('uiKit.badgePrimary')}
            </Badge>
            <StatusBadge status="pending" />
            <StatusBadge status="processing" />
            <StatusBadge status="approved" />
            <StatusBadge status="rejected" />
            <Spinner label={translate('common.loading')} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Alert tone="info">{translate('uiKit.alertInfo')}</Alert>
            <Alert tone="success">{translate('uiKit.alertSuccess')}</Alert>
            <Alert tone="warning">{translate('uiKit.alertWarning')}</Alert>
            <Alert tone="danger">{translate('uiKit.alertDanger')}</Alert>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <EmptyState title={translate('common.noDataTitle')} description={translate('common.noDataText')} />
        </div>
      </Card>

      <section aria-label={translate('uiKit.stats')} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={translate('dashboard.walletBalance')} value="$12,480.50" icon="wallet" hint="+4.2%" trend="up" />
        <StatCard label={translate('dashboard.totalDeposits')} value="$8,200.00" icon="deposit" />
        <StatCard label={translate('dashboard.totalWithdrawals')} value="$1,350.00" icon="withdrawal" hint="-1.1%" trend="down" />
        <StatCard label={translate('dashboard.tradingAccounts')} value="" icon="accounts" loading />
      </section>

      <Card>
        <CardHeader
          title={translate('uiKit.table')}
          action={<Tabs items={kitTabs} value={tab} onChange={setTab} ariaLabel={translate('uiKit.table')} />}
        />
        <DataTable
          columns={transactionColumns}
          rows={rows}
          rowKey={(tx) => tx.id}
          loading={isLoading}
          caption={translate('uiKit.table')}
        />
      </Card>

      <Card>
        <CardHeader title={translate('uiKit.overlays')} />
        <Button variant="outline" onClick={() => setModalOpen(true)}>
          {translate('uiKit.openModal')}
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={translate('uiKit.modalTitle')}
          description={translate('uiKit.modalText')}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                {translate('common.cancel')}
              </Button>
              <Button onClick={() => setModalOpen(false)}>{translate('common.confirm')}</Button>
            </>
          }
        />
      </Card>
    </div>
  );
}
