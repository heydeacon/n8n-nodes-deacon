import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { isDataObject } from './guards';

/**
 * Every event type, named as Deacon's docs name them (heydeacon.com/docs/api#event-types). The
 * events list returns all of them unless it's filtered.
 */
export const EVENT_TYPES: INodePropertyOptions[] = [
	{
		name: 'Chat Ended',
		value: 'conversation.ended',
		description:
			'The visitor starts a new chat, or it goes quiet and Deacon closes it. Holds the whole chat.',
	},
	{
		name: 'Chat Started',
		value: 'conversation.started',
		description: 'A visitor sends the first message in a chat',
	},
	{
		name: 'Signed-In Visitor Is Waiting',
		value: 'visitor.waiting_signed_in',
		description:
			'Deacon hands a visitor your server has verified over to your team. Once per chat.',
	},
	{
		name: 'Visitor Asked for a Feature',
		value: 'visitor.requested_feature',
		description:
			"Deacon decides a question is asking for something your product doesn't do. Once per chat.",
	},
	{
		name: 'Visitor Asked for a Person',
		value: 'visitor.asked_for_person',
		description: 'A visitor asks to talk to a person',
	},
	{
		name: 'Visitor Left Their Email',
		value: 'visitor.left_email',
		description: 'A visitor leaves their email. Once per chat.',
	},
	{
		name: 'Visitor Reported a Bug',
		value: 'visitor.reported_bug',
		description: 'Deacon decides a question is reporting something broken. Once per chat.',
	},
	{
		name: 'Visitor Wrote Back to a Teammate',
		value: 'visitor.wrote_back',
		description: 'A visitor sends a message in a chat a teammate has taken over',
	},
];

/**
 * The events the trigger offers: the six a founder reaches for first. `conversation.started`
 * and `visitor.waiting_signed_in` can join later.
 */
export const TRIGGER_EVENTS: INodePropertyOptions[] = EVENT_TYPES.filter(
	(event) => event.value !== 'conversation.started' && event.value !== 'visitor.waiting_signed_in',
);

/** A webhook as Deacon lists it for the key that made it. */
export type WebhookOnDeacon = {
	id: string;
	url: string;
	events: string[];
	turnedOff: boolean;
};

/** Reads `GET /api/v1/webhooks`. Rows without an id or URL are left out. */
export function toWebhooks(response: IDataObject): WebhookOnDeacon[] {
	const rows: unknown[] = Array.isArray(response.data) ? response.data : [];

	return rows.flatMap((row) => {
		if (!isDataObject(row)) {
			return [];
		}

		const { id, url, events, turned_off_at: turnedOffAt } = row;

		if (typeof id !== 'string' || typeof url !== 'string') {
			return [];
		}

		return [
			{
				id,
				url,
				events: Array.isArray(events)
					? events.filter((event): event is string => typeof event === 'string')
					: [],
				turnedOff: turnedOffAt !== null && turnedOffAt !== undefined,
			},
		];
	});
}

function sameEvents(left: string[], right: string[]): boolean {
	const wanted = new Set(right);

	return left.length === wanted.size && left.every((event) => wanted.has(event));
}

/**
 * What to do with the key's webhooks before n8n registers this trigger. Only webhooks at the
 * trigger's own URL are looked at; every other one is someone else's and stays.
 *
 * - `keep` is the one this trigger made, if it's still on and sends the events chosen now. Its
 *   secret is the one the trigger holds.
 * - `remove` is every other webhook at this URL: one Deacon turned off, one sending events no
 *   longer chosen, or one whose secret the trigger no longer holds. Each takes one of the key's
 *   10 places and could never be checked, so a fresh one replaces them.
 */
export function reconcileWebhooks(
	onDeacon: WebhookOnDeacon[],
	trigger: { url: string; events: string[]; heldId: string | undefined },
): { keep: string | null; remove: string[] } {
	const atThisUrl = onDeacon.filter((webhook) => webhook.url === trigger.url);
	const kept = atThisUrl.find(
		(webhook) =>
			webhook.id === trigger.heldId &&
			!webhook.turnedOff &&
			sameEvents(webhook.events, trigger.events),
	);

	return {
		keep: kept?.id ?? null,
		remove: atThisUrl.filter((webhook) => webhook !== kept).map((webhook) => webhook.id),
	};
}
