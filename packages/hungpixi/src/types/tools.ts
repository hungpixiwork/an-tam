import { z } from 'zod';

export const GetOverviewSchema = z.object({
  rangeMonths: z.union([z.literal(6), z.literal(12)]).optional().describe('Net-worth chart range in months (6 or 12). Default 12.'),
});

export const GetLedgerSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional().describe('Month as YYYY-MM. Default: current month.'),
});

export const EvaluateLifeChoiceSchema = z.object({
  title: z.string().min(2).max(80).describe('Name of the life decision (e.g. Switching career, Buying home, Starting business).'),
  cost: z.number().int().min(0).optional().describe('One-off cost in VND.'),
  durationMonths: z.number().int().min(1).max(120).optional().describe('Duration in months. Default 12.'),
  monthsWithoutIncome: z.number().int().min(0).max(120).optional().describe('Months with zero income.'),
  monthlyIncomeDelta: z.number().int().optional().describe('Monthly income change in VND (negative = decrease).'),
});

export const WhatIfAllocateSchema = z.object({
  preset: z.enum(['global_etf', 'vn_etf', 'tech_stock', 'bond', 'gold', 'real_estate']).describe('Asset allocation target.'),
  amount: z.number().int().positive().describe('Investment amount in VND.'),
  holdingMonths: z.number().int().min(1).max(600).describe('Holding period in months.'),
});

export const ProposeActionSchema = z.object({
  type: z.enum([
    'calendar.create_events',
    'budget.set',
    'goal.update_progress',
    'reminder.create',
    'sheets.update_budget',
    'notion.weekly_report',
    'gmail.send',
  ]).describe('Action type to propose for human approval.'),
  payload: z.record(z.string(), z.unknown()).describe('Typed payload matching the action type.'),
  note: z.string().max(300).optional().describe('Human-readable justification for this proposal.'),
});

export const RunDeskSchema = z.object({
  symbol: z.string().regex(/^[A-Za-z0-9]{1,12}$/).describe('Symbol to analyze (e.g. FPT, VNINDEX, SJC).'),
});
