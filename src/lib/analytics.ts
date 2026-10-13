export interface CustomerGrowthPoint {
  month: string;
  customers: number;
  growth: number;
  growthPercentage: number;
  date: Date;
}

export interface ProgramSummaryInput {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface ProgramPerformance extends ProgramSummaryInput {
  transactions: number;
  rewardsRedeemed: number;
}

export const REDEMPTION_TYPES = ['reward_claimed', 'points_redeemed'] as const;

export function isRedemption(type: string): boolean {
  return (REDEMPTION_TYPES as readonly string[]).includes(type);
}

export function calculateCustomerGrowth(
  customers: Array<{ created_at: string }>,
  offset = 0,
  now = new Date(),
): CustomerGrowthPoint[] {
  const daysData: CustomerGrowthPoint[] = [];
  const totalDays = 30;

  const baseDate = new Date(now);
  baseDate.setDate(now.getDate() - (offset * totalDays));

  for (let i = totalDays - 1; i >= 0; i--) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() - i);
    currentDate.setHours(23, 59, 59, 999);

    const customersUpToDate = customers.filter(
      (customer) => new Date(customer.created_at) <= currentDate,
    ).length;

    const previousDayCustomers = daysData.length > 0 ? daysData[daysData.length - 1].customers : 0;
    const growth = customersUpToDate - previousDayCustomers;
    const growthPercentage = previousDayCustomers > 0
      ? Math.round((growth / previousDayCustomers) * 100)
      : customersUpToDate > 0 ? 100 : 0;

    daysData.push({
      month: currentDate.getDate().toString(),
      customers: customersUpToDate,
      growth,
      growthPercentage,
      date: new Date(currentDate),
    });
  }

  return daysData;
}

export function countRewardsRedeemed(transactions: Array<{ type: string }>): number {
  return transactions.filter((transaction) => isRedemption(transaction.type)).length;
}

export function summarizeProgramPerformance(
  programs: ProgramSummaryInput[],
  transactions: Array<{ program_id: string | null; type: string }>,
): ProgramPerformance[] {
  return programs
    .map((program) => {
      const related = transactions.filter((transaction) => transaction.program_id === program.id);
      return {
        ...program,
        transactions: related.length,
        rewardsRedeemed: countRewardsRedeemed(related),
      };
    })
    .sort((a, b) => b.transactions - a.transactions || a.name.localeCompare(b.name));
}

export function activityLabel(type: string): string {
  switch (type) {
    case 'points_earned':
      return 'Points earned';
    case 'points_redeemed':
      return 'Points redeemed';
    case 'stamp_added':
      return 'Stamp added';
    case 'reward_claimed':
      return 'Reward claimed';
    case 'manual_adjustment':
      return 'Manual adjustment';
    default:
      return 'Activity';
  }
}

export function customerDisplayName(
  customer: { first_name?: string | null; last_name?: string | null } | null,
): string {
  if (!customer) return 'Customer';
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim();
  return name || 'Customer';
}
