import type { IDataObject } from 'n8n-workflow';
import { isDataObject } from './guards';

/**
 * The topic of a conversation's bug report: the first question the visitor wrote that Deacon
 * took for a bug report and has grouped into a topic. A bug report's webhook usually comes before
 * its topic exists, so a ticket made from it can only find the topic later, through its chat.
 * Null when no bug report in the chat has a topic yet.
 */
export function bugReportTopicOf(conversation: IDataObject): string | null {
	const messages = Array.isArray(conversation.messages)
		? conversation.messages.filter(isDataObject)
		: [];

	const report = messages.find(
		(message) =>
			message.by === 'visitor' &&
			message.type === 'question' &&
			message.intent === 'bug_report' &&
			typeof message.topic_id === 'string' &&
			message.topic_id !== '',
	);

	return typeof report?.topic_id === 'string' ? report.topic_id : null;
}
