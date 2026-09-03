export const DocumentKind = {
  OTHER: 'OTHER',
  POD: 'POD',
  RATE_CONFIRMATION: 'RATE_CONFIRMATION',
} as const;

export type DocumentKind = (typeof DocumentKind)[keyof typeof DocumentKind];

export interface LoadDocument {
  id: string;
  loadId: string;
  kind: DocumentKind;
  version: number;
  filename: string;
  mimeType: string;
  storageKey: string;
  isCurrent: boolean;
  createdAt: Date;
}
