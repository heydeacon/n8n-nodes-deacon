import type { INodeProperties } from 'n8n-workflow';
import { EVENT_TYPES } from './webhooks';

const conversationOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['conversation'] } },
	options: [
		{
			name: 'Get',
			value: 'get',
			description: 'Get a conversation and its messages',
			action: 'Get a conversation',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			description: 'Get conversations, most recently active first',
			action: 'Get many conversations',
		},
		{
			name: 'Hand Back',
			value: 'handBack',
			description: 'Hand a chat a teammate took over back to Deacon',
			action: 'Hand back a conversation',
		},
		{
			name: 'Reply',
			value: 'reply',
			description: 'Reply to the visitor as the person who made the API key',
			action: 'Reply to a visitor',
		},
	],
	default: 'get',
};

const conversationId: INodeProperties = {
	displayName: 'Conversation ID',
	name: 'conversationId',
	type: 'string',
	required: true,
	default: '',
	placeholder: 'kx7mqprt',
	description: "The conversation's ID. Each Deacon Trigger event has it under its conversation.",
	displayOptions: { show: { resource: ['conversation'], operation: ['get', 'handBack', 'reply'] } },
};

const replyText: INodeProperties = {
	displayName: 'Text',
	name: 'text',
	type: 'string',
	typeOptions: { rows: 4 },
	required: true,
	default: '',
	description:
		'The reply, up to 4,000 characters. If the visitor left an email, Deacon also emails it about a minute later.',
	displayOptions: { show: { resource: ['conversation'], operation: ['reply'] } },
};

const writeOptions = (resource: string, operations: string[]): INodeProperties => ({
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	displayOptions: { show: { resource: [resource], operation: operations } },
	options: [
		{
			displayName: 'Idempotency Key',
			name: 'idempotencyKey',
			type: 'string',
			default: '',
			description:
				"Deacon does a write sent twice with the same key only once. Leave it empty and the node makes one that stays the same when n8n retries this item. Use the trigger's event ID to write once per event.",
		},
	],
});

const returnAll = (resource: string): INodeProperties => ({
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	default: false,
	description: 'Whether to return all results or only up to a given limit',
	displayOptions: { show: { resource: [resource], operation: ['getAll'] } },
});

const limit = (resource: string): INodeProperties => ({
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	typeOptions: { minValue: 1 },
	default: 50,
	description: 'Max number of results to return',
	displayOptions: { show: { resource: [resource], operation: ['getAll'], returnAll: [false] } },
});

const conversationFilters: INodeProperties = {
	displayName: 'Filters',
	name: 'filters',
	type: 'collection',
	placeholder: 'Add Filter',
	default: {},
	displayOptions: { show: { resource: ['conversation'], operation: ['getAll'] } },
	description: 'Only one of Intent, Topic ID and Waiting for Reply can be used at a time',
	options: [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
			description:
				"Chats where a teammate's reply would be emailed to this address, whether the visitor typed it or their sign-in proved it",
		},
		{
			displayName: 'Intent',
			name: 'intent',
			type: 'options',
			default: 'bug_report',
			description: 'Chats with a question of this type',
			options: [
				{ name: 'Account or Billing', value: 'account_billing' },
				{ name: 'Bug Report', value: 'bug_report' },
				{ name: 'Capability', value: 'capability' },
				{ name: 'Chit-Chat', value: 'chit_chat' },
				{ name: 'Feature Request', value: 'feature_request' },
				{ name: 'Feedback', value: 'feedback' },
				{ name: 'How To', value: 'how_to' },
				{ name: 'Other', value: 'other' },
				{ name: 'Pricing', value: 'pricing' },
				{ name: 'Wants a Person', value: 'human_request' },
			],
		},
		{
			displayName: 'Search',
			name: 'search',
			type: 'string',
			default: '',
			description: 'Chats where a visitor typed this exact phrase',
		},
		{
			displayName: 'Tag',
			name: 'tag',
			type: 'options',
			default: 'gap',
			description: 'Chats with an answer of this type',
			options: [
				{ name: 'Answered', value: 'answered' },
				{ name: "Capped (Plan's Answers Ran Out)", value: 'capped' },
				{ name: 'Dismissed', value: 'dismissed' },
				{ name: 'Failed', value: 'failed' },
				{ name: "Gap (Couldn't Answer From Your Knowledge)", value: 'gap' },
				{ name: 'Handoff (Asked for a Person)', value: 'handoff' },
			],
		},
		{
			displayName: 'Topic ID',
			name: 'topic',
			type: 'string',
			default: '',
			description: 'Chats with a question in this topic',
		},
		{
			displayName: 'Updated Since',
			name: 'updatedSince',
			type: 'dateTime',
			default: '',
			description: 'Chats active at or after this time',
		},
		{
			displayName: 'Waiting for Reply',
			name: 'waitingForReply',
			type: 'boolean',
			default: true,
			description:
				'Whether to only return chats where a visitor left their email and is still waiting for a reply',
		},
	],
};

const knowledgeOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['knowledge'] } },
	options: [
		{
			name: 'Add Page',
			value: 'addPage',
			description: 'Add a page by its URL. Uses one of your monthly pages.',
			action: 'Add a page to knowledge',
		},
		{
			name: 'Add Text',
			value: 'addText',
			description: 'Add a piece of text. A text with the same name is replaced.',
			action: 'Add text to knowledge',
		},
	],
	default: 'addText',
};

const knowledgeFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Refund policy',
		description:
			"The text's name, up to 255 characters. A text of yours with this name is replaced.",
		displayOptions: { show: { resource: ['knowledge'], operation: ['addText'] } },
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 6 },
		required: true,
		default: '',
		description: 'The text for Deacon to answer from',
		displayOptions: { show: { resource: ['knowledge'], operation: ['addText'] } },
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com/shipping',
		description: 'The page to add, on any site',
		displayOptions: { show: { resource: ['knowledge'], operation: ['addPage'] } },
	},
];

const topicOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['topic'] } },
	options: [
		{
			name: 'Mark Done',
			value: 'markDone',
			description: 'Mark a topic done, as pressing Done on What needs you does',
			action: 'Mark a topic done',
		},
	],
	default: 'markDone',
};

const topicFields: INodeProperties[] = [
	{
		displayName: 'Find Topic By',
		name: 'findBy',
		type: 'options',
		default: 'conversation',
		description:
			'A bug report usually reaches the trigger before Deacon has put it in a topic, so a ticket made from it only knows the conversation',
		displayOptions: { show: { resource: ['topic'], operation: ['markDone'] } },
		options: [
			{
				name: 'Conversation ID',
				value: 'conversation',
				description: "Mark done the topic of the conversation's bug report",
			},
			{
				name: 'Topic ID',
				value: 'topic',
				description: 'Mark done a topic by its own ID',
			},
		],
	},
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'kx7mqprt',
		description: 'The conversation with the bug report',
		displayOptions: {
			show: { resource: ['topic'], operation: ['markDone'], findBy: ['conversation'] },
		},
	},
	{
		displayName: 'Topic ID',
		name: 'topicId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'h4mzq8tv',
		displayOptions: { show: { resource: ['topic'], operation: ['markDone'], findBy: ['topic'] } },
	},
];

const eventOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['event'] } },
	options: [
		{
			name: 'Get Many',
			value: 'getAll',
			description:
				"Get events from the last 30 days. With a Schedule Trigger, this works where webhooks can't reach n8n.",
			action: 'Get many events',
		},
	],
	default: 'getAll',
};

const eventFields: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['event'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Newer Than Event ID',
				name: 'after',
				type: 'string',
				default: '',
				placeholder: 'evt_01M6D3VRJ8ZWG893PYFKSJXEBS',
				description:
					'Only events after this one, to catch up from the last event you saw. Without it, the newest come first.',
			},
			{
				displayName: 'Types',
				name: 'types',
				type: 'multiOptions',
				default: [],
				options: EVENT_TYPES,
				description: 'Only events of these types',
			},
		],
	},
];

export const deaconProperties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Conversation', value: 'conversation' },
			{ name: 'Event', value: 'event' },
			{ name: 'Knowledge', value: 'knowledge' },
			{ name: 'Topic', value: 'topic' },
		],
		default: 'conversation',
	},
	conversationOperations,
	conversationId,
	replyText,
	writeOptions('conversation', ['handBack', 'reply']),
	returnAll('conversation'),
	limit('conversation'),
	conversationFilters,
	knowledgeOperations,
	...knowledgeFields,
	writeOptions('knowledge', ['addPage', 'addText']),
	topicOperations,
	...topicFields,
	eventOperations,
	returnAll('event'),
	limit('event'),
	...eventFields,
];
