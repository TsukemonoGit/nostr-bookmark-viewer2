<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	import { nip19 } from 'nostr-tools';
	import { formatBookmark, getBookmarks } from '../../lib/functions';
	import { Tab, TabGroup } from '@skeletonlabs/skeleton';

	let pubkey = '';
	let relay = '';
	/**
	 * @type {import('nostr-tools').Event[]}
	 */
	let bookmarks = [];
	let tabSet = '';
	/**
	 * @type {{ [x: string]: string[]}}　タグごとのイベントIDリスト
	 */
	let bookmarkList = {};

	/**
	 * @type {string[]}
	 */
	let viewTest;
	//まずうらるを確認してnpubとrelayをとります
	//（次へから来てない可能性もあるため）

	//コンポーネントが最初に DOM にレンダリングされた後に実行されます(?)
	onMount(async () => {
		try {
			const address = nip19.decode($page.params.naddr);
			// @ts-ignore
			pubkey = address.data.pubkey;
			// @ts-ignore
			relay = address.data.relays[0];
			//console.log(pubkey);
			//console.log(relay);

			bookmarks = await getBookmarks(pubkey, relay);
			console.log(bookmarks);
			tabSet=bookmarks[0].tags[0][1];
			bookmarkList = formatBookmark(bookmarks);
		} catch {
			const errorMessage = 'naddr decode error';
			console.log(errorMessage);
		}
	});
	
	
	
	$:viewTest = bookmarkList[tabSet] ;
</script>

<div>
	<ul class="list-dl">
		<li>
			pubkey: {pubkey}
		</li>
		<li>
			relay: {relay}
		</li>
	</ul>
</div>
<hr />

{#await getBookmarks}
	通信中
{:then book}
	<TabGroup>
		{#each bookmarks as bookmark}
			<Tab bind:group={tabSet} name={bookmark.tags[0][1]} value={bookmark.tags[0][1]}
				>{bookmark.tags[0][1]}</Tab
			>
		{/each}
		<!-- Tab Panels --->

		<svelte:fragment slot="panel">
			{#if viewTest != null}
				{#each viewTest as bookmarkTag, index}
					<div>{bookmarkTag}</div>
				{/each}
			{/if}
		</svelte:fragment>
	</TabGroup>
{/await}
