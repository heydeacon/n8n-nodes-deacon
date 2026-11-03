import type { IDataObject } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { collectPages, type Page } from '../nodes/Deacon/paging';
import { listEvents, type PageRequest } from '../nodes/Deacon/requests';

/** A list whose pages hold these ids, and what was asked of it. */
function fakeList(pages: Array<{ ids: string[]; next: string | null }>) {
	const asked: PageRequest[] = [];

	return {
		asked,
		async fetchPage(page: PageRequest): Promise<Page> {
			const answer = pages[asked.length];
			asked.push(page);

			return { data: answer.ids.map((id): IDataObject => ({ id })), nextCursor: answer.next };
		},
	};
}

describe('collectPages', () => {
	it('with Return All, follows next_cursor 100 at a time until it is null', async () => {
		const list = fakeList([
			{ ids: ['a', 'b'], next: 'c1' },
			{ ids: ['c'], next: 'c2' },
			{ ids: ['d'], next: null },
		]);

		const items = await collectPages(list.fetchPage, { returnAll: true });

		expect({ items, asked: list.asked }).toEqual({
			items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
			asked: [
				{ limit: 100, cursor: null },
				{ limit: 100, cursor: 'c1' },
				{ limit: 100, cursor: 'c2' },
			],
		});
	});

	it('with a limit, asks for no more than it still needs and stops once it has them', async () => {
		const list = fakeList([
			{ ids: ['a', 'b'], next: 'c1' },
			{ ids: ['c'], next: 'c2' },
			{ ids: ['d'], next: null },
		]);

		const items = await collectPages(list.fetchPage, { returnAll: false, limit: 3 });

		expect({ items, asked: list.asked }).toEqual({
			items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
			asked: [
				{ limit: 3, cursor: null },
				{ limit: 1, cursor: 'c1' },
			],
		});
	});

	it('catches up on events after an id by sending each next_cursor as ending_before', async () => {
		const list = fakeList([
			{ ids: ['evt_03', 'evt_02'], next: 'evt_03' },
			{ ids: ['evt_04'], next: null },
		]);
		const sent: Array<IDataObject | undefined> = [];

		await collectPages(
			async (page) => {
				sent.push(listEvents(['visitor.reported_bug'], 'newer', page).qs);

				return list.fetchPage(page);
			},
			{ returnAll: true },
			'evt_01',
		);

		expect(sent).toEqual([
			{ type: 'visitor.reported_bug', limit: 100, ending_before: 'evt_01' },
			{ type: 'visitor.reported_bug', limit: 100, ending_before: 'evt_03' },
		]);
	});
});
