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
		removeEvent,
		createNewTag,
		DereteTag
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
	import { add_classes, each } from 'svelte/internal';
	import EditTagDialog from '../EditTagDialog.svelte';
	import Content from '../Content.svelte';

	//イベント内容検索用リレーたち
	let RelaysforSeach = [
		'wss://relay.nostr.band',
		'wss://nostr.wine',
		'wss://universe.nostrich.land',
		'wss://relay.damus.io'
		//'wss://nostream.localtest.me',
		//'ws://localhost:7000'
	];
	/** @type {string}*/
	let pubkey;
	/**@type {import('nostr-tools').Event[]} */
	let event30001 = []; //受信したイベントたち（修正するときに使う）
	/**@type {string[]}*/
	let relays;

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
		nowLoading = true;
		try {
			const profile = nip19.decode($page.params.nprofile);
			// @ts-ignore
			pubkey = profile.data.pubkey;
			// @ts-ignore
			relays = profile.data.relays;
			//console.log(pubkey);
			console.log(relays[0]);
			event30001 = await getBookmarks(pubkey, relays); //30001イベント受信

			tagList = event30001.map((event) => event.tags[0][1]);
			console.log(tagList[0]);
			if (tagList.length > 0) {
				tabSet = tagList[0];
			} else {
				/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
				const t = {
					message: 'ブクマ何もないかも。edit tagでタグを追加してね',
					timeout: 3000,
					background: 'bg-orange-500 text-white width-filled '
				};
				toastStore.trigger(t);
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
						if (getPubkeyList.length == 1) {
							getPubkeyList = [];
							break;
						}
						getPubkeyList.splice(index, 1);
					}
				}
			}
			let profiles = {};

			if (getPubkeyList != null && getPubkeyList.length > 0 && getPubkeyList[0] !== undefined) {
				profiles = await getProfile(getPubkeyList, RelaysforSeach); //key=pubkey,value=profile

				localProfile = { ...localProfile, ...profiles };

				localStorage.setItem('profile', JSON.stringify(localProfile));
				//console.log(localProfile);
			}
			////localStrageに保存
			//--------------------------------------------------------
			//形を整えて表示用のリストを作る
			//タグごとの表示させるオブジェクトたちをどの情報を使って作る？
			console.log(localProfile);
			try {
				//viewItem
				viewItem = await makeViewItem(fBookmark, noteList, localProfile);
				console.log(viewItem[tabSet]);
			} catch (error) {
				console.log('viewItemでエラー');
			}
			//console.log(test);
			//viewItem = test;
		} catch (error) {
			let errorMessage = 'nprofile decode error';
			if (error != null) {
				errorMessage = error;
			}
			/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
			const t = {
				message: errorMessage,
				timeout: 10000,
				background: 'bg-orange-500 text-white width-filled '
			};
			toastStore.trigger(t);
			return;
		}
		nowLoading = false;
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
			try {
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
						if(note.content!=undefined){
						item.content = note.content;}
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
			} catch (error) {
				_viewItem[key] = [];
			}
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
							timeout: 3000,
							background: 'bg-orange-500 text-white width-filled '
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
					message: `delete note (${viewItem[tabSet][nowViewIndex].noteId.slice(0, 15)}...)`,
					action: {
						label: 'DELETE',
						response: () => deleteNote(viewItem[tabSet][nowViewIndex].id)
					},
					timeout: 10000,
					background: 'bg-red-500 text-white width-filled '
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
		const responseEvent = await removeEvent(hexId, thisEvent, relays);
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
		try {
			const hexId = noteToHex(_item.detail);
			const thisEvent = event30001[tagList.indexOf(tabSet)];
			console.log(thisEvent);

			const responseEvent = await addNoteEvent(hexId, thisEvent,relays);
			console.log(responseEvent);
			if (responseEvent == null) {
				throw new Error(`Fail to add note id:${_item.detail}`);
			}
			event30001[tagList.indexOf(tabSet)] = responseEvent;

			let thisNote = null,
				thisProf = null;
			const tmpthisNote = await getEvent([hexId], RelaysforSeach);
			console.log(tmpthisNote);
			if (tmpthisNote && tmpthisNote[hexId]) {
				thisNote = tmpthisNote[hexId];
				const thisPubkey = thisNote.pubkey;
				let localProf = JSON.parse(localStorage.getItem('profile') || '{}');
				if (localProf[thisPubkey] == null) {
					const returnProf = await getProfile([thisPubkey], RelaysforSeach);
					if (returnProf && returnProf[thisPubkey] !== '') {
						thisProf = returnProf[thisPubkey];
						localProf = { ...localProf, ...returnProf };
						localStorage.setItem('profile', JSON.stringify(localProf));
					}
				} else {
					thisProf = localProf[thisPubkey];
				}
			}

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
			if (thisNote && thisNote.content !== undefined && thisNote.content.trim() !== '') {
				item.content = thisNote.content;
				item.date = new Date(thisNote.created_at * 1000).toLocaleString();
				item.pubkey = thisNote.pubkey;
			}

			if (thisProf && thisProf.content !== undefined && thisProf.content.trim() !== '') {
				const thisProfile = JSON.parse(thisProf.content);
				item.name = thisProfile.name;
				item.display_name = thisProfile.display_name;
				item.icon = thisProfile.picture;
			}

			viewItem[tabSet].push(item);
			viewItem = viewItem;
		} catch (error) {
			console.log(error);
			let errortext = `Fail to add note id:${_item.detail}`;
			if (error != null) {
				errortext = error;
			}
			const t = {
				message: errortext,
				timeout: 3000,
				background: 'bg-orange-500 text-white width-filled '
			};
			toastStore.trigger(t);
		} finally {
			closeAddNoteDialog();
		}
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
	function closeEditTagDialog() {
		dialogMessage = '';
		editTagDialog.close();
	}

	async function addTag(_item) {
		dialogMessage = '';
		console.log(_item.detail); //inputの中身
		const newTag = _item.detail; //これをついかします
		//tag名がかぶってないか確認する
		if (tagList.includes(newTag)) {
			dialogMessage = `${newTag}タグすでにあるっぽい`;

			return;
		}
		try {
			nowLoading = true;
			const thisEvent = await createNewTag(newTag, pubkey, relays);
			//追加したものをEvent30001に追加します

			event30001.push(thisEvent);
			console.log(event30001);
			//tagListにも追加します
			tagList.push(newTag);
			tagList = tagList;
			//viewItemに空箱を追加します
			viewItem[newTag] = [];
			tabSet = newTag;
		} catch (error) {
			let mesage = `tag'${newTag}の作成に失敗しました`;
			console.log(error);
			if (error != null) {
				mesage = error;
			}
			/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
			const t = {
				message: mesage,
				timeout: 3000,
				background: 'bg-orange-500 text-white width-filled '
			};
			toastStore.trigger(t);
		}
		nowLoading = false;
		editTagDialog.close();
	}

	async function deleteTag(_item) {
		dialogMessage = '';
		console.log(_item.detail); //inputの中身

		const dTag = _item.detail;
		if (dTag == '') {
			dialogMessage = '削除したいタグを選択してください';
			return;
		}
		editTagDialog.close();
		//dTagからどのイベントを削除するのかを探す
		const index = tagList.indexOf(dTag);
		const thisEvent = event30001[index];
		console.log(event30001);
		console.log(thisEvent);

		/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
		const t = await {
			message: `delete tag (${thisEvent.tags[0][1]})`,
			action: {
				label: 'DELETE',
				response: () => deleteTagEvent(thisEvent)
			},
			timeout: 10000,
			background: 'bg-red-500 text-white width-filled '
			//	'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white width-filled'
		};
		toastStore.trigger(t);
	}

	/**
	 * @param {import("nostr-tools").Event} deleteEvent
	 */
	async function deleteTagEvent(deleteEvent) {
		try {
			nowLoading = true;
			const isSuccess = await DereteTag(deleteEvent, pubkey, relays);
			console.log(isSuccess);
			if (isSuccess) {
				//成功したらViewItemからけして　タブリストからも消す
				const thisTab = deleteEvent.tags[0][1];
				console.log(viewItem[thisTab]);
				delete viewItem[thisTab];
				tagList = tagList.filter((tag) => tag !== thisTab);
				tabSet = tagList[0];
			} else {
				console.log('削除失敗したかも');
			}
		} catch (error) {
			let mesage = `タグの削除に失敗したかも`;
			if (error != null) {
				mesage = error;
			}
			/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
			const t = {
				message: mesage,
				timeout: 3000,
				background: 'bg-orange-500 text-white width-filled '
			};
			nowLoading = false;
			toastStore.trigger(t);
		}
	}
	
