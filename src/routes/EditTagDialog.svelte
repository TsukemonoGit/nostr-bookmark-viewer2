<!--editTagDialog-->
<script>
	import { ListBox, ListBoxItem, ProgressRadial } from '@skeletonlabs/skeleton';
	import { createEventDispatcher } from 'svelte';

	export let editTagDialog; // （←ポイント） 要素をバインドすることで親側で表示・閉じるの制御が可能に
	export let nowLoading = false;
	let tagName = '';
    export let dialogMessage="";

    /**
	 * @type {string[]}
	 */
     export let tagList=[];
     let deleteTag="";
	const dispatch = createEventDispatcher();
	function clickClose() {
		dispatch('closeEditTagDialog');
        
	}
	function clickAdd() {
		dispatch('addTag', tagName);
		tagName = '';
	}
    function clickDelete() {
		dispatch('deleteTag', deleteTag);
		deleteTag = '';
	}
</script>

<dialog bind:this={editTagDialog}>
	<div class="inner">
		<h3>edit tag</h3>
		<p>
			<label
				>add new tag :
				<input type="email" class="input" bind:value={tagName} placeholder="tag name" />
			</label>
		</p>
        {#if tagList.length>0}
        <p style="color:red">delete tag select</p>
        <select class="select slt1" value={deleteTag} on:change={(e) => {deleteTag = e.target.value}}>
            <option value=""> </option>
            {#each tagList as tag}
            <option value={tag}>{tag}</option>
            {/each}
          
        </select>
        {/if}
        <div class ="flex">
		<button on:click={clickAdd} class="btn1 btn variant-filled-success">add tag</button>
        <button on:click={clickDelete} class="btn1 btn variant-filled-warning">delete tag</button>
		<button on:click={clickClose} class="btn1 btn variant-filled-secondary">close</button>
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
    .btn1{
        margin:1em;
    }
    .slt1{
        color:aliceblue
    }
</style>
