export const StopType = {
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP',
} as const;

export type StopType = (typeof StopType)[keyof typeof StopType];

export interface Stop {
  id: string;
  loadId: string;
  type: StopType;
  position: number;
  facilityName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string;
  appointmentAt: Date | null;
  referenceNumber: string | null;
  instructions: string | null;
}
