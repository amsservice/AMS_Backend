export const PLANS = {
  '6M': {
    id: '6M',
    durationMonths: 6,
    pricePerStudentPerMonth: 10
  },
  '1Y': {
    id: '1Y',
    durationMonths: 12,
    pricePerStudentPerMonth: 8
  },
  '2Y': {
    id: '2Y',
    durationMonths: 24,
    pricePerStudentPerMonth: 6
  },
  '3Y': {
    id: '3Y',
    durationMonths: 36,
    pricePerStudentPerMonth: 5
  }
} as const;

export type PlanId = keyof typeof PLANS;
