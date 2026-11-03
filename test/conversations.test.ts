import type { IDataObject } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { bugReportTopicOf } from '../nodes/Deacon/conversations';

/** A message as Read a conversation returns it, with only the fields that matter here. */
function message(fields: IDataObject): IDataObject {
	return {
		id: 'm',
		untrusted: { text: 'x' },
		by: 'visitor',
		type: 'question',
		intent: null,
		topic_id: null,
		topic_type: null,
		...fields,
	};
}

describe('bugReportTopicOf', () => {
	it("finds the topic of the chat's first bug report that has one", () => {
		expect(
			bugReportTopicOf({
				id: 'kx7mqprt',
				messages: [
					message({ intent: 'how_to', topic_id: 'hv3kq8zt', topic_type: 'how_to' }),
					message({ by: 'deacon', type: 'answer' }),
					message({ intent: 'bug_report' }),
					message({ intent: 'bug_report', topic_id: 'h4mzq8tv', topic_type: 'bug' }),
					message({ intent: 'bug_report', topic_id: 'zz9zz9zz', topic_type: 'bug' }),
				],
			}),
		).toBe('h4mzq8tv');
	});

	it('is null while no bug report in the chat has a topic yet', () => {
		expect(
			bugReportTopicOf({
				id: 'kx7mqprt',
				messages: [
					message({ intent: 'bug_report' }),
					message({ intent: 'how_to', topic_id: 'hv3kq8zt', topic_type: 'how_to' }),
				],
			}),
		).toBeNull();
	});
});
