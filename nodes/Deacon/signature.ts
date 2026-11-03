import { createHmac, timingSafeEqual } from 'node:crypto';

/** The three headers Deacon signs each delivery with, as they arrived. */
export type SignatureHeaders = {
	id: string | undefined;
	timestamp: string | undefined;
	signature: string | undefined;
};

export type SignatureCheck =
	| { valid: true }
	| { valid: false; reason: 'missing_headers' | 'stale_timestamp' | 'no_matching_signature' };

/** Deacon's docs refuse a timestamp more than 5 minutes from now, so a recorded request can't be replayed. */
const MOST_SECONDS_APART = 300;

const SECRET_PREFIX = 'whsec_';

/**
 * Whether a delivery came from Deacon, on the Standard Webhooks scheme its docs describe: an
 * HMAC-SHA256 of `id.timestamp.body`, keyed with the secret after `whsec_` decoded from base64.
 * `webhook-signature` can hold several signatures separated by spaces (two while a secret is
 * being replaced), and any one matching is enough.
 */
export function checkSignature(input: {
	headers: SignatureHeaders;
	rawBody: Buffer;
	secret: string;
	nowSeconds: number;
}): SignatureCheck {
	const { id, timestamp, signature } = input.headers;

	if (!id || !timestamp || !/^\d+$/.test(timestamp) || !signature) {
		return { valid: false, reason: 'missing_headers' };
	}

	if (Math.abs(input.nowSeconds - Number.parseInt(timestamp, 10)) > MOST_SECONDS_APART) {
		return { valid: false, reason: 'stale_timestamp' };
	}

	const key = Buffer.from(
		input.secret.startsWith(SECRET_PREFIX)
			? input.secret.slice(SECRET_PREFIX.length)
			: input.secret,
		'base64',
	);
	const expected = createHmac('sha256', key)
		.update(`${id}.${timestamp}.`)
		.update(input.rawBody)
		.digest();

	const matches = signature.split(' ').some((candidate) => {
		if (!candidate.startsWith('v1,')) {
			return false;
		}

		const given = Buffer.from(candidate.slice('v1,'.length), 'base64');

		return given.length === expected.length && timingSafeEqual(given, expected);
	});

	return matches ? { valid: true } : { valid: false, reason: 'no_matching_signature' };
}
