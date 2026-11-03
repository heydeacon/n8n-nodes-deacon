import type {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { addWebhook, deleteWebhook, listWebhooks } from './requests';
import { checkSignature } from './signature';
import { deaconRequest } from './transport';
import { reconcileWebhooks, toWebhooks, TRIGGER_EVENTS } from './webhooks';

/** The events chosen on the node, as strings. */
function chosenEvents(context: IHookFunctions | IWebhookFunctions): string[] {
	const events = context.getNodeParameter('events', []);

	return Array.isArray(events)
		? events.filter((event): event is string => typeof event === 'string')
		: [];
}

function webhookUrl(context: IHookFunctions): string {
	const url = context.getNodeWebhookUrl('default');

	if (url === undefined) {
		throw new NodeOperationError(context.getNode(), 'n8n gave this trigger no webhook address');
	}

	return url;
}

/** A header's value, when it came once. A header sent twice isn't trusted. */
function single(value: string | string[] | undefined): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

export class DeaconTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Deacon Trigger',
		name: 'deaconTrigger',
		icon: { light: 'file:deacon.svg', dark: 'file:deacon.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when something happens in a Deacon chat',
		defaults: {
			name: 'Deacon Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'deaconApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		eventTriggerDescription: 'Waiting for a visitor to chat with Deacon on your site',
		properties: [
			{
				displayName:
					'Deacon only sends to a public https address on port 443. If n8n runs on your own computer, use the Deacon node\'s "Get many events" with a Schedule Trigger instead.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: TRIGGER_EVENTS,
				description: 'Which events start the workflow',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const heldId =
					typeof webhookData.webhookId === 'string' &&
					typeof webhookData.webhookSecret === 'string' &&
					webhookData.webhookSecret !== ''
						? webhookData.webhookId
						: undefined;

				const plan = reconcileWebhooks(toWebhooks(await deaconRequest.call(this, listWebhooks())), {
					url: webhookUrl(this),
					events: chosenEvents(this),
					heldId,
				});

				for (const id of plan.remove) {
					await deaconRequest.call(this, deleteWebhook(id));
				}

				if (plan.keep === null) {
					delete webhookData.webhookId;
					delete webhookData.webhookSecret;

					return false;
				}

				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const url = webhookUrl(this);

				let response;
				try {
					response = await deaconRequest.call(this, addWebhook(url, chosenEvents(this)));
				} catch (error) {
					if (error instanceof NodeApiError && error.httpCode === '422') {
						throw new NodeOperationError(this.getNode(), 'Deacon refused this webhook address', {
							description: `Deacon only sends to a public https address on port 443, and this trigger's address is ${url}. If n8n runs on your own computer, give n8n a public https address, or poll with the Deacon node's "Get many events" instead.`,
						});
					}

					// Hands Deacon's refusal back unchanged, such as a 409 saying which webhook limit was reached.
					throw new NodeApiError(this.getNode(), error);
				}

				if (typeof response.id !== 'string' || typeof response.secret !== 'string') {
					throw new NodeOperationError(
						this.getNode(),
						"Deacon's answer had no webhook id or signing secret",
					);
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = response.id;
				webhookData.webhookSecret = response.secret;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (typeof webhookData.webhookId === 'string') {
					try {
						await deaconRequest.call(this, deleteWebhook(webhookData.webhookId));
					} catch (error) {
						// A webhook that's already gone, because its key was revoked or an owner removed it, is deleted.
						if (!(error instanceof NodeApiError && error.httpCode === '404')) {
							this.logger.warn(
								`Deacon Trigger "${this.getNode().name}" couldn't delete its webhook ${webhookData.webhookId}`,
								{ error },
							);

							return false;
						}
					}
				}

				delete webhookData.webhookId;
				delete webhookData.webhookSecret;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookData = this.getWorkflowStaticData('node');
		const secret = typeof webhookData.webhookSecret === 'string' ? webhookData.webhookSecret : '';
		const request = this.getRequestObject();
		const headers = this.getHeaderData();

		const check =
			secret === ''
				? ({ valid: false, reason: 'no_secret_held' } as const)
				: checkSignature({
						headers: {
							id: single(headers['webhook-id']),
							timestamp: single(headers['webhook-timestamp']),
							signature: single(headers['webhook-signature']),
						},
						rawBody: Buffer.isBuffer(request.rawBody) ? request.rawBody : Buffer.alloc(0),
						secret,
						nowSeconds: Math.floor(Date.now() / 1000),
					});

		if (!check.valid) {
			this.logger.warn(
				`Deacon Trigger "${this.getNode().name}" refused a request that wasn't signed by Deacon (${check.reason})`,
			);
			this.getResponseObject().status(401).json({ message: 'The signature does not match.' });

			return { noWebhookResponse: true };
		}

		const event = this.getBodyData();

		// Integrations' Send test sends a ping whichever events were chosen, and an event this
		// trigger didn't choose is answered the same way: taken, with no run.
		if (typeof event.type !== 'string' || !chosenEvents(this).includes(event.type)) {
			return { webhookResponse: 'OK' };
		}

		return { workflowData: [this.helpers.returnJsonArray([event])] };
	}
}
