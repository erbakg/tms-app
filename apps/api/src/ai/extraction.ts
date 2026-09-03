export const ExtractionStatus = {
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
} as const;

export type ExtractionStatus = (typeof ExtractionStatus)[keyof typeof ExtractionStatus];

export interface DocumentExtraction {
  id: string;
  documentId: string;
  status: ExtractionStatus;
  provider: string;
  model: string | null;
  result: unknown;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}
