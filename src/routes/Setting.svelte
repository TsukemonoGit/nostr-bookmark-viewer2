<script>
	import { FileButton, ListBoxItem } from '@skeletonlabs/skeleton';
	//import {}from 'nostr-tools';
	let inputPubkey = '';
	let relay = '';
	let relaysDisabled = false;
	/**
	 * @type {string | string[]}
	 */
	let relays = [];
	async function onClickNip07() {
		// @ts-ignore
		inputPubkey = await window.nostr.getPublicKey();
		console.log(inputPubkey);

		// @ts-ignore
		const tmp = await window.nostr.getRelays();
		relays = Object.keys(tmp);
		console.log(relays);
	}
	function onClickNext(){
        console.log("next");
    }
</script>

<div class="main">
	<p class="hazimeni">
		ブックマークを取得する公開鍵とリレーを設定してください<br />
		ブラウザ拡張のpreferred relaysにリレーを登録しておくとリレーURLの入力が楽になります。
	</p>
	<button type="button" id="btn1" class="btn variant-filled-primary" on:click={onClickNip07}
		>Use NIP-07 Browser Extension</button
	>

	<div class="content">
		<p>公開鍵(public key)</p>
		<input type="text" class="input" bind:value={inputPubkey} placeholder="npub..." />
	</div>

	<div class="content">
		<p>リレー(relay)</p>
		<input class="input" type="text" bind:value={relay} placeholder="wss://..." />
		{#if relays.length > 0}
			<select class="select" bind:value={relay}>
				{#each relays as relay, index}
					<option value={relay}>{relay}</option>
				{/each}
			</select>
		{/if}
	</div>


<button type="button" id="btn1" class="btn variant-filled-secondary" on:click={onClickNext}
		>Next →</button
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
	.select {
		margin-top: 1em;
	}
</style>