</script>

<Toast />

<p style="color:coral">ご利用は自己責任でお願いします</p>
<div class="head-li">
	<ul class="list-dl">
		<li>
			pubkey: {pubkey}
		</li>
	{#if relays!=undefined}
	<details>
		<summary>relays</summary>
	{#each relays as relay}
		<li class ="list">
			{relay}
		</li>
		{/each}	
	</details>
		{/if}
	</ul>
</div>
<hr />

{#await onMount}
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
									on:click={()=>onClickMenu(note)}
									class="btn-icon btn-icon-sm variant-filled-primary rounded-full"
									style="position:relative">▼</button
								>

								{#if note.isMenuOpen}
									<PopupMenu on:item-click={handleItemClick} />
								{/if}
							</svelte:fragment>

							<!-- Router Slot -->
							<slot>
								<div class="content">
									<Content bind:note={note.content} />
								</div>
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
	<button class="btn variant-filled-secondary footer-btn rounded-full" on:click={openAddNoteDialog}
		>add note</button
	>

	<button class="btn variant-filled-secondary footer-btn rounded-full" on:click={openEditTagDialog}
		>edit tag</button
	>

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

	.footer-menu {
		display: block;
		position: fixed;
		width: 100%;
		left: 10px;
		bottom: 10px;
		z-index: 100;
	}
	.progress {
		margin-left: auto;
		display: inline-flex;
	}
	.footer-btn {
		margin: 5px;
	}
	.space {
		padding: 2em;
	}
	.content {
		white-space: pre-wrap;
	}
	.head-li {
		word-wrap: break-word;
	}
	.list{
		padding-left: 1em;
	}

</style>
