import { createHash } from 'node:crypto';
import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';

export const DEFAULT_BASE_URL = 'https://heydeacon.com';

/** One call to Deacon's API, before it knows where Deacon is or which key sends it. */
export type DeaconRequest = {
	method: 'GET' | 'POST' | 'DELETE';
	path: string;
	qs?: IDataObject;
	body?: IDataObject;
};

/** Which page of a list to ask for: `cursor` is null for the first. */
export type PageRequest = { limit: number; cursor: string | null };

/** The filters List conversations takes. Empty ones are left out of the request. */
export type ConversationFilters = {
	email?: string;
	search?: string;
	tag?: string;
	intent?: string;
	topic?: string;
	updatedSince?: string;
	waitingForReply?: boolean;
};

/**
 * Which way to page through events. `older` starts from the newest and pages back with `cursor`;
 * `newer` starts straight after an event's id and pages forward with `ending_before`.
 */
export type EventDirection = 'older' | 'newer';

/** An id as one segment of a path, so a value from a workflow can't reach another route. */
function segment(id: string): string {
	return encodeURIComponent(id.trim());
}

/** Only the values that were filled in, so an empty field never reaches Deacon as a filter. */
function filled(values: Record<string, string | number | boolean | null | undefined>): IDataObject {
	const kept: IDataObject = {};

	for (const [name, value] of Object.entries(values)) {
		if (value !== undefined && value !== null && value !== '') {
			kept[name] = value;
		}
	}

	return kept;
}

export function checkConnection(): DeaconRequest {
	return { method: 'GET', path: '/api/v1/team' };
}

export function listConversations(filters: ConversationFilters, page: PageRequest): DeaconRequest {
	return {
		method: 'GET',
		path: '/api/v1/conversations',
		qs: filled({
			email: filters.email?.trim(),
			search: filters.search,
			tag: filters.tag,
			intent: filters.intent,
			topic: filters.topic?.trim(),
			updated_since: filters.updatedSince,
			waiting_for_reply: filters.waitingForReply === true ? 'true' : undefined,
			limit: page.limit,
			cursor: page.cursor,
		}),
	};
}

export function getConversation(conversationId: string): DeaconRequest {
	return { method: 'GET', path: `/api/v1/conversations/${segment(conversationId)}` };
}

export function replyToVisitor(conversationId: string, text: string): DeaconRequest {
	return {
		method: 'POST',
		path: `/api/v1/conversations/${segment(conversationId)}/replies`,
		body: { text },
	};
}

export function handBack(conversationId: string): DeaconRequest {
	return { method: 'POST', path: `/api/v1/conversations/${segment(conversationId)}/hand-back` };
}

export function addText(name: string, text: string): DeaconRequest {
	return { method: 'POST', path: '/api/v1/knowledge/texts', body: { name, text } };
}

export function addPage(url: string): DeaconRequest {
	return { method: 'POST', path: '/api/v1/knowledge/pages', body: { url: url.trim() } };
}

export function markTopicDone(topicId: string): DeaconRequest {
	return { method: 'POST', path: `/api/v1/topics/${segment(topicId)}/mark-done` };
}

export function listEvents(
	types: string[],
	direction: EventDirection,
	page: PageRequest,
): DeaconRequest {
	return {
		method: 'GET',
		path: '/api/v1/events',
		qs: filled({
			type: types.join(','),
			limit: page.limit,
			[direction === 'newer' ? 'ending_before' : 'cursor']: page.cursor,
		}),
	};
}

export function addWebhook(url: string, events: string[]): DeaconRequest {
	return { method: 'POST', path: '/api/v1/webhooks', body: { url, events } };
}

export function listWebhooks(): DeaconRequest {
	return { method: 'GET', path: '/api/v1/webhooks' };
}

export function deleteWebhook(webhookId: string): DeaconRequest {
	return { method: 'DELETE', path: `/api/v1/webhooks/${segment(webhookId)}` };
}

/**
 * The Idempotency-Key for one item's write. It's the same each time n8n retries that item in
 * the same execution, so Retry On Fail never sends a visitor the same reply twice, and different
 * for every other item, node and execution.
 */
export function idempotencyKey(write: {
	workflowId: string;
	executionId: string;
	nodeId: string;
	itemIndex: number;
}): string {
	return `n8n-${createHash('sha256')
		.update([write.workflowId, write.executionId, write.nodeId, String(write.itemIndex)].join('\n'))
		.digest('hex')}`;
}

/** What n8n's request helper needs for a request to the Deacon at `baseUrl`. */
export function toHttpOptions(
	baseUrl: string,
	request: DeaconRequest,
	idempotencyKey?: string,
): IHttpRequestOptions {
	return {
		method: request.method,
		url: `${baseUrl.trim().replace(/\/+$/, '')}${request.path}`,
		...(request.qs === undefined ? {} : { qs: request.qs }),
		...(request.body === undefined ? {} : { body: request.body }),
		json: true,
		...(idempotencyKey === undefined ? {} : { headers: { 'Idempotency-Key': idempotencyKey } }),
	};
}
