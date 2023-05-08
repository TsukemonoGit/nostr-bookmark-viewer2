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
		noteID="";
		dispatch('closeAddNoteDialog');
        
	}
	function clickAdd() {
		dispatch('add', noteID);
		noteID="";
	}
</script>

<dialog bind:this={dialog}>
	<div class="inner">
		<h3>Add Note (tag:{tabSet})</h3>
		<p>
			<label
				>noteID:
				<input type="text" pattern="^[-0-9a-z0-9]+$" class="input" bind:value={noteID} placeholder="note..." />
			</label>
		</p>
        <div class ="flex">
		<button on:click={clickAdd} class="btn variant-filled-primary rounded-full"> add note</button>
		<button on:click={clickClose} class="btn variant-filled-secondary rounded-full"> close </button>
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
	.btn{margin:0.5em;}
</style>
