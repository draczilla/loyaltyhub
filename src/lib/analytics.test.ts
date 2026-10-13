import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  activityLabel,
  calculateCustomerGrowth,
  countRewardsRedeemed,
  customerDisplayName,
  summarizeProgramPerformance,
} from './analytics.ts';

describe('calculateCustomerGrowth', () => {
  const now = new Date(2026, 2, 15, 12, 0, 0);

  it('returns 30 zero days when there are no customers', () => {
    const points = calculateCustomerGrowth([], 0, now);
    assert.equal(points.length, 30);
    assert.ok(points.every((point) => point.customers === 0 && point.growth === 0));
    assert.equal(points[points.length - 1].date.getDate(), 15);
  });

  it('counts a customer on the day they joined and keeps the total cumulative', () => {
    const points = calculateCustomerGrowth([
      { created_at: new Date(2026, 2, 14, 9, 0, 0).toISOString() },
      { created_at: new Date(2026, 2, 15, 9, 0, 0).toISOString() },
    ], 0, now);

    const fourteenth = points.find((point) => point.date.getMonth() === 2 && point.date.getDate() === 14);
    const fifteenth = points[points.length - 1];
    assert.equal(fourteenth?.customers, 1);
    assert.equal(fourteenth?.growth, 1);
    assert.equal(fifteenth.customers, 2);
    assert.equal(fifteenth.growth, 1);
  });

  it('shifts the window back by the date offset', () => {
    const current = calculateCustomerGrowth([], 0, now);
    const previous = calculateCustomerGrowth([], 1, now);
    assert.equal(previous[previous.length - 1].date.getDate(), current[0].date.getDate() - 1);
  });
});

describe('program performance', () => {
  const programs = [
    { id: 'p1', name: 'Coffee Card', type: 'stamp_card', status: 'active' },
    { id: 'p2', name: 'Points', type: 'points', status: 'paused' },
  ];

  const transactions = [
    { program_id: 'p1', type: 'stamp_added' },
    { program_id: 'p1', type: 'reward_claimed' },
    { program_id: 'p2', type: 'points_earned' },
    { program_id: 'p2', type: 'points_redeemed' },
    { program_id: 'p2', type: 'points_earned' },
    { program_id: null, type: 'manual_adjustment' },
  ];

  it('ranks programs by transaction volume and counts redemptions', () => {
    const summary = summarizeProgramPerformance(programs, transactions);
    assert.deepEqual(summary.map((program) => program.name), ['Points', 'Coffee Card']);
    assert.equal(summary[0].transactions, 3);
    assert.equal(summary[0].rewardsRedeemed, 1);
    assert.equal(summary[1].rewardsRedeemed, 1);
  });

  it('counts reward claims and point redemptions', () => {
    assert.equal(countRewardsRedeemed(transactions), 2);
  });
});

describe('activity labels', () => {
  it('names known transaction types', () => {
    assert.equal(activityLabel('stamp_added'), 'Stamp added');
    assert.equal(activityLabel('unknown'), 'Activity');
  });

  it('builds a customer name from available parts', () => {
    assert.equal(customerDisplayName({ first_name: 'Ada', last_name: 'Lovelace' }), 'Ada Lovelace');
    assert.equal(customerDisplayName({ first_name: null, last_name: null }), 'Customer');
    assert.equal(customerDisplayName(null), 'Customer');
  });
});
