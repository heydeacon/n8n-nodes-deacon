import type { IDataObject } from 'n8n-workflow';
import { isDataObject } from './guards';

/**
 * The topic of a conversation's bug report: the first message Deacon took for a bug report and
 * has grouped into a topic. That's the visitor's question, or on older chats, where questions
 * weren't saved on their own, the answer that carries the question. Only those have an intent.
 *
 * A bug report's webhook usually comes before its topic exists, so a ticket made from it can only
 * find the topic later, through its chat. Null when no bug report in the chat has a topic yet.
 */
export function bugReportTopicOf(conversation: IDataObject): string | null {
	const messages = Array.isArray(conversation.messages)
		? conversation.messages.filter(isDataObject)
		: [];

	const report = messages.find(
		(message) =>
			message.intent === 'bug_report' &&
			typeof message.topic_id === 'string' &&
			message.topic_id !== '',
	);

	return typeof report?.topic_id === 'string' ? report.topic_id : null;
}
