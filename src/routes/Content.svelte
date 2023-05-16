<script>
  import { onMount } from "svelte";

  export let note = '';
  /**
   * @type {string[][]}
   */
  export let tags = [];

  // URL/Image判定の正規表現
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // 絵文字のマッピングを保持するMap
  let emojis = new Map(
    tags
      .filter(([tagName, tagContent, url]) => tagName === 'emoji' && tagContent !== undefined && url !== undefined)
      .reduce((map, [, shortcode, url]) => {
        map.set(shortcode, url);
        return map;
      }, new Map())
  );

  // URLをリンクに変換する関数
  function convertUrlToLink(url) {
    return `<a href="${url}" target="_blank">${url}</a>`;
  }

  // 画像URLを画像に変換する関数
  function convertImageUrlToImage(url, style) {
    
    return `<img src="${url}" alt="" style="${style}"/>`;
  }

  function getImageSrc(url) {
    const ext = url.split('.').pop().toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') {
      return url;
    }
    return '';
  }


  // noteを表示用に変換
  let convertedNote = note;
  
  $:convertedNote = note
    .split(urlRegex)
    .map(part => {
      if (part.match(urlRegex)) {
        if (part.includes('http://') || part.includes('https://')) {
          if (getImageSrc(part)) {
            return convertImageUrlToImage(part,   `display: inline; max-height: 10em;`);
          } else {
            return convertUrlToLink(part);
          }
        }
        return part;
      } else {
        return part;
      }
    })
    .join('');

  // emojisの要素がある場合にshortcodeをURL画像に置換
  $: if (emojis.size > 0) {
    const emojiRegex = /(:[^\s:]+:)/g;
    convertedNote = convertedNote.replace(emojiRegex, match => {
      const shortcode = match.slice(1, -1);
      const imageUrl = emojis.get(shortcode);
      if (imageUrl) {
        return convertImageUrlToImage(imageUrl, `display: inline;max-height: 1em;`);
      }
      return match;
    });
  }
</script>

<main>
  {#if convertedNote != undefined}
    <div>{@html convertedNote}</div>
  {/if}
</main>



  <!-- <style>
    .imgs {
      display: flex;
    }
    
    .img {
      display: inline;
      max-height: 10em;
    }
    .emoji{
      display: inline;
      max-height: 1em;
    }
  </style> -->