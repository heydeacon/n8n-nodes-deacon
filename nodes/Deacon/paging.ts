import type { IDataObject } from 'n8n-workflow';
import { isDataObject } from './guards';
import type { PageRequest } from './requests';

/** The most a Deacon list returns at once. */
export const MOST_PER_PAGE = 100;

/** One page of a Deacon list, as `data` and `next_cursor` say. */
export type Page = { data: IDataObject[]; nextCursor: string | null };

export type HowMany = { returnAll: true } | { returnAll: false; limit: number };

/** Reads a list response. Anything that isn't a list reads as an empty last page. */
export function toPage(response: IDataObject): Page {
	const data = Array.isArray(response.data) ? response.data.filter(isDataObject) : [];
	const nextCursor =
		typeof response.next_cursor === 'string' && response.next_cursor !== ''
			? response.next_cursor
			: null;

	return { data, nextCursor };
}

/**
 * Asks for pages until there are enough items or the list ends, each page no bigger than it needs
 * to be. The first page starts at `startCursor`; each later one at the page before's
 * `next_cursor`. A page can hold fewer items than asked for and still have more after it, as a
 * page of events does when it reaches about 2 MB.
 */
export async function collectPages(
	fetchPage: (page: PageRequest) => Promise<Page>,
	howMany: HowMany,
	startCursor: string | null = null,
): Promise<IDataObject[]> {
	const items: IDataObject[] = [];
	let cursor = startCursor;

	while (howMany.returnAll || items.length < howMany.limit) {
		const wanted = howMany.returnAll ? MOST_PER_PAGE : howMany.limit - items.length;
		const page = await fetchPage({ limit: Math.min(wanted, MOST_PER_PAGE), cursor });

		items.push(...page.data);

		if (page.nextCursor === null || page.nextCursor === cursor) {
			break;
		}

		cursor = page.nextCursor;
	}

	return howMany.returnAll ? items : items.slice(0, howMany.limit);
}
