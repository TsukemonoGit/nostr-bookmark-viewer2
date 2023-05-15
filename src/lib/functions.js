import { nip19, relayInit, SimplePool, getEventHash } from 'nostr-tools'
import { null_to_empty } from 'svelte/internal';

/**
 * @param {string} author
 * @param {string[]} relays
 * @return {Promise<import("nostr-tools").Event[]>} 
 * - kind30001のタグごとのイベントex.[{tag:pinのイベント全体},{tag:bookmarkのイベント全体}]
 */
export async function getBookmarks(author, relays) {

    // const relayIni = relayInit(relay);
    // try {
    //     await relayIni.connect();
    // } catch (error) {
    //     throw new Error("error");
    // }


    // const result = new Promise((resolve) => {
    //     let isSuccess = false;
    //     const timeoutID = setTimeout(() => {
    //         resolve(isSuccess);
    //     }, 5000);
    //     relayIni.on("connect", () => {
    //         console.log("is connected");
    //         isSuccess = true;

    //         clearTimeout(timeoutID);
    //     });
    //     relayIni.on("error", () => {
    //         console.log("failed to coneccted")
    //         isSuccess = false;

    //         clearTimeout(timeoutID);
    //     })
    // });
    // result.then(result => {
    //     if (!result) {
    //         throw new Error("failed to connect relay")
    //     }
    //     else {
    //         return true;
    //     }
    // });
    // if (!result) {
    //     throw new Error("failed to connect relay")
    // }


    // //以下コネクト成功？
    // const sub = relayIni.sub([
    //     {
    //         kinds: [30001],
    //         authors: [author],
    //     },
    // ]);

    const filter = [{
        kinds: [30001],
        authors: [author],
    }];

    const pool = new SimplePool();
    const sub = pool.sub(relays, filter);

    const bookmarks = new Map();
    const timeoutID = setTimeout(() => sub.close(), 5000);

    sub.on('event', (event) => {
        const tag = event.tags[0][1];
        if (bookmarks.has(tag) && event.created_at <= bookmarks.get(tag).created_at) {
            return;
        }
        bookmarks.set(tag, event);
    });

    const result = await new Promise((resolve) => {
        sub.on('eose', () => {
            clearTimeout(timeoutID);
            resolve(Array.from(bookmarks.values()));
        });
    });

    return result;
}


/**
 * @param {string} pubkey
 * pubkeyがHexじゃなかったらHexに変換するやつ
 * @return {string}
 */
