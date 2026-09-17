/**
 * Permanent metadata storage via IPFS, with a pinning service behind the edge proxy.
 *
 * Users pay for their own storage at deploy time and the content is pinned permanently, so the
 * platform carries no ongoing per-token storage cost. This is one of the decisions that keeps
 * running costs flat as the number of launches grows.
 */

import type { StoragePort } from '@web3eco/ports';

import { HttpClient } from './http.js';

export interface PinataOptions {
  /** Edge proxy base URL. The pinning JWT stays server-side. */
  readonly baseUrl: string;
  /** Gateway used to turn ipfs:// URIs into fetchable HTTPS URLs. */
  readonly gatewayUrl?: string;
  readonly http?: HttpClient;
  /** Reject payloads larger than this before uploading. */
  readonly maxBytes?: number;
}

interface PinResponse {
  readonly IpfsHash?: string;
  readonly cid?: string;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export class IpfsStorageAdapter implements StoragePort {
  private readonly http: HttpClient;
  private readonly gateway: string;
  private readonly maxBytes: number;

  constructor(private readonly options: PinataOptions) {
    this.http = options.http ?? new HttpClient({ timeoutMs: 30_000, maxRetries: 2 });
    this.gateway = (options.gatewayUrl ?? 'https://ipfs.io/ipfs/').replace(/\/?$/, '/');
    this.maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  }

  async pinJson(value: unknown): Promise<{ cid: string; uri: string }> {
    const body = JSON.stringify(value);
    if (body.length > this.maxBytes) {
      throw new StorageError(`JSON payload exceeds the ${this.maxBytes}-byte limit`);
    }

    const response = await this.http.postJson<PinResponse>(
      `${trimSlash(this.options.baseUrl)}/pinning/pinJSONToIPFS`,
      { pinataContent: value },
    );
    return this.toResult(response);
  }

  async pinFile(file: Blob, filename: string): Promise<{ cid: string; uri: string }> {
    if (file.size > this.maxBytes) {
      throw new StorageError(`file of ${file.size} bytes exceeds the ${this.maxBytes}-byte limit`);
    }

    const form = new FormData();
    form.append('file', file, filename);

    const text = await this.http.request(
      `${trimSlash(this.options.baseUrl)}/pinning/pinFileToIPFS`,
      { method: 'POST', body: form },
    );

    let response: PinResponse;
    try {
      response = JSON.parse(text) as PinResponse;
    } catch {
      throw new StorageError('pinning service returned a response that was not JSON');
    }
    return this.toResult(response);
  }

  /**
   * Resolve an ipfs:// or ar:// URI to something a browser can load.
   *
   * Anything already HTTP(S) is passed through unchanged, and anything else is rejected rather
   * than concatenated onto the gateway. Blindly prefixing the gateway would turn a
   * `javascript:` or `data:` URI in user-supplied token metadata into a live URL on the page.
   */
  resolveUri(uri: string): string {
    if (uri.startsWith('ipfs://')) {
      return `${this.gateway}${uri.slice('ipfs://'.length).replace(/^ipfs\//, '')}`;
    }
    if (uri.startsWith('ar://')) {
      return `https://arweave.net/${uri.slice('ar://'.length)}`;
    }
    if (uri.startsWith('https://') || uri.startsWith('http://')) {
      return uri;
    }
    throw new StorageError(`refusing to resolve URI with unsupported scheme: ${uri.slice(0, 32)}`);
  }

  private toResult(response: PinResponse): { cid: string; uri: string } {
    const cid = response.IpfsHash ?? response.cid;
    if (!cid) throw new StorageError('pinning service did not return a CID');
    return { cid, uri: `ipfs://${cid}` };
  }
}

function trimSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
