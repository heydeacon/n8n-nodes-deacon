import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { bugReportTopicOf } from './conversations';
import { deaconProperties } from './descriptions';
import { isDataObject, isJsonObject } from './guards';
import { collectPages, toPage, type HowMany } from './paging';
import {
	addPage,
	addText,
	getConversation,
	handBack,
	idempotencyKey,
	listConversations,
	listEvents,
	markTopicDone,
	replyToVisitor,
	type ConversationFilters,
} from './requests';
import { deaconRequest } from './transport';

function text(context: IExecuteFunctions, name: string, itemIndex: number): string {
	const value = context.getNodeParameter(name, itemIndex, '');

	return typeof value === 'string' ? value : String(value);
}

function collection(context: IExecuteFunctions, name: string, itemIndex: number): IDataObject {
	const value = context.getNodeParameter(name, itemIndex, {});

	return isDataObject(value) ? value : {};
}

function howMany(context: IExecuteFunctions, itemIndex: number): HowMany {
	if (context.getNodeParameter('returnAll', itemIndex, false) === true) {
		return { returnAll: true };
	}

	const limit = context.getNodeParameter('limit', itemIndex, 50);

	return { returnAll: false, limit: typeof limit === 'number' ? limit : 50 };
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** The key Deacon uses to do this item's write once: the one typed in, or one made for this item. */
function writeKey(context: IExecuteFunctions, itemIndex: number): string {
	return (
		optionalString(collection(context, 'options', itemIndex).idempotencyKey) ??
		idempotencyKey({
			workflowId: context.getWorkflow().id ?? '',
			executionId: context.getExecutionId(),
			nodeId: context.getNode().id,
			itemIndex,
		})
	);
}

/** Runs one item's operation, and gives what it returns as one or more items' JSON. */
async function run(
	context: IExecuteFunctions,
	resource: string,
	operation: string,
	itemIndex: number,
): Promise<IDataObject[]> {
	const call = deaconRequest.bind(context);

	if (resource === 'conversation') {
		if (operation === 'get') {
			return [await call(getConversation(text(context, 'conversationId', itemIndex)))];
		}

		if (operation === 'getAll') {
			const chosen = collection(context, 'filters', itemIndex);
			const filters: ConversationFilters = {
				email: optionalString(chosen.email),
				search: optionalString(chosen.search),
				tag: optionalString(chosen.tag),
				intent: optionalString(chosen.intent),
				topic: optionalString(chosen.topic),
				updatedSince: optionalString(chosen.updatedSince),
				waitingForReply: chosen.waitingForReply === true,
			};

			return await collectPages(
				async (page) => toPage(await call(listConversations(filters, page))),
				howMany(context, itemIndex),
			);
		}

		if (operation === 'reply') {
			return [
				await call(
					replyToVisitor(
						text(context, 'conversationId', itemIndex),
						text(context, 'text', itemIndex),
					),
					writeKey(context, itemIndex),
				),
			];
		}

		if (operation === 'handBack') {
			return [
				await call(
					handBack(text(context, 'conversationId', itemIndex)),
					writeKey(context, itemIndex),
				),
			];
		}
	}

	if (resource === 'knowledge') {
		if (operation === 'addText') {
			return [
				await call(
					addText(text(context, 'name', itemIndex), text(context, 'text', itemIndex)),
					writeKey(context, itemIndex),
				),
			];
		}

		if (operation === 'addPage') {
			return [await call(addPage(text(context, 'url', itemIndex)), writeKey(context, itemIndex))];
		}
	}

	if (resource === 'topic' && operation === 'markDone') {
		if (context.getNodeParameter('findBy', itemIndex, 'conversation') === 'topic') {
			return [await call(markTopicDone(text(context, 'topicId', itemIndex)))];
		}

		const conversationId = text(context, 'conversationId', itemIndex);
		const topicId = bugReportTopicOf(await call(getConversation(conversationId)));

		if (topicId === null) {
			throw new NodeOperationError(
				context.getNode(),
				`Conversation ${conversationId} has no bug report in a topic yet`,
				{
					itemIndex,
					description:
						'Deacon puts a question in a topic some time after answering it. Try again later, or mark the topic done by its ID.',
				},
			);
		}

		return [await call(markTopicDone(topicId))];
	}

	if (resource === 'event' && operation === 'getAll') {
		const filters = collection(context, 'filters', itemIndex);
		const types = Array.isArray(filters.types)
			? filters.types.filter((type): type is string => typeof type === 'string')
			: [];
		const after = optionalString(filters.after)?.trim() ?? null;
		const direction = after === null ? 'older' : 'newer';

		return await collectPages(
			async (page) => toPage(await call(listEvents(types, direction, page))),
			howMany(context, itemIndex),
			after,
		);
	}

	throw new NodeOperationError(
		context.getNode(),
		`The operation "${operation}" isn't supported for ${resource}`,
		{ itemIndex },
	);
}

export class Deacon implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Deacon',
		name: 'deacon',
		icon: { light: 'file:deacon.svg', dark: 'file:deacon.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Reply to visitors, add to what Deacon knows and read your chats',
		defaults: {
			name: 'Deacon',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'deaconApi',
				required: true,
			},
		],
		properties: deaconProperties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = text(this, 'resource', itemIndex);
				const operation = text(this, 'operation', itemIndex);
				const results = await run(this, resource, operation, itemIndex);

				for (const json of results) {
					returnData.push({ json, pairedItem: { item: itemIndex } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				// Both hand back an error of their own kind unchanged, so Deacon's status and message stay.
				if (error instanceof NodeApiError && isJsonObject(error)) {
					throw new NodeApiError(this.getNode(), error, { itemIndex });
				}

				throw new NodeOperationError(this.getNode(), error, { itemIndex });
			}
		}

		return [returnData];
	}
}
