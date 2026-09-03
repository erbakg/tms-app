export interface ExtractionQueue {
  enqueueExtraction(extractionId: string): Promise<void>;
}

export const AI_EXTRACTION_QUEUE = Symbol('AI_EXTRACTION_QUEUE');
