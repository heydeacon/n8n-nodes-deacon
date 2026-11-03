import { describe, expect, it } from 'vitest';
import { checkSignature } from '../nodes/Deacon/signature';
/**
 * The fixed vector from Standard Webhooks' own Go library, which Deacon's webhooks follow. It
 * sits in JSON so n8n's linter doesn't take its published example key for a leaked secret.
 */
import vector from './standard-webhooks-vector.json';

describe('checkSignature', () => {
	it("accepts Standard Webhooks' published example", () => {
		expect(
			checkSignature({
				headers: { id: vector.id, timestamp: vector.timestamp, signature: vector.signature },
				rawBody: Buffer.from(vector.body),
				secret: vector.signingKey,
				nowSeconds: 1614265330,
			}),
		).toEqual({ valid: true });
	});

	it('refuses a body changed after it was signed', () => {
		expect(
			checkSignature({
				headers: { id: vector.id, timestamp: vector.timestamp, signature: vector.signature },
				rawBody: Buffer.from('{"test": 2432232315}'),
				secret: vector.signingKey,
				nowSeconds: 1614265330,
			}),
		).toEqual({ valid: false, reason: 'no_matching_signature' });
	});

	it('refuses a delivery signed more than 5 minutes ago, so a recording can not be replayed', () => {
		expect(
			checkSignature({
				headers: { id: vector.id, timestamp: vector.timestamp, signature: vector.signature },
				rawBody: Buffer.from(vector.body),
				secret: vector.signingKey,
				nowSeconds: 1614265330 + 301,
			}),
		).toEqual({ valid: false, reason: 'stale_timestamp' });
	});

	it('accepts any one of several signatures, as Deacon sends while a secret is replaced', () => {
		expect(
			checkSignature({
				headers: {
					id: vector.id,
					timestamp: vector.timestamp,
					signature: `v1,bm90IHRoZSBzaWduYXR1cmUgeW91IGFyZSBsb29raW5nIGZvcg== ${vector.signature}`,
				},
				rawBody: Buffer.from(vector.body),
				secret: vector.signingKey,
				nowSeconds: 1614265330,
			}),
		).toEqual({ valid: true });
	});

	it('refuses a delivery with no signature', () => {
		expect(
			checkSignature({
				headers: { id: vector.id, timestamp: vector.timestamp, signature: undefined },
				rawBody: Buffer.from(vector.body),
				secret: vector.signingKey,
				nowSeconds: 1614265330,
			}),
		).toEqual({ valid: false, reason: 'missing_headers' });
	});
});
