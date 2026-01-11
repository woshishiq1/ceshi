/* 
title: '山有木兮', author: '小可乐/v6.1.1' 
ext:
{
  "host": "https://film.symx.club",
  "timeout": 6000,
  "catesSet": "剧集&电影&综艺",
  "tabsSet": "线路2&线路1"
}
*/

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36';
const DefHeader = {'User-Agent': MOBILE_UA};
let HOST;

let KParams = {
    headers: {'User-Agent': MOBILE_UA},
    timeout: 5000,
    resObj: null,
    tidToTname: {}
};

async function init(cfg) {
    HOST = (cfg.ext?.host?.trim() || 'https://film.symx.club').replace(/\/$/, '');
    KParams.headers = {'User-Agent': MOBILE_UA, 'Referer': HOST};
    let t = parseInt(cfg.ext?.timeout || 0);
    KParams.timeout = t > 0 ? t : 5000;
    KParams.catesSet = cfg.ext?.catesSet?.trim() || '';
    KParams.tabsSet = cfg.ext?.tabsSet?.trim() || '';
    await loadCategory();
}

async function loadCategory() {
    if (KParams.resObj) return;
    let txt = await request(`${HOST}/api/film/category`);
    let obj = safeParseJSON(txt);
    if (!obj || !obj.data) throw new Error('分类接口无数据');
    KParams.resObj = obj;
}

async function home() {
    await loadCategory();
    let typeArr = KParams.resObj.data || [];
    let classes = typeArr.map(it => ({type_name: it.categoryName, type_id: it.categoryId.toString()}));
    if (KParams.catesSet) classes = ctSet(classes, KParams.catesSet);
    classes.forEach(it => KParams.tidToTname[it.type_id] = it.type_name);
    return JSON.stringify({class: classes, filters: {}});
}

async function homeVod() {
    await loadCategory();
    let arr = (KParams.resObj.data || []).flatMap(it => it.filmList || []);
    return JSON.stringify({list: getVodList(arr)});
}

async function category(tid, pg, filter, extend) {
    pg = parseInt(pg) || 1;
    let url = `${HOST}/api/film/category/list?categoryId=${extend?.cateId || tid}&region=${extend?.area || ''}&lang=${extend?.lang || ''}&year=${extend?.year || ''}&order=${extend?.by || ''}&pageNum=${pg}&pageSize=30`;
    let obj = safeParseJSON(await request(url));
    let arr = obj?.data?.list || [];
    return JSON.stringify({list: getVodList(arr), page: pg, pagecount: 999, limit: 30, total: 999 * 30});
}

async function search(wd, quick, pg) {
    pg = parseInt(pg) || 1;
    let url = `${HOST}/api/film/search?keyword=${wd}&pageNum=${pg}&pageSize=30`;
    let obj = safeParseJSON(await request(url));
    let arr = obj?.data?.list || [];
    return JSON.stringify({list: getVodList(arr), page: pg, pagecount: 10, limit: 30, total: 300});
}

function getVodList(arr) {
    return (arr || []).map(it => {
        let k = it.categoryId?.toString() || '';
        let remarks = `${it.updateStatus || ''}|${it.doubanScore || ''}|${KParams.tidToTname[k] || ''}`;
        return {
            vod_id: `${it.id}@${it.name}@${it.cover}@${remarks}`,
            vod_name: it.name,
            vod_pic: it.cover,
            vod_remarks: remarks
        };
    });
}

async function detail(ids) {
    let [id, name, pic, remarks] = ids.split('@');
    let obj = safeParseJSON(await request(`${HOST}/api/film/detail?id=${id}`));
    let d = obj?.data;
    if (!d) return JSON.stringify({list: []});

    let tabs = [], urls = [];
    (d.playLineList || []).forEach(it => {
        tabs.push(it.playerName);
        urls.push((it.lines || []).map(l => `${l.name}$${l.id}@${it.playerName}`).join('#'));
    });

    if (KParams.tabsSet) {
        let arr = tabs.map((t,i)=>({type_name:t,type_value:urls[i]}));
        arr = ctSet(arr, KParams.tabsSet);
        tabs = arr.map(it=>it.type_name);
        urls = arr.map(it=>it.type_value);
    }

    return JSON.stringify({
        list: [{
            vod_id: d.id,
            vod_name: d.name || name,
            vod_pic: d.cover || pic,
            vod_remarks: remarks,
            vod_year: d.year,
            vod_area: d.other,
            vod_actor: d.actor,
            vod_director: d.director,
            vod_content: d.blurb,
            vod_play_from: tabs.join('$$$'),
            vod_play_url: urls.join('$$$')
        }]
    });
}

async function play(flag, ids) {
    let [lineId] = ids.split('@');
    let url = `${HOST}/api/line/play/parse?lineId=${lineId}&filmId=${flag}`;
    let obj = safeParseJSON(await request(url));
    let playUrl = obj?.data || url;
    let jx = /^http/.test(playUrl) ? 0 : 1;
    let parse = /m3u8|mp4|mkv/.test(playUrl) ? 0 : 1;
    return JSON.stringify({jx, parse, url: playUrl, header: DefHeader});
}

function ctSet(arr, setStr) {
    let names = setStr.split('&');
    let out = names.map(n => arr.find(it => it.type_name === n)).filter(Boolean);
    return out.length ? out : [arr[0]];
}

function safeParseJSON(s) { try { return JSON.parse(s); } catch { return null; } }

async function request(url, opt={}) {
    let res = await req(url, {
        headers: {...KParams.headers, ...(opt.headers||{})},
        timeout: KParams.timeout,
        charset: 'utf-8'
    });
    return res?.content || '';
}

export function __jsEvalReturn() {
    return {init, home, homeVod, category, search, detail, play, proxy: null};
}
