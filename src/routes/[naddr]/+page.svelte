<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	import { nip19 } from 'nostr-tools';
	import {
		formatBookmark,
		formatPubkeyList,
		getBookmarks,
		getEvent,
		getProfile,
		noteToHex,
		addNoteEvent,
		removeEvent
	} from '../../lib/functions';
	import {
		AppBar,
		AppShell,
		ListBox,
		ListBoxItem,
		ProgressRadial,
		Tab,
		TabGroup,
		Toast,
		popup,
		toastStore
	} from '@skeletonlabs/skeleton';

	import PopupMenu from '../PopupMenu.svelte';
	import AddNoteDialog from '../AddNoteDialog.svelte';
	import { each } from 'svelte/internal';
	import EditTagDialog from '../EditTagDialog.svelte';

	//イベント内容検索用リレーたち
	let RelaysforSeach = [
		//"wss://relay.nostr.band",
		//"wss://nostr.wine",
		//"wss://universe.nostrich.land",
		//"wss://relay.damus.io",
		//'wss://nostream.localtest.me',
		'ws://localhost:7000'
	];
	/** @type {string}*/
	let pubkey;
	/**@type {import('nostr-tools').Event[]} */
	let event30001; //受信したイベントたち（修正するときに使う）
	/**@type {string}*/
	let relay;

	/**@type {{[key:string]:{id:string;noteId:string;isMenuOpen:boolean;date:string;name:string;icon:string;display_name:string;content:string}[]} | undefined} */
	let viewItem = {};

	/**@type {string }*/
	let tabSet = '';

	/**@type {string[]} */
	let tagList = [];

	/** @type {number} */
	let nowViewIndex;
	let viewProgress = false;

	//タイアログ表示--------------------AddNota
	/**@type {AddNoteDialog.dialog}*/
	let dialog;

	/**@type {boolean}*/
	let nowLoading;
	let dialogMessage = '';
	//タイアログ表示--------------------EditTag
	/**@type {AddNoteDialog.dialog}*/
	let editTagDialog;


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
			event30001 = await getBookmarks(pubkey, relay); //30001イベント受信
			tagList = event30001.map((event) => event.tags[0][1]);
			console.log(tagList[0]);
			if (tagList.length > 0) {
				tabSet = tagList[0];
			}

			const fBookmark = formatBookmark(event30001);
			/** @type {string[]}*/
			let idList = [];
			for (const key in fBookmark) {
				idList = [...idList, ...fBookmark[key]];
			}
			const noteList = await getEvent(idList, RelaysforSeach); //1イベント受信
			const pubkeyList = formatPubkeyList(noteList);

			//localStrageちぇっく
			//--------------------------------------------------------
			let localProfile;
			let getPubkeyList = pubkeyList;
			const localtmp = localStorage.getItem('profile');
			/**@type {{[key:string]:import('nostr-tools').Event|""}}*/
			if (localtmp != null) {
				localProfile = JSON.parse(localtmp);
				//delete localProfile['undefined'];
				console.log(localProfile);
				for (const key in localProfile) {
					if (pubkeyList.includes(key) && localProfile[key] != '') {
						const index = getPubkeyList.indexOf(key);
						getPubkeyList.splice(index, 1);
					}
				}
			}
			let profiles = {};
			console.log(getPubkeyList[0] !== undefined);
			if (getPubkeyList.length > 0 && getPubkeyList[0] !== undefined) {
				profiles = await getProfile(getPubkeyList, RelaysforSeach); //key=pubkey,value=profile
			}
			localProfile = { ...localProfile, ...profiles };

			localStorage.setItem('profile', JSON.stringify(localProfile));
			console.log(localProfile);
			////localStrageに保存
			//--------------------------------------------------------
			//形を整えて表示用のリストを作る
			//タグごとの表示させるオブジェクトたちをどの情報を使って作る？

			//viewItem
			viewItem = await makeViewItem(fBookmark, noteList, localProfile);
			//console.log(test);
			//viewItem = test;
			console.log(viewItem[tabSet]);
		} catch {
			const errorMessage = 'naddr decode error';
			console.log(errorMessage);
			return;
		}
	});

	/**
	 * @param {{ [x: string]: string[]; }} fBookmark
	 * @param {{[key:string] : import('nostr-tools').Event}} noteList
	 * @param {{[key:string] : import('nostr-tools').Event}}localProfile
	 */
	async function makeViewItem(fBookmark, noteList, localProfile) {
		let _viewItem = {};
		let num = 0;
		//fBookmarkはタグごとのIDリスト
		for (const key in fBookmark) {
			console.log(key);
			_viewItem[key] = await fBookmark[key].map((id) => {
				const item = {
					id: id,
					noteId: nip19.noteEncode(id),
					content: 'undefined',
					date: 'unknown',
					pubkey: 'unknown',
					name: 'undefined',
					display_name: 'undefined',
					icon: 'undefined',
					isMenuOpen: false //メニューの開閉状態
				};

				try {
					const note = noteList[id];
					item.content = note.content;
					item.pubkey = nip19.npubEncode(note.pubkey);
					item.date = new Date(note.created_at * 1000).toLocaleString();

					try {
						const prof = JSON.parse(localProfile[note.pubkey].content);

						item.name = prof.name;
						item.display_name = prof.display_name;
						item.icon = prof.picture;
					} catch {}
				} catch {}

				return item;
			});
			num++;
		}
		console.log(_viewItem);
		return _viewItem;
	}

	/**
	 * @param {{ id?: string; noteId?: string; isMenuOpen: any; date?: string; name?: string; icon?: string; display_name?: string; content?: string; }} note
	 */
	function onClickMenu(note) {
		console.log(note);
		//if (tabSet == '') return;
		note.isMenuOpen = true;
		viewItem[tabSet][viewItem[tabSet].indexOf(note)].isMenuOpen = true;
		console.log(viewItem[tabSet]);
		nowViewIndex = viewItem[tabSet].indexOf(note);
		// // @ts-ignore
		// viewItem[tabSet][_id].isMenuOpen = !viewItem[tabSet][_id].isMenuOpen;
		// if (viewItem[tabSet][_id].isMenuOpen) {
		// 	nowViewIndex = _id;
		// }
		//console.log(viewItem[tabSet]);
	}

	/**
	 * @param {CustomEvent} item
	 */
	async function handleItemClick(item) {
		console.log(item.detail.name, nowViewIndex);
		if (tabSet == '' || viewItem == undefined) return;
		switch (item.detail.name) {
			case 'copy':
				navigator.clipboard.writeText(viewItem[tabSet][nowViewIndex].noteId).then(
					() => {
						// コピーに成功したときの処理
						console.log(`copyed: ${viewItem[tabSet][nowViewIndex].noteId.slice(0, 15)}...`);

						/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
						const t = {
							message: `copyed: ${viewItem[tabSet][nowViewIndex].noteId.slice(0, 15)}...`,
							timeout: 3000
						};
						toastStore.trigger(t);
					},
					() => {
						// コピーに失敗したときの処理
						console.log('コピー失敗');
						/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
						const t = {
							message: 'failed to copy',
							timeout: 3000
						};
						toastStore.trigger(t);
					}
				);
				break;

			case 'open':
				window.open('https://nostx.shino3.net/' + viewItem[tabSet][nowViewIndex].noteId, '_blank');
				break;

			case 'delete':
				/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
				const t = await {
					message: `delete note (${viewItem[tabSet][nowViewIndex].id.slice(0, 10)}...)`,
					action: {
						label: 'DELETE',
						response: () => deleteNote(viewItem[tabSet][nowViewIndex].id)
					},
					timeout: 10000

					//background:
					//	'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white width-filled'
				};
				toastStore.trigger(t);
				break;

			default:
				viewItem[tabSet][nowViewIndex].isMenuOpen = false;
				break;
		}
	}

	//$:console.log(nowTag);

	async function deleteNote(hexId) {
		viewProgress = true;
		//event30001のリストの中の何番目が目的のイベント化
		const thisEvent = event30001[tagList.indexOf(tabSet)];
		const responseEvent = await removeEvent(hexId, thisEvent, [relay]);
		event30001[tagList.indexOf(tabSet)] = responseEvent;
		// viewItemから指定した要素を削除
		if (viewItem && viewItem[tabSet]) {
			viewItem[tabSet].splice(nowViewIndex, 1);
		}
		viewItem = viewItem;
		console.log(viewItem);
		viewProgress = false;
	}

	function openAddNoteDialog() {
		dialogMessage = '';
		dialog.showModal();
		dialog.addEventListener('click', function (/** @type {{ target: any; }} */ event) {
			if (event.target === dialog) {
				//nowLoading=false;
				dialog.close();
			}
		});
	}

	function closeAddNoteDialog() {
		//nowLoading=false;
		dialog.close();
	}

	/**
	 * @param {any} _item
	 */
	async function addNote(_item) {
		console.log(_item.detail); //inputの中身
		try {
			const hexId = noteToHex(_item.detail);
			//event30001のリストの中の何番目が目的のイベント化
			const thisEvent = event30001[tagList.indexOf(tabSet)];
			const responseEvent = await addNoteEvent(hexId, thisEvent, [relay]);

			//viewItemに追加するためにヤンヤヤンヤする
			//hexIDからイベント内容を取得
			/**@type {import('nostr-tools').Event}*/
			let thisNote = '';
			let thisProf;
			let localProf;
			try {
				const tmpthisNote = await getEvent([hexId], RelaysforSeach);

				console.log(hexId);
				console.log(thisNote);
				thisNote = tmpthisNote[hexId];
				const thisPubkey = thisNote.pubkey;
				console.log(thisPubkey);
				//localに存在するか確認
				const tmp = localStorage.getItem('profile');
				if (tmp != null) {
					localProf = JSON.parse(tmp);

					for (const key in localProf) {
						//console.log(key);
						if (key == thisPubkey) {
							thisProf = localProf[key];
						}
					}
					//console.log(thisProf);
					//ローカルになかったらイベント取りに行く
				} else if (thisProf == undefined) {
					const returnProf = await getProfile([thisPubkey], RelaysforSeach);
					//console.log(returnProf);
					if (returnProf[thisPubkey] !== '') {
						thisProf = returnProf[thisPubkey];
						//プロフ取れたらローカルストレージ更新
						if (localProf != null) {
							const saveProf = [...localProf, returnProf];
							localStorage.setItem('profile', JSON.stringify(saveProf));
						} else {
							localStorage.setItem('profile', JSON.stringify(returnProf));
						}
					}
				}
			} catch (error) {
				//note内容取得失敗
				console.log(error);
			}
			//viewEvent整える
			let item = {
				id: hexId,
				noteId: nip19.noteEncode(hexId),
				content: 'unknown',
				date: 'unknown',
				pubkey: 'unknown',
				name: 'undefined',
				display_name: 'undefined',
				icon: 'undefined',
				isMenuOpen: false //メニューの開閉状態
			};
			if (thisNote != undefined || thisNote != '') {
				item.content = thisNote.content;
				(item.date = new Date(thisNote.created_at * 1000).toLocaleString()),
					(item.pubkey = thisNote.pubkey);
			}
			//console.log(thisProf);
			if (thisProf != '') {
				const thisProfile = JSON.parse(thisProf.content);
				item.name = thisProfile.name;
				item.display_name = thisProfile.display_name;
				item.icon = thisProfile.picture;
			}
			viewItem[tabSet].push(item);
			viewItem = viewItem;
		} catch (error) {
			//addNoteしっぱいしたらViewItem更新しない
			console.log(error);
		}
		closeAddNoteDialog();
	}


	//----------------------------EditNoteDialog
	function openEditTagDialog() {
		dialogMessage = '';
		editTagDialog.showModal();
		editTagDialog.addEventListener('click', function (/** @type {{ target: any; }} */ event) {
			if (event.target === editTagDialog) {
				//nowLoading=false;
				editTagDialog.close();
			}
		});
	}


	//$:index=viewItem.indexOf(tabSet);
	function closeEditTagDialog(){
		editTagDialog.close();
	}
	function addTag(_item){
console.log(_item.detail); //inputの中身
	}
	function deleteTag(_item){
		console.log(_item.detail); //inputの中身
	}
