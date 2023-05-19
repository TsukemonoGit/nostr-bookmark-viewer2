<script>
	// @ts-nocheck
	import { ListBox, ListBoxItem } from '@skeletonlabs/skeleton';
	import { createEventDispatcher } from 'svelte';

	export let tagList;
	export let tabSet;
	let isMoveMenuOpen = false;
	let filteredTabList = [];
	//let valueSingle = 'books';

	const dispatch = createEventDispatcher();

	/**@param {{name:string}} item*/
	function handleClick(item) {
		//	console.log(tagList);
		//	console.log(item);
		//	console.log(isMoveMenuOpen);
		if (item.name == 'move') {
			// tabListからtabSetを含まない要素だけを含む新しい配列を作成する
			filteredTabList = tagList.filter((tab) => tab !== tabSet);

			isMoveMenuOpen = !isMoveMenuOpen;
		} else {
			dispatch('item-click', item);
		}
	}
	function onClickMoveMenu(item) {
		dispatch('move-click', item);
		//console.log(item);
	}

	const items = [
		{ name: 'copy' },
		{ name: 'open' },
		{ name: 'move' },
		{ name: 'delete' },
		{ name: 'close' }
	];

	//子要素がクリックされたときに親要素の on:click イベントも発火してしまい、意図しない動作になっていると思われます。

	//この問題を解決するには、子要素のイベントが親要素に伝播しないようにする必要があります。具体的には、li タグや ListBox タグに on:click イベントが発生したときに、event.stopPropagation() メソッドを呼び出してイベント伝播を止めるようにします。
</script>

<button class="back" on:click={() => handleClick({ name: 'close' })}>
	<div class="menu-dialog">
		<ul>
			{#each items as item}
				<li
					on:click={(event) => {
						event.stopPropagation();
						handleClick(item);
					}}
					class="menu btn"
				>
					{item.name}
				</li>
			{/each}
		</ul>

		{#if isMoveMenuOpen == true}
			<ul class="move-list">
				{#each filteredTabList as item}
					<li>
						<button
							class=" btn1 btn variant-ghost-secondary"
							on:click={(event) => {
								event.stopPropagation();
								onClickMoveMenu(item);
							}}
						>
							to [{item}]
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</button>

<style>
	.back {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 9999;
	}
	.menu {
		background-color: rgb(0, 0, 0);
		padding: 1rem;
		border-bottom: solid 1px rgb(70, 70, 70);
		border-right: solid 1px rgb(70, 70, 70);
		border-radius: 0.5rem;
		box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
		word-break: break-all;
		white-space: pre-wrap;
		font-weight: bold;
	}
	.menu-dialog {
		position: fixed;
	}
	.move-list {
		max-height: 10em; /* 表示範囲の高さを指定 */
		overflow-y: scroll; /* 縦方向にスクロール可能にする */
	}
	.btn1 {
		width: 100%;
		border-radius: 0%;
		font-weight: bold;
		text-shadow: 0.1em 0.1em 0.1em darkblue 
	}
</style>
