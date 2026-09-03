import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await this.deriveKey(password, salt);

    return `${salt}:${derivedKey.toString('hex')}`;
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const [salt, expectedHash] = passwordHash.split(':');

    if (salt === undefined || expectedHash === undefined) {
      return false;
    }

    const expected = Buffer.from(expectedHash, 'hex');
    const actual = await this.deriveKey(password, salt);

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private deriveKey(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scryptCallback(password, salt, 64, (error, derivedKey) => {
        if (error !== null) {
          reject(error);
          return;
        }

        resolve(Buffer.from(derivedKey));
      });
    });
  }
}
