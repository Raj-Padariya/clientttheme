// Content of the IB Manager Portal "My Commission Plans" flow (reference screenshots, 2026-11-04): plan list,
// new-plan form, read-only view of an assigned plan, rename popup and assign panel. Text kept verbatim.

export type PlanStatus = 'active' | 'inactive';

export interface PlanRate {
  instrumentType: string;
  ratePerLot: number;
}

export interface PlanGroup {
  name: string;
  rates: PlanRate[];
}

export interface CommissionPlan {
  id: string;
  name: string;
  description: string;
  status: PlanStatus;
  groups: PlanGroup[];
  /** Sub-IB ids on this plan. Once anyone is on it the rates are locked. */
  assignedTo: string[];
}

export interface SubIbOption {
  id: string;
  name: string;
  email: string;
}

export interface PlanDraft {
  name: string;
  description: string;
  status: PlanStatus;
  groups: PlanGroup[];
}

export const commissionPlansCopy = {
  title: 'My Commission Plans',
  newPlan: 'New Plan',
  active: 'Active',
  inactive: 'Inactive',
  subIbsUsing: (count: number) => `${count} sub-IB${count === 1 ? '' : 's'} using`,
  lockedOnceAssigned: 'Locked once assigned',
  view: 'View',
  rename: 'Rename',
  assign: 'Assign',
  delete: 'Delete plan',
  deleteBlocked: 'A plan with sub-IBs on it cannot be deleted',
  emptyTitle: 'No plans yet',
  emptyBody: 'Create a plan to start giving your sub-IBs their rates.',
  back: 'Back',
  readOnly: 'This plan is assigned to sub-IBs, so it is read-only. Create a new plan and reassign, or ask your broker to change it.',
  planName: 'Plan name',
  planNamePlaceholder: 'e.g. Standard Sub-IB',
  description: 'Description',
  descriptionPlaceholder: 'Optional notes...',
  status: 'Status',
  parentCapNote: { before: 'Rates shown in ', strong: 'Parent cap', after: ' are the maximum you can give. You can only use groups your master plan includes.' },
  add: 'Add',
  remove: 'Remove',
  setRates: 'Set rates',
  instrumentType: 'Instrument type',
  yourRate: 'Rate / lot',
  parentCap: 'Parent cap',
  overCap: (cap: string) => `Max ${cap}`,
  tickGroups: 'Tick the groups this plan covers — at least one.',
  cancel: 'Cancel',
  createPlan: 'Create plan',
  saveChanges: 'Save changes',
  close: 'Close',
  renameTitle: 'Rename plan',
  renameNote: 'Only the name and description change. Rates, groups and blocked symbols stay exactly as they are, so sub-IBs already on this plan keep earning the same.',
  save: 'Save',
  assignTitle: (plan: string) => `Assign ${plan}`,
  assignNote: { before: 'Select a sub-IB below. They will receive ', after: ' and can start building their own downline plan from it.' },
  searchSubIb: 'Search sub-IB by name or email...',
  alreadyOnPlan: 'Already on this plan',
  noSubIbMatch: 'No sub-IB matches this search.',
};

export const statusOptions: { value: PlanStatus; label: string }[] = [
  { value: 'active', label: commissionPlansCopy.active },
  { value: 'inactive', label: commissionPlansCopy.inactive },
];

/** Groups your own master plan includes, with the most you may pass down per lot. Dummy caps — the screenshots keep the group collapsed. */
export const masterGroupCaps: PlanGroup[] = [
  {
    name: 'Standard',
    rates: [
      { instrumentType: 'Currency', ratePerLot: 5 },
      { instrumentType: 'Metals', ratePerLot: 4 },
      { instrumentType: 'Energies', ratePerLot: 4 },
    ],
  },
];

export const mockCommissionPlans: CommissionPlan[] = [
  {
    id: 'PL-1',
    name: 'hhhhn',
    description: '',
    status: 'active',
    groups: [
      {
        name: 'Standard',
        rates: [
          { instrumentType: 'Currency', ratePerLot: 3 },
          { instrumentType: 'Metals', ratePerLot: 2 },
          { instrumentType: 'Energies', ratePerLot: 2 },
        ],
      },
    ],
    assignedTo: ['SIB-1'],
  },
];

export const mockSubIbOptions: SubIbOption[] = [{ id: 'SIB-1', name: 'harry sub ib Ly', email: 'harrysubib@gmail.com' }];

export function emptyDraft(): PlanDraft {
  return { name: '', description: '', status: 'active', groups: [] };
}

export function capFor(groupName: string, instrumentType: string): number {
  const group = masterGroupCaps.find((item) => item.name === groupName);
  return group?.rates.find((rate) => rate.instrumentType === instrumentType)?.ratePerLot ?? 0;
}

export function isDraftValid(draft: PlanDraft): boolean {
  return (
    draft.name.trim() !== '' &&
    draft.groups.length > 0 &&
    draft.groups.every((group) => group.rates.every((rate) => rate.ratePerLot >= 0 && rate.ratePerLot <= capFor(group.name, rate.instrumentType)))
  );
}

export function matchesSubIb(option: SubIbOption, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === '' || option.name.toLowerCase().includes(needle) || option.email.toLowerCase().includes(needle);
}
