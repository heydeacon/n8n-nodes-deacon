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

	it('finds it on an older chat, where the answer carries the question and its topic', () => {
		expect(
			bugReportTopicOf({
				id: 'khfr6wb5',
				messages: [
					message({
						by: 'deacon',
						type: 'answer',
						untrusted: { text: 'Yes. Press Start timer.', question: 'Can I track time?' },
						intent: 'capability',
						topic_id: 'qd5w6mn9',
					}),
					message({
						by: 'deacon',
						type: 'answer',
						untrusted: { text: null, question: 'Sign in does nothing in Safari' },
						intent: 'bug_report',
						topic_id: 'y3gt3wnv',
						topic_type: 'bug',
					}),
				],
			}),
		).toBe('y3gt3wnv');
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
