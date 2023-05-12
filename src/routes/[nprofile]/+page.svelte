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
		SlideToggle,
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
	import TagListDialog from '../TagListDialog.svelte';

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

	/**@type {{[key:string]:{id:string;noteId:string;isMenuOpen:boolean;date:string;name:string;icon:string;display_name:string;content:string; isChecked:boolean}[]} | undefined} */
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
	//tagListタイアログ表示--------------------TagListDialog

	let isTagListDialog = false;

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
						isMenuOpen: false, //メニューの開閉状態
						isChecked: false
					};

					try {
						const note = noteList[id];
						if (note.content != undefined) {
							item.content = note.content;
						}
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
		//console.log(viewItem[tabSet]);
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
					background: 'bg-red-500 text-white width-filled  rounded-container-token',
					buttonAction: 'btn variant-filled rounded-full'

					//background:
					//	'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white width-filled'
				};
				toastStore.trigger(t);
				break;

			default:
				viewItem[tabSet][nowViewIndex].isMenuOpen = false;
				break;
		}
		viewItem[tabSet][nowViewIndex].isMenuOpen = false;
	}

	//$:console.log(nowTag);

	/**
	 * @param {string | string[]} hexId
	 */
	async function deleteNote(hexId) {
		/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
		let t;
		viewProgress = true;

		//event30001のリストの中の何番目が目的のイベント化
		const thisEvent = event30001[tagList.indexOf(tabSet)];
		const responseEvent = await removeEvent(hexId, thisEvent, relays);
		console.log(responseEvent);
		if (!responseEvent.isSuccess) {
			t = {
				message: `削除に失敗したかも`,
				timeout: 3000,
				background: 'bg-orange-500 text-white width-filled '
			};
		} else {
			t = {
				message: responseEvent.msg.join('\n'),
				timeout: 5000
			};

			event30001[tagList.indexOf(tabSet)] = responseEvent.event;
			// viewItemから指定した要素を削除
			if (viewItem && viewItem[tabSet] && typeof hexId == 'string') {
				viewItem[tabSet].splice(nowViewIndex, 1);
			}
		}
		toastStore.trigger(t);
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
	 * @param {string} _tabSet
	 */
	async function addNote(_item, _tabSet) {
		nowLoading = true;
		let result = false;
		/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
		let t;
		try {
			
			const hexId = noteToHex(_item.detail);
			const thisEvent = event30001[tagList.indexOf(_tabSet)];
			console.log(thisEvent);

			const responseEvent = await addNoteEvent(hexId, thisEvent, relays);
			console.log(responseEvent);
			if (!responseEvent.isSuccess) {
				throw new Error(`Fail to add note id:${_item.detail}`);
			}
			event30001[tagList.indexOf(_tabSet)] = responseEvent.event;
			t = {
				message: responseEvent.msg.join('\n'),
				timeout: 5000
			};

			let thisNote = null,
				thisProf = null;
			const tmpthisNote = await getEvent([hexId], RelaysforSeach);
			console.log(tmpthisNote);
			if (tmpthisNote != null && tmpthisNote[hexId] != null) {
				thisNote = tmpthisNote[hexId];
				const thisPubkey = thisNote.pubkey;
				console.log(thisPubkey);
				let localProf = JSON.parse(localStorage.getItem('profile') || '{}');
				if (localProf[thisPubkey] == null || localProf[thisPubkey] == '') {
					const returnProf = await getProfile([thisPubkey], RelaysforSeach);
					console.log(returnProf);
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
				isMenuOpen: false, //メニューの開閉状態
				isChecked: false
			};
			if (thisNote && thisNote.content !== undefined && thisNote.content.trim() !== '') {
				item.content = thisNote.content;
				item.date = new Date(thisNote.created_at * 1000).toLocaleString();
				item.pubkey = thisNote.pubkey;
			}

			if (thisProf && thisProf.content !== undefined && thisProf.content.trim() !== '') {
				console.log(thisProf);
				const thisProfile = JSON.parse(thisProf.content);
				console.log(thisProfile);
				item.name = thisProfile.name;
				item.display_name = thisProfile.display_name;
				item.icon = thisProfile.picture;
			}

			viewItem[_tabSet].push(item);
			viewItem = viewItem;
			result = true;
		} catch (error) {
			console.log(error);
			let errortext = `Fail to add note id:${_item.detail}`;
			if (error != null) {
				errortext = error;
			}
			t = {
				message: errortext,
				timeout: 3000,
				background: 'bg-orange-500 text-white width-filled '
			};
		} finally {
			toastStore.trigger(t);
			nowLoading = false;
			closeAddNoteDialog();
		}

		return result;
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
		/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
		let t;

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
			console.log(thisEvent);
			if (thisEvent.isSuccess) {
				event30001.push(thisEvent.event);
				console.log(event30001);
				//tagListにも追加します
				tagList.push(newTag);
				tagList = tagList;
				//viewItemに空箱を追加します
				viewItem[newTag] = [];
				tabSet = newTag;

				const formattedString = thisEvent.msg.join('\n');
				t = {
					message: formattedString,
					timeout: 5000
				};
			} else {
				t = {
					message: `tag'${newTag}の作成に失敗しました`,
					timeout: 3000,
					background: 'bg-orange-500 text-white width-filled '
				};
			}
		} catch (error) {
			let mesage = `tag'${newTag}の作成に失敗しました`;

			t = {
				message: mesage,
				timeout: 3000,
				background: 'bg-orange-500 text-white width-filled '
			};
		}
		//トースト起動
		toastStore.trigger(t);
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
		nowLoading = false;
		toastStore.trigger(t);
	}

	/**
	 * @param {import("nostr-tools").Event} deleteEvent
	 */
	async function deleteTagEvent(deleteEvent) {
		/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
		let t;
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

				t = {
					message: isSuccess.msg.join(' \n'),
					timeout: 5000
				};
			} else {
				console.log('削除失敗したかも');
				t = {
					message: `failed to delete tag`,
					timeout: 3000,
					background: 'bg-orange-500 text-white width-filled '
				};
			}
		} catch (error) {
			t = {
				message: `タグの削除に失敗したかも`,
				timeout: 3000,
				background: 'bg-orange-500 text-white width-filled '
			};
		}
		nowLoading = false;
		toastStore.trigger(t);
	}

	/**
	 * @param {{ detail: string; }} item
	 */
	async function handleMoveClick(item) {
		console.log(item.detail);
		const id = viewItem[tabSet][nowViewIndex].id;

		const _item = { detail: id };
		console.log(event30001[tagList.indexOf(item.detail)]);
		const result = await addNote(_item, item.detail);
		//addNoteが成功したら削除する
		if (result) {
			deleteNote(viewItem[tabSet][nowViewIndex].id);
		}
	}

	let isMulti = false;
	function nClickMultiMode(event) {
		console.log(event);
		onClickTab();
		// ここに何かしらの処理を記述する
	}
	/**
	 * @type {any[][]}
	 */
	let selectedList = [];

	function clickMoveNotes() {
		//移動先を指定する
		console.log(selectedList);
		const ids = selectedList.map(([x, y]) => viewItem[x][y].id);
	}
	async function clickDeleteNotes() {
		const ids = selectedList.map(([x, y]) => viewItem[x][y].id);

		/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
		const t = await {
			message: `delete ${selectedList.length} notes `,
			action: {
				label: 'DELETE',
				response: () => deletedNotes(ids)
			},
			timeout: 10000,
			background: 'bg-red-500 text-white width-filled  rounded-container-token',
			buttonAction: 'btn variant-filled rounded-full'
		};
		toastStore.trigger(t);

		console.log(selectedList);
	}

	async function deletedNotes(ids) {
		nowLoading=true;
		await deleteNote(ids);
		const seleList = selectedList;
		for (let i = 0; i < seleList.length; i++) {
			const [x, y] = seleList[i];
			if (viewItem[x].length == 1) {
				viewItem[x] = [];
			} else {
				viewItem[x].splice(y, 1);
			}
		}
		viewItem = viewItem;
		selectedList = [];
		nowLoading=false;
	}

	/**
	 * @param {string} _tabSet
	 * @param {number} _ind
	 */
	function onCleckBoxChange(_tabSet, _ind) {
		console.log(viewItem[tabSet][_ind]);
		if (viewItem[tabSet][_ind].isChecked) {
			selectedList.push([tabSet, _ind]);
		} else {
			selectedList.slice(selectedList.indexOf([tabSet, _ind]));
		}
	}

	function onClickTab() {
		//tabが新しくなったらチェックボックスを全部からにする。
		//selectedListはからにする（全部ふぉるすにするから消しておけ）
		console.log(selectedList); // = [];	//前のタグのセレクト情報をリセット
		//今のタグの選択状況をリセット

		ClearSelectList();
	}
	function ClearSelectList() {
		for (const [x, y] of selectedList) {
			viewItem[x][y].isChecked = false;
		}
		selectedList = [];
		// for(let i = 0 ; i < selectedList.length;i++){
		// 	viewItem[selectedList[i][0]][selectedList[i][1]].isChecked=false;
		// }
		// viewItem[tabSet].forEach((item) => {
		// 	item.isChecked = false;
		// });
	}

	async function handleTagClick(_item) {
		console.log(_item.detail.name);
		const str = _item.detail.name;
		if (str == 'close') {
			isTagListDialog = false;
		} else {
			isTagListDialog = false;
			/**@type {import('@skeletonlabs/skeleton').ToastSettings}*/
			const t = await {
				message: `from [${tabSet}] to [${str}] [${selectedList.length}]notes`,
				action: {
					label: 'MOVE',
					response: () => moveSelectedNotes(str)
				},
				timeout: 10000,
				background: 'bg-red-500 text-white width-filled '
				//	'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white width-filled'
			};
			nowLoading = false;
			toastStore.trigger(t);
		}
	}
	async function moveSelectedNotes(str) {
		nowLoading=true;
		console.log(`${tabSet} から　${str}`);
		//selectedにはいってるやつを今のタグtabSetから写し先strへ
		const ids = selectedList.map(([x, y]) => viewItem[x][y].id);

		const responseEvent = await addNoteEvent(ids, event30001[tagList.indexOf(str)], relays);
		if (!responseEvent.isSuccess) {
			throw new Error(`Fail to add note id:${str}`);
		}
		event30001[tagList.indexOf(str)] = responseEvent.event;
		const t = {
			message: responseEvent.msg.join('\n'),
			timeout: 5000
		};
		const seleList = selectedList;
		const selectedItems = selectedList.map(([x, y]) => {
			viewItem[x][y].isChecked = false;
			return viewItem[x][y];
		});

		viewItem[str].splice(viewItem[str].length, 0, ...selectedItems);
		viewItem = viewItem;
		await deleteNote(ids);

		//削除したのを削除
		for (let i = 0; i < seleList.length; i++) {
			const [x, y] = seleList[i];
			if (viewItem[x].length == 1) {
				viewItem[x] = [];
			} else {
				viewItem[x].splice(y, 1);
			}
		}
		viewItem = viewItem;
		selectedList = [];
		nowLoading=false;
	}

	function openTagListDialog() {
		isTagListDialog = true;
	}
