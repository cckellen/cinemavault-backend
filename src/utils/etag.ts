import crypto from 'crypto';
import { Response } from 'express';

export function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

export function setConditionalHeaders(res: Response, etag: string, lastModified?: Date): void {
  res.setHeader('ETag', etag);
  if (lastModified) {
    res.setHeader('Last-Modified', lastModified.toUTCString());
  }
}

export function isNotModified(req: { headers: Record<string, string | string[] | undefined> }, etag: string, lastModified?: Date): boolean {
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch === etag || ifNoneMatch === '*') return true;

  const ifModifiedSince = req.headers['if-modified-since'];
  if (ifModifiedSince && lastModified) {
    const since = new Date(ifModifiedSince as string);
    if (!isNaN(since.getTime()) && lastModified <= since) return true;
  }

  return false;
}
