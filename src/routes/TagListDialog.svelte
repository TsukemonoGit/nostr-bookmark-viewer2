<script>
	// @ts-nocheck
	import { ListBox, ListBoxItem } from '@skeletonlabs/skeleton';
	import { createEventDispatcher, onMount } from 'svelte';

	export let tagList;
	export let tabSet;
	let filteredTabList = [];
	//let valueSingle = 'books';

	const dispatch = createEventDispatcher();

	$: filteredTabList = tagList.filter((tab) => tab !== tabSet);

	function onClickMoveMenu(item) {
		console.log(item.name);
		if (item.name == close) {
			dispatch('closeTagListDialog');
		} else {
			dispatch('tag-click', item);
			//console.log(item);
		}
	}

	//子要素がクリックされたときに親要素の on:click イベントも発火してしまい、意図しない動作になっていると思われます。

	//この問題を解決するには、子要素のイベントが親要素に伝播しないようにする必要があります。具体的には、li タグや ListBox タグに on:click イベントが発生したときに、event.stopPropagation() メソッドを呼び出してイベント伝播を止めるようにします。
</script>

<button class="back" on:click={() => onClickMoveMenu({ name: 'close' })}>
	<div class="move">
		<div class="move-to">move notes to</div>
		<ul class="move-list">
			{#each filteredTabList as item}
				<li>
					<button
						class=" btn1 btn"
						on:click={(event) => {
							event.stopPropagation();
							onClickMoveMenu({ name: item });
						}}
					>
						{item}
					</button>
				</li>
			{/each}
		</ul>
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
	.move{
		border: solid 1px rgb(88, 88, 88);
	}

	.move-list {
	
		max-height: 15em; /* 表示範囲の高さを指定 */
		overflow-y: scroll; /* 縦方向にスクロール可能にする */
	}
	.btn1 {
		width: 100%;
		border-radius: 0%;
		font-weight: bold;
		color: black;
		border: solid 1px rgb(0, 0, 0);
		background-color: rgba(205, 231, 255, 0.596);
	}
	.move-to{
		padding:0.5em 3em;
		font-weight: bold;
		background-color: rgba(0, 0, 0, 0.6);
	}
</style>
