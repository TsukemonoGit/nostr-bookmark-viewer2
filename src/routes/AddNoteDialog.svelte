<script>
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { createEventDispatcher } from 'svelte';

	export let dialog; // （←ポイント） 要素をバインドすることで親側で表示・閉じるの制御が可能に
	export let nowLoading = false;
	let noteID = '';
    export let dialogMessage="";
    export let tabSet="";
	const dispatch = createEventDispatcher();
	function clickClose() {
		dispatch('closeAddNoteDialog');
        
	}
	function clickAdd() {
		dispatch('add', noteID);
		noteID = '';
	}
</script>

<dialog bind:this={dialog}>
	<div class="inner">
		<h3>Add Note (tag:{tabSet})</h3>
		<p>
			<label
				>noteID:
				<input type="email" class="input" bind:value={noteID} placeholder="npub..." />
			</label>
		</p>
        <div class ="flex">
		<button on:click={clickAdd} class="btn variant-filled-primary"> add note</button>
		<button on:click={clickClose} class="btn variant-filled-secondary"> close </button>
		{#if nowLoading}
            <div class="progress">
				<ProgressRadial ... width="w-10" stroke={100} meter="stroke-primary-500" track="stroke-primary-500/30" />
            </div>
		{/if}
	</div>
    <div class ="message">
        {dialogMessage}
    </div>
</div>
</dialog>

<style>
	.input {
		height: 2em;
		margin-bottom: 1em;
		color: aliceblue;
	}
    .flex{
        display: flex;
    }
 .progress{
    display: inline;
 margin-left: auto;
 }
    .message{
        color:red;
    }
</style>
