import type { IDataObject, JsonObject } from 'n8n-workflow';

/** A JSON object, as opposed to an array, a string or null. */
export function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The same check, in the type n8n's errors take. */
export function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
