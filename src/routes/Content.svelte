<script>
    export let note = '';
    
    const regex = /(https?:\/\/[^\s]+)/g;
    
    async function getUrls(note) {
      const urls = note?.match(regex) || [];
      return urls;
    }
    
    function getImageSrc(url) {
      const ext = url.split('.').pop().toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') {
        return url;
      }
      return '';
    }
  </script>
  
  {#await getUrls(note) then urls}
    {#if note != undefined}
      <div>
        {#each note.split(regex) as part}
          {#if urls.includes(part)}
            <div class="imgs">
              {#if getImageSrc(part)}
                <a href={part} target="_blank"><img class="img" src={getImageSrc(part)} alt="" /></a>
              {:else}
                <a href={part} target="_blank">{part}</a>
              {/if}
            </div>
          {:else}
            {part}
          {/if}
        {/each}
      </div>
    {/if}
  {:catch error}
    <p>{error.message}</p>
  {/await}
  
  <style>
    .imgs {
      display: flex;
    }
    
    .img {
      display: inline;
      max-height: 10em;
    }
  </style>