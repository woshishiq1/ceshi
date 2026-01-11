/* 
title: '山有木兮', author: '小可乐/v6.1.1-ok修复'
*/

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DefHeader = {'User-Agent': MOBILE_UA};

let HOST;
let KParams = {
  headers: {
    'User-Agent': MOBILE_UA,
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest'
  },
  timeout: 8000
};

async function init(cfg) {
  try {
    HOST = (cfg.ext?.host?.trim() || 'https://film.symx.club').replace(/\/$/, '');
    KParams.headers.Referer = HOST;
    KParams.headers.Origin = HOST;

    let parseTimeout = parseInt(cfg.ext?.timeout, 10);
    KParams.timeout = parseTimeout > 0 ? parseTimeout : 8000;
    KParams.catesSet = cfg.ext?.catesSet?.trim() || '';
    KParams.tabsSet = cfg.ext?.tabsSet?.trim() || '';

    let raw = await request(`${HOST}/api/film/category`);
    let obj = safeParseJSON(raw);
    if (!obj) throw new Error('分类接口无 JSON 返回');
    KParams.resObj = obj;

  } catch (e) {
    console.error('init失败:', e.message);
  }
}

async function home() {
  try {
    let arr = KParams.resObj?.data || KParams.resObj?.list || [];
    let classes = arr.map(it => ({
      type_name: it.categoryName || it.name,
      type_id: String(it.categoryId || it.id)
    }));
    if (KParams.catesSet) classes = ctSet(classes, KParams.catesSet);
    KParams.tidToTname = {};
    classes.forEach(it => KParams.tidToTname[it.type_id] = it.type_name);
    return JSON.stringify({class: classes, filters: {}});
  } catch {
    return JSON.stringify({class: [], filters: {}});
  }
}

async function homeVod() {
  try {
    let arr = (KParams.resObj?.data || []).flatMap(it => it.filmList || it.list || []);
    return JSON.stringify({list: getVodList(arr)});
  } catch {
    return JSON.stringify({list: []});
  }
}

async function category(tid, pg, filter, extend) {
  try {
    pg = pg > 0 ? pg : 1;
    let url = `${HOST}/api/film/category/list?categoryId=${extend?.cateId || tid}&area=${extend?.area||''}&language=${extend?.lang||''}&year=${extend?.year||''}&sort=${extend?.by||''}&pageNum=${pg}&pageSize=30`;
    let obj = safeParseJSON(await request(url));
    let list = obj?.data?.list || obj?.data?.records || obj?.data || [];
    return JSON.stringify({list: getVodList(list), page: pg, pagecount: 999, limit: 30, total: 999});
  } catch {
    return JSON.stringify({list: [], page: 1, pagecount: 0, limit: 30, total: 0});
  }
}

async function search(wd, quick, pg) {
  try {
    pg = pg > 0 ? pg : 1;
    let obj = safeParseJSON(await request(`${HOST}/api/film/search?keyword=${encodeURIComponent(wd)}&pageNum=${pg}&pageSize=30`));
    let list = obj?.data?.list || obj?.data || [];
    return JSON.stringify({list: getVodList(list), page: pg, pagecount: 10, limit: 30, total: 300});
  } catch {
    return JSON.stringify({list: [], page: 1, pagecount: 0, limit: 30, total: 0});
  }
}

function getVodList(arr) {
  return (arr||[]).map(it => ({
    vod_name: it.name,
    vod_pic: it.cover,
    vod_remarks: it.updateStatus || '',
    vod_id: `${it.id}`
  }));
}

async function detail(ids) {
  try {
    let [id] = ids.split('@');
    let obj = safeParseJSON(await request(`${HOST}/api/film/detail?id=${id}`));
    let d = obj?.data;
    if (!d) return JSON.stringify({list: []});

    let tabs=[], urls=[];
    for (let it of d.playLineList||[]) {
      tabs.push(it.playerName);
      urls.push((it.lines||[]).map(e=>`${e.name}$${e.id}@${it.playerName}`).join('#'));
    }

    return JSON.stringify({list:[{
      vod_id:d.id,
      vod_name:d.name,
      vod_pic:d.cover,
      vod_content:d.blurb,
      vod_play_from:tabs.join('$$$'),
      vod_play_url:urls.join('$$$')
    }]});
  } catch {
    return JSON.stringify({list: []});
  }
}

async function play(flag, ids) {
  let [id] = ids.split('@');
  let obj = safeParseJSON(await request(`${HOST}/api/line/play/parse?lineId=${id}`));
  let url = obj?.data || '';
  let parse = !/\.m3u8|\.mp4|\.mkv/.test(url);
  return JSON.stringify({jx: parse?1:0, parse: parse?1:0, url, header: DefHeader});
}

function ctSet(kArr, setStr) {
  const names = setStr.split('&');
  return names.map(n=>kArr.find(i=>i.type_name===n)).filter(Boolean);
}

function safeParseJSON(s) { try {return JSON.parse(s);} catch {return null;} }

async function request(url,opt={}) {
  return (await req(url,{...KParams,...opt})).content||'';
}

export function __jsEvalReturn() {
  return {init,home,homeVod,category,search,detail,play,proxy:null};
}
