import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

import type { ObjectStorage, PutObjectInput } from './object-storage.js';

@Injectable()
export class S3ObjectStorageService implements ObjectStorage {
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_ENDPOINT !== undefined,
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials:
      process.env.S3_ACCESS_KEY_ID === undefined || process.env.S3_SECRET_ACCESS_KEY === undefined
        ? undefined
        : {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
  });

  async putObject(input: PutObjectInput): Promise<void> {
    const bucket = await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  createDownloadUrl(key: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: 300,
    });
  }

  private async ensureBucket(): Promise<string> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }

    return this.bucket;
  }

  private get bucket(): string {
    const bucket = process.env.S3_BUCKET;

    if (bucket === undefined || bucket.length === 0) {
      throw new Error('S3_BUCKET is required.');
    }

    return bucket;
  }
}
