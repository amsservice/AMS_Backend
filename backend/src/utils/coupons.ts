export const COUPONS = {
  FREE_3M: {
    code: 'FREE_3M',
    discountMonths: 3
  },
  FREE_6M: {
    code: 'FREE_6M',
    discountMonths: 6
  }
} as const;

export type CouponCode = keyof typeof COUPONS;
