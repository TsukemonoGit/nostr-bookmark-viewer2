<script>
	import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
  
    import { nip19 } from "nostr-tools";
	import { pubToHex } from '../lib/functions.js';


	let inputPubkey = '';
	let relay = '';
	/**
	 * @type {string | string[]}
	 */
	let relays = [];
	let message = '';
	let pubkey = '';
    let naddr="";

    //コンポーネントが最初に DOM にレンダリングされた後に実行されます(?)
    onMount(async () => {
        //local strageに naddr が保存されていたら展開する
        let naddr = localStorage.getItem("naddr");
        if(naddr!=null){
            const address = nip19.decode(naddr);
            console.log(address);
            // @ts-ignore
            pubkey=address.data.pubkey;
            inputPubkey=pubkey;
            // @ts-ignore
            relay=address.data.relays[0];
        }
        console.log(naddr);
    });

	async function onClickNip07() {
		// @ts-ignore
		inputPubkey = await window.nostr.getPublicKey();
		console.log(inputPubkey);

		// @ts-ignore
		const tmp = await window.nostr.getRelays();
		relays = Object.keys(tmp);
		console.log(relays);
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

        //リレーチェック
		try {
			await checkExistUrl();
		} catch {
			message = message + 'リレーを確認してください';
		   return;
        }


        try{
		   naddr= makeNaddr();
        }catch{
            console.log("naddrerror");
            return;
        }
		console.log(message);
        console.log(naddr);
        //ローカルストレージに保存
        localStorage.setItem('naddr', naddr);
        //次へ
        await goto(naddr);
    }

    //--------------------------------------------------------
	let url;
	async function checkExistUrl() {
		let protocol, urlstr;
		if (relay.startsWith('ws://')) {
			// inputValueがws://から始まる場合
			protocol = 'ws';
			urlstr = relay.slice(5); // ws://の部分を削除した残りの文字列を取得する
			url =new URL("http://" + urlstr);
		} else if (relay.startsWith('wss://')) {
			// inputValueがwss://から始まる場合
			protocol = 'wss';
			urlstr = relay.slice(6); // wss://の部分を削除した残りの文字列を取得する
			url =new URL("https://" + urlstr);
		} else {
			throw new Error('error');
		}
		//console.log('protocol:', protocol); // 'ws'または'wss'が出力される
		//console.log('url:', urlstr); // ws://またはwss://以降の文字列が出力される

        //そのURLのリレーが存在するか確認  NIP11
       
        let header = new Headers();
        header.set("Accept","application/nostr+json");
        try{
        let response = await fetch(url,{headers: header});
        console.log(response.status);
        console.log(await response.json());
        //.then(response=> console.log(response.json()))
        }catch{
            throw new Error('error');
        }
	}

	function makeNaddr() {
		/**
		 * @type {import("nostr-tools/lib/nip19").AddressPointer }
		 */
		const address = {
			identifier: '', //it is the identifier (the "d" tag) of the event being referenced
			pubkey: pubkey,
			kind: 30001,
			relays: [relay]
		};
		return nip19.naddrEncode(address);	
	}

</script>


<div class="main">
	<p class="hazimeni">
		ブックマークを取得する公開鍵とリレーを設定してください<br />
		ブラウザ拡張のpreferred relaysにリレーを登録しておくとリレーURLの入力が楽になります。<br />
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
		<p>リレー(relay)</p>
		<input class="input-group" type="text" bind:value={relay} placeholder="wss://..." />
		{#if relays.length > 0}
			<select class="select" bind:value={relay}>
				{#each relays as relay, index}
					<option value={relay}>{relay}</option>
				{/each}
			</select>
		{/if}
	</div>

	<button type="button" id="btn1" class="btn variant-filled-secondary rounded-full" on:click={onClickNext}
		>Next →</button
	>

    {#if message!=""}
    <hr>
    <error>{message}</error>
    {/if}
    
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
