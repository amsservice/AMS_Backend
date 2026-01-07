export const PLANS = {
  '1Y': {
    id: '1Y',
    durationMonths: 12,
    pricePerStudentPerMonth: 20
  },
  '2Y': {
    id: '2Y',
    durationMonths: 24,
    pricePerStudentPerMonth: 45
  },
  '3Y': {
    id: '3Y',
    durationMonths: 36,
    pricePerStudentPerMonth: 40
  }
} as const;

export type PlanId = keyof typeof PLANS;
