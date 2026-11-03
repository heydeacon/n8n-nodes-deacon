import { describe, expect, it } from 'vitest';
import { reconcileWebhooks, toWebhooks } from '../nodes/Deacon/webhooks';

const ours = 'https://n8n.example.com/webhook/4f1c/webhook';

/** `GET /api/v1/webhooks` as Deacon's docs show it. */
const listed = toWebhooks({
	data: [
		{
			id: 'whep_ours',
			url: ours,
			events: ['visitor.reported_bug', 'visitor.left_email'],
			created_at: '2026-11-02T03:11:49Z',
			failing_since: null,
			turned_off_at: null,
		},
		{
			id: 'whep_turned_off',
			url: ours,
			events: ['visitor.reported_bug', 'visitor.left_email'],
			created_at: '2026-11-01T03:11:49Z',
			failing_since: '2026-11-01T03:11:49Z',
			turned_off_at: '2026-11-01T09:00:00Z',
		},
		{
			id: 'whep_another_workflow',
			url: 'https://n8n.example.com/webhook/9a2e/webhook',
			events: ['visitor.left_email'],
			created_at: '2026-10-30T03:11:49Z',
			failing_since: null,
			turned_off_at: '2026-10-31T03:11:49Z',
		},
	],
	has_more: false,
	next_cursor: null,
});

describe('reconcileWebhooks', () => {
	it('keeps the webhook it made, removes others at its own URL, and leaves every other URL alone', () => {
		expect(
			reconcileWebhooks(listed, {
				url: ours,
				events: ['visitor.left_email', 'visitor.reported_bug'],
				heldId: 'whep_ours',
			}),
		).toEqual({ keep: 'whep_ours', remove: ['whep_turned_off'] });
	});

	it('removes its own webhook once the chosen events change, so a new one is made', () => {
		expect(
			reconcileWebhooks(listed, {
				url: ours,
				events: ['visitor.reported_bug'],
				heldId: 'whep_ours',
			}),
		).toEqual({ keep: null, remove: ['whep_ours', 'whep_turned_off'] });
	});

	it('replaces its own webhook once Deacon has turned it off', () => {
		expect(
			reconcileWebhooks(listed, {
				url: ours,
				events: ['visitor.reported_bug', 'visitor.left_email'],
				heldId: 'whep_turned_off',
			}),
		).toEqual({ keep: null, remove: ['whep_ours', 'whep_turned_off'] });
	});
});
