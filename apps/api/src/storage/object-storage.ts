export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface ObjectStorage {
  putObject(input: PutObjectInput): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  createDownloadUrl(key: string): Promise<string>;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