export function pubToHex(pubkey) {
    let author = pubkey;
    if (author == "") { throw new Error("error"); }
    console.log(pubkey.slice(0, 4))
    if (pubkey.slice(0, 4) == "npub") {
        console.log(pubkey.slice(0, 4))
        try {
            author = nip19.decode(pubkey).data.toString();
        } catch (error) {
            throw new Error("error");
        }
    }
    try {
        const test = nip19.npubEncode(author);
    } catch {
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
// let RelaysforSeach = [
//     "wss://relay.nostr.band",
//     "wss://nostr.wine",
//     "wss://universe.nostrich.land",
//     "wss://relay.damus.io"
// ];

/**
 * @param {string[]} idList
 * @return {Promise<{[key: string]: import("nostr-tools").Event;}>} ;//, string[]]>};
 * @param {string[]} RelaysforSeach
 */
export async function getEvent(idList, RelaysforSeach) {
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
            // console.log(event);
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
 * @param {string[]} RelaysforSeach
 * @return {Promise<{[key: string]: import("nostr-tools").Event | ""}>} key:pubkeyごとのprofileEvent
 */
export async function getProfile(pubkeyList, RelaysforSeach) {
    const profiles = Object.fromEntries(pubkeyList.map(id => [id, ""]));
    const filter = [{
        authors: pubkeyList,
        kinds: [0]
    }];

    const pool = new SimplePool();
    const list = pool.list(RelaysforSeach, filter);

    const result = list.then(event => {
        event.forEach(item => profiles[item.pubkey] = item);
        console.log(event);
        console.log(profiles);
        return profiles; // ここでPromiseをresolveする
    });
    list.catch((reason)=>{
        console.log(reason);
    });
    list.finally(()=>{
        console.log("finally");
    });
    return result; // Promiseを返す
}


//ブクマに追加
/**
 * @param {string|string[]} noteID
 * @param {import("nostr-tools").Event} _event
 * @param {any} relays
 * @return 成功したら送ったeventを返すよ
 * 
 */
export async function addNoteEvent(noteID, _event, relays) {
    console.log(_event);
    console.log(noteID);
    console.log(relays);

    //イベントを更新する。
    const filter = [{
        'kinds': [30001],
        'authors': [_event.pubkey],
        '#d': [_event.tags[0][1]]
    }];

    const thisEve = await reloadEvent(_event, relays, filter);

    //----------------------------------------------------
    if (typeof noteID == 'string') {
        thisEve.tags.push(['e', noteID]);
    } else {
        const newTags = noteID.map((id) => ['e', id]);
        thisEve.tags.push(...newTags);
    }
    try {
        const event = await window.nostr.signEvent({
            content: thisEve.content,
            kind: thisEve.kind,
            pubkey: thisEve.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            tags: thisEve.tags,
        });

        event.id = getEventHash(event);
        let msg = [];
        let isSuccess = false;
        const pool = new SimplePool();
        const pub = pool.publish(relays, event);

        return new Promise((resolve) => {
            const timeoutID = setTimeout(() => {
                resolve({ isSuccess, event, msg });
            }, 5000);

            pub.on("ok", relay => {
                isSuccess = true;
                msg.push(`[ok]${relay}`);

                if (msg.length == relays.length) {
                    clearTimeout(timeoutID);
                    resolve({ isSuccess, event, msg });
                }
            });

            pub.on("failed", relay => {
                msg.push(`[failed]${relay}`);

                if (msg.length == relays.length) {
                    clearTimeout(timeoutID);
                    resolve({ isSuccess, event, msg });
                }
            });
        });
    } catch (error) {
        throw new Error('拡張機能が読み込めませんでした');
    }
}

/**
 * @param {any} noteHexId
 * @param {string[]} RelaysforSeach
 */
export async function getSingleEvent(noteHexId, RelaysforSeach) {
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
 * @param {string|string[]} hexid
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


    //イベントを更新する。
    const filter = [{
        'kinds': [30001],
        'authors': [_event.pubkey],
        '#d': [_event.tags[0][1]]
    }];

    const thisEve = await reloadEvent(_event, relays, filter);

    //----------------------------------------------------
    if (typeof hexid == 'string') {
        tags = tags.filter(tags => tags[1] !== hexid);
    } else {
        hexid.forEach(id => {
            tags = tags.filter(tags => tags[1] !== id);
        });
    }
    try {
        // @ts-ignore
        const event = await window.nostr.signEvent({
            content: thisEve.content,
            kind: thisEve.kind,
            pubkey: thisEve.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            tags: tags,
        });
        event.id = getEventHash(event);
        const pool = new SimplePool();
        let pub = pool.publish(relays, event);

        let isSuccess = false;
        let msg = [];
        return new Promise((resolve) => {
            const timeoutID = setTimeout(() => {
                resolve({ isSuccess, event, msg });
            }, 5000);

            pub.on("ok", relay => {
                isSuccess = true;
                msg.push(`[ok]${relay}`);
                if (msg.length == relays.length) {
                    clearTimeout(timeoutID);
                    resolve({ isSuccess, event, msg });
                }

            });

            // @ts-ignore
            pub.on("failed", relay => {
                msg.push(`[failed]${relay}`);
                if (msg.length == relays.length) {
                    clearTimeout(timeoutID);
                    resolve({ isSuccess, event, msg });
                }
            });
        });
    } catch (error) {
        throw new Error('拡張機能が読み込めませんでした');
    }
}



/**
 * @param {string} tagName
 * @param {string} pubkey
 * @param {any} relays
 */
export async function createNewTag(tagName, pubkey, relays) {
    try {
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

        let isSuccess = false;
        let msg = [];
        return new Promise((resolve) => {
            const timeoutID = setTimeout(() => {
                resolve({ isSuccess, event, msg });
            }, 5000);

            pub.on("ok", relay => {
                isSuccess = true;
                msg.push(`[ok]${relay}`);
                if (msg.length == relays.length) {
                    clearTimeout(timeoutID);
                    resolve({ isSuccess, event, msg });
                }
            });
            // @ts-ignore
            pub.on("failed", relay => {
                msg.push(`[faled]${relay}`);
                if (msg.length == relays.length) {
                    clearTimeout(timeoutID);
                    resolve({ isSuccess, event, msg });
                }
            });

        });
    } catch (error) {
        throw new Error('拡張機能が読み込めませんでした');
    }
}


/**
 *  @param {import("nostr-tools").Event} _event
 * @param {string} pubkey
 * @param {any} relays
 */
export async function DereteTag(_event, pubkey, relays) {
    //イベントを更新する。
    const filter = [{
        'kinds': [30001],
        'authors': [_event.pubkey],
        '#d': [_event.tags[0][1]]
    }];

    const thisEve = await reloadEvent(_event, relays, filter);

    //----------------------------------------------------

    try {
        const event = await window.nostr.signEvent({
            content: "",
            kind: 5,
            pubkey: pubkey,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['e', thisEve.id]],
        });
        event.id = getEventHash(event);
        const pool = new SimplePool();
        const pub = pool.publish(relays, event);

        let isSuccess = false;
        let msg = [];
        return new Promise((resolve) => {
            const timeoutID = setTimeout(() => {
                resolve({ isSuccess, event, msg });
            }, 5000);

            pub.on("ok", relay => {
                isSuccess = true;
                msg.push(`[ok]${relay}`);
                if (msg.length == relays.length) {
                    clearTimeout(timeoutID);
                    resolve({ isSuccess, event, msg });
                }
            });
            // @ts-ignore
            pub.on("failed", relay => {
                msg.push(`[failed]${relay}`);
                if (msg.length == relays.length) {
                    clearTimeout(timeoutID);
                    resolve({ isSuccess, event, msg });
                }
            });
        });
    } catch { throw new Error('拡張機能が読み込めませんでした'); }
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
    for (let item = 0; item < Object.keys(eventList).length; item++) {
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


/**
 * @param {import("nostr-tools").Event} _event
 * @param {string[]} relays
 * @param {import("nostr-tools").Filter[] | { kinds: number[]; authors: string[]; '#d': string[]; }[]} filter
 */
async function reloadEvent(_event, relays, filter) {

    const pool = new SimplePool();
    let sub = pool.sub(relays, filter);

    const result = await new Promise((resolve) => {
        /**
         * @type {import("nostr-tools").Event | null}
         */
        let returnEvent;
        const timeoutID = setTimeout(() => {
            sub.unsub();
            resolve(returnEvent);
        }, 5000);

        sub.on('event', event => {
            console.log(event);
            if (returnEvent == null) {
                returnEvent = event;
            } else {
                if (returnEvent.created_at < event.created_at) {
                    returnEvent = event;
                }
            }

        });
        sub.on("eose", () => {
            console.log("eose");
            resolve(returnEvent)
            sub.unsub(); //イベントの購読を停止
            clearTimeout(timeoutID); //settimeoutのタイマーより早くeoseを受け取ったら、setTimeoutをキャンセルさせる。
        });

    });
    let newEve = _event;
    if (result != null && result.created_at > _event.created_at) {
        newEve = result;
    }
    return newEve;
}