</script>

<Toast />

<p style="color:coral">ご利用は自己責任でお願いします</p>
<div class="head-li">
	<ul class="list-dl">
		<li>
			pubkey: {pubkey}
		</li>
		{#if relays != undefined}
			<details>
				<summary>relays</summary>
				{#each relays as relay}
					<li class="list">
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
			<Tab
				on:change={() => {
					onClickTab(tabSet);
				}}
				bind:group={tabSet}
				name={tag}
				value={tag}
			>
				{tag}
			</Tab>
		{/each}
		<!-- Tab Panels --->

		<svelte:fragment slot="panel">
			<div class="panel">
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
									{#if !isMulti}
										<button
											on:click={() => onClickMenu(note)}
											class="btn-icon btn-icon-sm variant-filled-primary rounded-full"
											style="position:relative">▼</button
										>
									{:else}
										<input
											class="checkbox"
											type="checkbox"
											bind:checked={note.isChecked}
											on:change={() => {
												onCleckBoxChange(tabSet, ind);
											}}
										/>
									{/if}
									{#if note.isMenuOpen}
										<PopupMenu
											on:item-click={handleItemClick}
											on:move-click={handleMoveClick}
											bind:tagList
											bind:tabSet
										/>
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
			</div>
		</svelte:fragment>
	</TabGroup>
{/await}

{#if !nowLoading}
	<div class="header-menu">
		<p>switch mode</p>
		<SlideToggle
			active="variant-ghost-primary"
			name="toggle"
			bind:checked={isMulti}
			on:change={() => {
				nClickMultiMode(isMulti);
			}}
		/>
	</div>
{/if}

<div class="footer-menu">
	{#if !nowLoading}
		{#if !isMulti}
			<button
				class="btn variant-soft-primary footer-btn hover:bg-blue-700 rounded-full font-bold"
				on:click={openAddNoteDialog}>add note</button
			>

			<button
				class="btn variant-soft-primary hover:bg-blue-700 footer-btn rounded-full font-bold"
				on:click={openEditTagDialog}>edit tag</button
			>
		{:else}
			<button
				class="btn variant-soft-secondary footer-btn hover:bg-blue-700 rounded-full font-bold"
				on:click={openTagListDialog}>move selected notes</button
			>
			<button
				class="btn variant-soft-warning hover:bg-orange-700 footer-btn rounded-full font-bold"
				on:click={clickDeleteNotes}>delete selected notes</button
			>
		{/if}
	{:else}
		<div class="progress">
			<ProgressRadial ... stroke={100} meter="stroke-primary-500" track="stroke-primary-500/30" />
		</div>
	{/if}
</div>
{#if isTagListDialog}
	<TagListDialog on:tag-click={handleTagClick} bind:tagList bind:tabSet />
{/if}
<AddNoteDialog
	bind:dialog
	on:closeAddNoteDialog={closeAddNoteDialog}
	on:add={(_item) => {
		addNote(_item, tabSet);
	}}
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
		left: 15px;
		bottom: 10px;
		z-index: 100;
	}
	.header-menu {
		border: solid 1px rgb(88, 88, 88);
		border-radius: 0.5em;
		padding: 0.4em;
		background-color: rgba(47, 52, 68, 0.822);
		display: block;
		position: fixed;
		text-align: center;
		right: 10px;
		top: 10px;
		z-index: 100;
	}
	.progress {
		margin-left: auto;
		display: inline-flex;
	}
	.footer-btn {
		margin: 5px;
	}

	.content {
		white-space: pre-wrap;
		max-height: 15em; /* 表示範囲の高さを指定 */
		overflow-y: scroll; /* 縦方向にスクロール可能にする */
	}
	.head-li {
		word-wrap: break-word;
	}
	.list {
		padding-left: 1em;
	}
	.panel {
		margin-top: -1em;
		max-height: calc(100vh - 9em); /* 表示範囲の高さを指定 */
		overflow-y: scroll; /* 縦方向にスクロール可能にする */
	}
</style>
