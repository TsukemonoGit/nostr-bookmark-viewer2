import { nip19, relayInit, SimplePool, getEventHash } from 'nostr-tools'

/**
 * @param {string} author
 * @param {string} relay 
 * @return {Promise<import("nostr-tools").Event[]>} 
 * - kind30001のタグごとのイベントex.[{tag:pinのイベント全体},{tag:bookmarkのイベント全体}]
 */
export async function getBookmarks(author, relay) {

    const relayIni = relayInit(relay);
    try {
        await relayIni.connect();
    } catch (error) {
        throw new Error("error");
    }
    const result = new Promise((resolve) => {
        let isSuccess = false;
        const timeoutID = setTimeout(() => {
            resolve(isSuccess);
        }, 5000);
        relayIni.on("connect", () => {
            console.log("is connected");
            isSuccess = true;

            clearTimeout(timeoutID);
        });
        relayIni.on("error", () => {
            console.log("failed to coneccted")
            isSuccess = false;

            clearTimeout(timeoutID);
        })
    });
    result.then(result => {
        if (!result) {
            throw new Error("failed to connect relay")
        }
        else {
            return true;
        }
    });
    if (!result) {
        throw new Error("failed to connect relay")
    }
    //以下コネクト成功？
    const sub = relayIni.sub([
        {
            kinds: [30001],
            authors: [author],
        },
    ]);

    const result2 = new Promise((resolve) => {
        /**
         * @type {import("nostr-tools").Event[]}
         */
        let _bookmarks = [];
        const timeoutID = setTimeout(() => {

            resolve(_bookmarks);
        }, 5000);
        sub.on("event", (event) => {

            _bookmarks.push(event);

        });
        sub.on("eose", () => {
            resolve(_bookmarks);
            clearTimeout(timeoutID);
        });
    });

    await result2.then(result => {
        //  console.log(result)
        return result;
    });//このリザルトはプロミスの結果に入る
    return result2;
}

/**
 * @param {string} pubkey
 * pubkeyがHexじゃなかったらHexに変換するやつ
 * @return {string}
 */
export function pubToHex(pubkey) {
    let author = pubkey;
    if(author==""){ throw new Error("error");}
    console.log(pubkey.slice(0, 4))
    if (pubkey.slice(0, 4) == "npub") {
        console.log(pubkey.slice(0, 4))
        try {
            author = nip19.decode(pubkey).data.toString();
        } catch (error) {
            throw new Error("error");
        }
    }
    try{
        const test =nip19.npubEncode(author);
    }catch{
        throw new Error("error");
    }
    return author
}
/**
 * @param {string} noteId
 * noteIDがHexじゃなかったらHexにするやつ
 * @return {string}
 */
export function noteToHex(noteId) {
    let noteHex = noteId;
    console.log(noteHex);
    console.log(nip19.decode(noteId))
    //console.log(noteId.slice(0, 4))
    if (noteId.slice(0, 4) == "note") {
        //console.log(noteId.slice(0, 4))
        try {
            noteHex = nip19.decode(noteId).data.toString();

        } catch (error) {
            throw new Error("error");

        }
    } else if (noteId.slice(0, 4) == "neve") {
        try {
            // @ts-ignore
            noteHex = nip19.decode(noteId).data.id;
        } catch {
            throw new Error("error");

        }
    }
    console.log(noteHex);
    return noteHex;
}

/**
 * @param {import("nostr-tools").Event[]} bookmark [{tag:pinのイベント全体},{tag:bookmarkのイベント全体}]
 * @return {{ [key: string]: string[]}} {tag: eventID[]]} のオブジェクト
 */
export function formatBookmark(bookmark) {
    /**
     * @type {{[key:string]:string[]}}
     */
    let fBookmark = {};
    for (let i = 0; i < bookmark.length; i++) {
        const bookmarkObjs = bookmark[i].tags.slice(1).map((tag) => tag[1]);
        const index = bookmark[i].tags[0][1];
        fBookmark[index] = bookmarkObjs
    }
    return fBookmark;
}


//イベント内容検索用リレーたち
let RelaysforSeach = [
    "wss://relay.nostr.band",
    "wss://nostr.wine",
    "wss://universe.nostrich.land",
    "wss://relay.damus.io"
];

