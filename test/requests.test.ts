import { describe, expect, it } from 'vitest';
import {
	getConversation,
	idempotencyKey,
	listConversations,
	replyToVisitor,
	toHttpOptions,
} from '../nodes/Deacon/requests';

describe('toHttpOptions', () => {
	it('sends a reply as JSON to its conversation, with the Idempotency-Key it was given', () => {
		expect(
			toHttpOptions(
				'http://deacon.test/',
				replyToVisitor('kx7mqprt', 'We can export that.'),
				'n8n-key-1',
			),
		).toEqual({
			method: 'POST',
			url: 'http://deacon.test/api/v1/conversations/kx7mqprt/replies',
			body: { text: 'We can export that.' },
			json: true,
			headers: { 'Idempotency-Key': 'n8n-key-1' },
		});
	});

	it('keeps an id from a workflow inside its own path segment', () => {
		expect(toHttpOptions('https://heydeacon.com', getConversation('kx7/../../webhooks')).url).toBe(
			'https://heydeacon.com/api/v1/conversations/kx7%2F..%2F..%2Fwebhooks',
		);
	});
});

describe('listConversations', () => {
	it('sends only the filters that were filled in, as Deacon names them', () => {
		expect(
			listConversations(
				{
					email: ' sam@example.com ',
					search: '',
					tag: 'gap',
					updatedSince: '2026-11-01T09:00:00+05:00',
					waitingForReply: false,
				},
				{ limit: 50, cursor: null },
			).qs,
		).toEqual({
			email: 'sam@example.com',
			tag: 'gap',
			updated_since: '2026-11-01T09:00:00+05:00',
			limit: 50,
		});
	});
});

describe('idempotencyKey', () => {
	it('is the same when n8n retries an item, and different for the next item', () => {
		const write = { workflowId: 'wf1', executionId: '42', nodeId: 'node-1', itemIndex: 0 };

		expect({
			retried: idempotencyKey(write) === idempotencyKey({ ...write }),
			nextItem: idempotencyKey(write) === idempotencyKey({ ...write, itemIndex: 1 }),
			nextExecution: idempotencyKey(write) === idempotencyKey({ ...write, executionId: '43' }),
		}).toEqual({ retried: true, nextItem: false, nextExecution: false });
	});
});