</script>

<Toast />
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
	<ProgressRadial ... stroke={100} meter="stroke-primary-500" track="stroke-primary-500/30" />
{:then book}
	<TabGroup>
		{#each tagList as tag}
			<Tab bind:group={tabSet} name={tag} value={tag}>{tag}</Tab>
		{/each}
		<!-- Tab Panels --->

		<svelte:fragment slot="panel">
			{#if viewItem != undefined && Object.keys(viewItem).length > 0}
				{#each viewItem[tabSet] as note, ind}
					<div class="note">
						<AppShell>
							<svelte:fragment slot="sidebarLeft">
								<div class="icon-area">
									<img class="icon" src={note.icon} alt="icon" />
								</div>
							</svelte:fragment>

							<svelte:fragment slot="pageHeader">
								<div class="header">
									<div class="display_name">
										{note.display_name}
									</div>
									<div class="name">@{note.name}</div>
									<div class="date">{note.date}</div>
								</div>
							</svelte:fragment>

							<svelte:fragment slot="sidebarRight">
								<button
									on:click={onClickMenu(note)}
									class="btn1 btn-icon btn-icon-sm variant-filled-primary"
									style="position:relative">▼</button
								>

								{#if note.isMenuOpen}
									<PopupMenu on:item-click={handleItemClick} />
								{/if}
							</svelte:fragment>

							<!-- Router Slot -->
							<slot>
								{note.content}
							</slot>

							<!-- ---- / ---- -->
						</AppShell>
					</div>
				{/each}
			{/if}
		</svelte:fragment>
	</TabGroup>
{/await}
<div class="space" />
<div class="footer-menu">
	<button class="btn variant-filled-secondary footer-btn" on:click={openAddNoteDialog}
		>add note</button
	>

	<button class="btn variant-filled-secondary footer-btn" on:click={openEditTagDialog}>edit tag</button>
	{#if nowLoading}
		<div class="progress">
			<ProgressRadial ... stroke={100} meter="stroke-primary-500" track="stroke-primary-500/30" />
		</div>
	{/if}
</div>

<AddNoteDialog
	bind:dialog
	on:closeAddNoteDialog={closeAddNoteDialog}
	on:add={addNote}
	bind:nowLoading
	bind:dialogMessage
	bind:tabSet
/>
<EditTagDialog
	bind:editTagDialog
	on:closeEditTagDialog={closeEditTagDialog}
	on:addTag={addTag}
	on:deleteTag={deleteTag}
	bind:nowLoading
	bind:dialogMessage
	bind:tabSet
	bind:tagList
/>

<style>
	.icon-area {
		margin-right: 1em;
	}
	.icon {
		width: 50px;
		height: 50px;
		border-radius: 50%;
	}
	.note {
		border: solid 1px rgb(88, 88, 88);
		word-break: break-all;
		margin: 0.5em;
		padding: 1em;
		border-radius: 0.5em;
	}
	.date {
		display: inline;
		font-weight: bold;
		font-size: smaller;
		margin-left: auto;
		text-align: end;
		margin-right: 5px;
	}
	.display_name {
		display: inline;
		font-weight: bold;
	}
	.name {
		display: inline;
		margin-left: 5px;
		font-weight: normal;
		font-size: smaller;
		align-items: flex-end;
	}
	.header {
		display: flex;
		width: 100%;
	}
	.btn1 {
		border-radius: 51em;
	}
	.footer-menu {
		display: block;
		position: fixed;
		left: 10px;
		bottom: 10px;
		z-index: 100;
	}
	.footer-btn {
		margin: 5px;
	}
	.space {
		padding: 2em;
	}
</style>
