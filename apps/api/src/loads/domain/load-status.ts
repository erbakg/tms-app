export const LoadStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
} as const;

export type LoadStatus = (typeof LoadStatus)[keyof typeof LoadStatus];
