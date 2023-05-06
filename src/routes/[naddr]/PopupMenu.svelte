<script>
	// @ts-nocheck

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	/**@param {{name:string}} item*/
	function handleClick(item) {
		dispatch('item-click', item);
	}

	const items = [{ name: 'copy' }, { name: 'open' }, { name: 'delete' }, { name: 'close' }];
</script>

<button class="back" on:click={() => handleClick(items[3])}>
	<ul>
		{#each items as item}
			<li on:click={() => handleClick(item)} class="menu btn">{item.name}</li>
		{/each}
	</ul>
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
		z-index: 10;
		word-break: break-all;
		white-space: pre-wrap;
        font-weight: bold;
     
	}
	
</style>
