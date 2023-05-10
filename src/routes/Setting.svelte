<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	import { nip19 } from 'nostr-tools';
	import { pubToHex } from '../lib/functions.js';
	import { ListBox, ListBoxItem } from '@skeletonlabs/skeleton';

	let inputPubkey = '';
	let relay = '';
	/**
	 * @type {string[]}
	 */
	let relays = [];
	let message = '';
	let pubkey = '';
	let nprofile = '';

	//コンポーネントが最初に DOM にレンダリングされた後に実行されます(?)
	onMount(async () => {
		//local strageに nprofile が保存されていたら展開する
		let nprofile = localStorage.getItem('nprofile');
		if (nprofile != null) {
			const address = nip19.decode(nprofile);
			console.log(address);
			// @ts-ignore
			pubkey = address.data.pubkey;
			inputPubkey = pubkey;
			// @ts-ignore
			relays = address.data.relays;
		}
		console.log(nprofile);
	});

	async function onClickNip07() {
		// @ts-ignore
		inputPubkey = await window.nostr.getPublicKey();
		console.log(inputPubkey);

		// @ts-ignore
		//const tmp = await window.nostr.getRelays();
		//	relays = Object.keys(tmp);
		//	console.log(relays);
	}

	async function onClickNext() {
		message = '';
		console.log('next');

		//npubチェック
		try {
			pubkey = pubToHex(inputPubkey);
			console.log(pubkey);
		} catch {
			message = message + 'pubkeyを確認してください';
			return;
		}

		try {
			nprofile = makeNprofile();
		} catch {
			console.log('nprofileerror');
			return;
		}
		console.log(message);
		console.log(nprofile);
		//ローカルストレージに保存
		localStorage.setItem('nprofile', nprofile);
		//次へ
		await goto(nprofile);
	}

	//--------------------------------------------------------
	let url;
	async function checkExistUrl() {
		let protocol, urlstr;
		if (relay.startsWith('ws://')) {
			// inputValueがws://から始まる場合
			protocol = 'ws';
			urlstr = relay.slice(5); // ws://の部分を削除した残りの文字列を取得する
			url = new URL('http://' + urlstr);
		} else if (relay.startsWith('wss://')) {
			// inputValueがwss://から始まる場合
			protocol = 'wss';
			urlstr = relay.slice(6); // wss://の部分を削除した残りの文字列を取得する
			url = new URL('https://' + urlstr);
		} else {
			throw new Error('error');
		}
		//console.log('protocol:', protocol); // 'ws'または'wss'が出力される
		//console.log('url:', urlstr); // ws://またはwss://以降の文字列が出力される

		//そのURLのリレーが存在するか確認  NIP11

		let header = new Headers();
		header.set('Accept', 'application/nostr+json');
		try {
			let response = await fetch(url, { headers: header });
			console.log(response.status);
			console.log(await response.json());
			//.then(response=> console.log(response.json()))
		} catch {
			throw new Error('error');
		}
	}

	function makeNprofile() {
		/**
		 * @type {import("nostr-tools/lib/nip19").ProfilePointer }
		 */
		const profile = {
			//identifier: '', //it is the identifier (the "d" tag) of the event being referenced
			pubkey: pubkey,
			//kind: 30001,
			//relays: [relay]
			relays: relays
		};
		return nip19.nprofileEncode(profile);
	}
	async function addRelayList() {
		console.log('addrelay');
		//リレーチェック
		try {
			await checkExistUrl();
			relays.push(relay);
			relays=relays;
			relay="";
		} catch {
			message = message + 'リレーURLを確認してください';
			return;
		}
		
	}
	function clickRelay(idx){
		console.log(idx);
		relays.splice(idx,1);
		relays=relays;


	}
</script>

<div class="main">
	<p class="hazimeni">
		ブックマークを取得する公開鍵とリレーを設定してください<br />
		<s>ブラウザ拡張のpreferred relaysにリレーを登録しておくとリレーURLの入力が楽になります。</s><br /><br
		/>
		なんもわからん人間が作ってるのでご利用は自己責任でお願いします。
	</p>
	<button type="button" id="btn1" class="btn variant-filled-primary" on:click={onClickNip07}
		>Use NIP-07 Browser Extension</button
	>

	<div class="content">
		<p>公開鍵(public key)</p>
		<input type="text" class="input" bind:value={inputPubkey} placeholder="npub..." />
	</div>

	<div class="content">
		<p class="relay">リレー(relay)</p>
		<div class="input-group input-group-divider grid-cols-[1fr_auto]">
			<input type="text" bind:value={relay} placeholder="wss://..." />
			<button class="btn variant-filled-secondary" on:click={addRelayList}>add relay</button>
		</div>
		{#if relays.length > 0}
		<ul>
				{#each relays as re, index}
				<div class="list">
				<li  value={re}>
					<button class="py-0 btn2 btn variant-filled-secondary rounded-full" on:click={() => clickRelay({index})}>delete</button>
					{re}
				</li>
			</div>
				{/each}
		</ul>

		{/if}
	</div>

	<button
		type="button"
		id="btn1"
		class="btn variant-filled-secondary rounded-full"
		on:click={onClickNext}>Next →</button
	>

	{#if message != ''}
		<hr />
		<error>{message}</error>
	{/if}
</div>
<hr />

<div id="footer">
	Github: <a
		href="https://github.com/TsukemonoGit/nostr-bookmark-viewer2"
		target="_blank"
		rel="noopener noreferrer">TsukemonoGit/nostr-bookmark-viewer2</a
	> <br />
	Author:
	<a
		href="https://nostx.shino3.net/npub1sjcvg64knxkrt6ev52rywzu9uzqakgy8ehhk8yezxmpewsthst6sw3jqcw"
		target="_blank"
		rel="noopener noreferrer">mono(Nostr)</a
	>
</div>

<style>
	.main {
		margin: 1em;
		margin-top: 3em;
	}

	.content {
		margin: 1em 0em 1em 0em;
	}
	#btn1 {
		border-radius: 50em;
		margin-bottom: 2em;
		margin-top: 2em;
	}
	.btn2{
		margin-right: 0.5em;
	}
	
</style>