/**
 * @param {string[]} idList
 * @return {Promise<{[key: string]: import("nostr-tools").Event;}>} ;//, string[]]>};
 * @param {string[]} RelaysforSeach
 */
export async function getEvent(idList , RelaysforSeach) {
    /**
     * 
     */
    //let pubkeys = [];
    let filter = [{ ids: [""] }];

    let eventList = idList.reduce((/** @type {{ [x: string]: string; }} */ list, /** @type {string | number} */ id) => {
        list[id] = "";
        return list;
    }, {});

    //console.log(eventList);
    //console.log(idList);
    filter[0].ids = idList;

    const pool = new SimplePool();
    let sub = pool.sub(RelaysforSeach, filter);
    const result = new Promise((resolve) => {

        const timeoutID = setTimeout(() => {
            resolve(eventList);//, pubkeys]);
        }, 5000);

        sub.on('event', event => {
            // @ts-ignore
            eventList[event.id] = event;
            //    if (!pubkeys.includes(event.pubkey)) {
            //      pubkeys.push(event.pubkey);
            //}

        });
        sub.on("eose", () => {
            sub.unsub(); //イベントの購読を停止
            clearTimeout(timeoutID); //settimeoutのタイマーより早くeoseを受け取ったら、setTimeoutをキャンセルさせる。
            resolve(eventList);//, pubkeys]);
            clearTimeout(timeoutID);
        });

    });
    //console.log(eventList);

    await result;// result プロミスの解決を待つ
    return result;
}


/**
 * @param {string[]} pubkeyList
 * @return {Promise<{[key: string]: import("nostr-tools").Event|""}>} key:pubkeyごとのprofileEvent
 * @param {string[]} RelaysforSeach
 */
export async function getProfile(pubkeyList,RelaysforSeach) {
    let profiles = pubkeyList.reduce((list, id) => {
        // @ts-ignore
        list[id] = "";
        return list;
    }, {});

    let filter = [
        {
            authors: pubkeyList,
            kinds: [0]
        }];
    const pool = new SimplePool();
    let sub = pool.sub(RelaysforSeach, filter);
    
    const result = new Promise((resolve) => {

        const timeoutID = setTimeout(() => {
            resolve(profiles);
        }, 5000);

        sub.on('event', event => {
        
            // @ts-ignore
            console.log(event.pubkey);
             // @ts-ignore
            profiles[event.pubkey] = event;
        });

        sub.on("eose", () => {
       console.log("eose");
            sub.unsub(); //イベントの購読を停止
            clearTimeout(timeoutID); //settimeoutのタイマーより早くeoseを受け取ったら、setTimeoutをキャンセルさせる。
            resolve(profiles);
            clearTimeout(timeoutID);
        });

    });
    //    console.log(eventList);

    await result;// result プロミスの解決を待つ
    console.log(profiles);
    return profiles;
}


//ブクマに追加
/**
 * @param {any} noteID
 * @param {import("nostr-tools").Event} _event
 * @param {any} relays
 * @return 成功したら送ったeventを返すよ
 * 
 */
export async function addNoteEvent(noteID, _event, relays) {
    console.log(_event);
    console.log(noteID);
    console.log(relays);

    const pushNote = ['e', noteID];
    _event.tags.push(pushNote);


    // @ts-ignore
    const event = await window.nostr.signEvent({
        content: _event.content,
        kind: _event.kind,
        pubkey: _event.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: _event.tags,
    });
    event.id = getEventHash(event);

    const pool = new SimplePool();
    let pub = pool.publish(relays, event);
    return new Promise((resolve) => {
        const timeoutID = setTimeout(() => {
            resolve(null);
        }, 5000);

        pub.on("ok", () => {
            console.log(`${relays.url} has accepted our event`);
            clearTimeout(timeoutID);
            resolve(event);
            
        });

        // @ts-ignore
        pub.on("failed", (reason) => {
            console.log(`failed to publish to: ${reason}`);
            clearTimeout(timeoutID);
            resolve(null);
           
        });
    });
    return event;
}

/**
 * @param {any} noteHexId
 * @param {string[]} RelaysforSeach
 */
