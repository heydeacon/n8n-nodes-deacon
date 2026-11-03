import type { IDataObject, IExecuteFunctions, IHookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { isDataObject, isJsonObject } from './guards';
import { DEFAULT_BASE_URL, toHttpOptions, type DeaconRequest } from './requests';

/**
 * Sends one request to Deacon with the credential's API key. A refusal becomes n8n's API error,
 * which shows Deacon's own `message`, such as which webhook limit was reached. A 204 comes back
 * as an empty object.
 */
export async function deaconRequest(
	this: IExecuteFunctions | IHookFunctions,
	request: DeaconRequest,
	idempotencyKey?: string,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('deaconApi');
	const baseUrl = typeof credentials.baseUrl === 'string' ? credentials.baseUrl : DEFAULT_BASE_URL;

	try {
		const response: unknown = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'deaconApi',
			toHttpOptions(baseUrl, request, idempotencyKey),
		);

		return isDataObject(response) ? response : {};
	} catch (error) {
		throw new NodeApiError(
			this.getNode(),
			isJsonObject(error) ? error : { message: String(error) },
		);
	}
}
