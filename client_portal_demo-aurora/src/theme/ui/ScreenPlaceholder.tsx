import { translate, type MessageKey } from '@/core/i18n';
import { Card } from './Card';
import { EmptyState } from './Feedback';
import { PageHeader } from './PageHeader';

// Stand-in for screens whose design has not been delivered yet.
export function ScreenPlaceholder({ titleKey }: { titleKey: MessageKey }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate(titleKey)} />
      <Card>
        <EmptyState
          icon="dashboard"
          title={translate('common.comingSoonTitle')}
          description={translate('common.comingSoonText')}
        />
      </Card>
    </div>
  );
}