export async function getSingleEvent(noteHexId,RelaysforSeach) {
    /**
    * @type {import("nostr-tools").Event}
    */
    // @ts-ignore
    let _event = {};
    let filter = [{ ids: [noteHexId] }];
    const pool = new SimplePool();
    let sub = pool.sub(RelaysforSeach, filter);
    const result = new Promise((resolve) => {

        const timeoutID = setTimeout(() => {
            sub.unsub();
            resolve(_event);
        }, 5000);

        sub.on('event', event => {
            console.log(event);
            _event = event;
            resolve(event);

        });
        sub.on("eose", () => {
            console.log("eose");
            sub.unsub(); //イベントの購読を停止
            clearTimeout(timeoutID); //settimeoutのタイマーより早くeoseを受け取ったら、setTimeoutをキャンセルさせる。
        });

    });
    console.log(_event);

    await result;// result プロミスの解決を待つ
    return result;
}


/**
 * @param {string} hexid
 * @param {import("nostr-tools").Event} _event
 * @param {any} relays
 * @return 成功したら送ったeventを返すよ
 * 
 */
export async function removeEvent(hexid, _event, relays) {

    //const removeNote = ['e', hexid];
    //console.log(removeNote);
    let tags = _event.tags;
    //console.log(tags);

    tags = tags.filter(tags => tags[1] !== hexid);


    // @ts-ignore
    const event = await window.nostr.signEvent({
        content: _event.content,
        kind: _event.kind,
        pubkey: _event.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: tags,
    });
    event.id = getEventHash(event);
    const pool = new SimplePool();
    let pub = pool.publish(relays, event);
    return new Promise((resolve) => {
        const timeoutID = setTimeout(() => {
            resolve(null);
        }, 5000);

        pub.on("ok", () => {
            console.log(`${relays.url} has accepted our event`);
            clearTimeout(timeoutID);
            resolve(event);
            
        });

        // @ts-ignore
        pub.on("failed", (reason) => {
            console.log(`failed to publish to: ${reason}`);
            clearTimeout(timeoutID);
            resolve(null);
           
        });
    });
}



/**
 * @param {string} tagName
 * @param {string} pubkey
 * @param {any} relays
 */
export async function createNewTag(tagName, pubkey, relays) {
    // @ts-ignore
    const event = await window.nostr.signEvent({
        content: "",
        kind: 30001,
        pubkey: pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['d', tagName]],
    });
    event.id = getEventHash(event);
    const pool = new SimplePool();
    let pub = pool.publish(relays, event);
    pub.on("ok", () => {
        console.log(`${relays.url} has accepted our event`);
    });
    // @ts-ignore
    pub.on("failed", (reason) => {
        console.log(
            `failed to publish to: ${reason}`
        );
    });

    return event;
}


/**
 * @param {string} eventID
 * @param {string} pubkey
 * @param {any} relays
 */
export async function DereteTag(eventID, pubkey, relays){
    const event = await window.nostr.signEvent({
      content: "",
      kind: 5,
      pubkey: pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['e', eventID]],
    });
    event.id = getEventHash(event);
    const pool = new SimplePool();
    return new Promise((resolve, reject) => {
      const pub = pool.publish(relays, event);
      pub.on("ok", () => {
        console.log(`${relays.url} has accepted our event`);
        resolve(true);
      });
      pub.on("failed", (reason) => {
        console.log(`failed to publish to: ${reason}`);
        resolve(false);
      });
    });
  }

/**
 * @param {{[key:string]: import("nostr-tools").Event}} eventList
 */
export function formatPubkeyList(eventList) {
    /**
         * @type {string[]}
         */
    let pubkeyArray = [];
  //  console.log(eventList);
    for (let item=0 ;item<Object.keys(eventList).length;item++) {
        const key = eventList[Object.keys(eventList)[item]];
       // console.log(item);
        // @ts-ignore
        if (!pubkeyArray.includes(key.pubkey)) {
            // @ts-ignore
       //     console.log(pubkeyArray.includes(key.pubkey));
              // @ts-ignore
            pubkeyArray.push(key.pubkey);
        }
    }
    return pubkeyArray;
}

