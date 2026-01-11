/* 
title: '山有木兮', author: '小可乐/OK影视修复版'
*/

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DefHeader = {'User-Agent': MOBILE_UA};

let HOSTS = [
  'https://film.symx.club',
  'https://film.symx.top'
];

let HOST = '';
let KParams = {
  headers: {
    'User-Agent': MOBILE_UA,
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest'
  },
  timeout: 8000
};

async function init(cfg) {
  for (let h of HOSTS) {
    try {
      let r = await request(h + '/api/film/category');
      let o = safeParseJSON(r);
      if (o?.data) {
        HOST = h;
        KParams.resObj = o;
        break;
      }
    } catch {}
  }
  if (!HOST) throw new Error('无可用站点');
  KParams.headers.Referer = HOST;
  KParams.headers.Origin = HOST;
}

async function home() {
  let arr = KParams.resObj?.data || [];
  let classes = arr.map(it => ({
    type_name: it.categoryName,
    type_id: String(it.categoryId)
  }));
  return JSON.stringify({class: classes, filters: {}});
}

async function homeVod() {
  let arr = (KParams.resObj?.data || []).flatMap(it => it.filmList || []);
  return JSON.stringify({list: getVodList(arr)});
}

async function category(tid, pg) {
  pg = pg > 0 ? pg : 1;
  let url = `${HOST}/api/film/category/list?categoryId=${tid}&pageNum=${pg}&pageSize=30`;
  let obj = safeParseJSON(await request(url));
  let list = obj?.data?.list || obj?.data?.records || obj?.data?.rows || [];
  return JSON.stringify({list: getVodList(list), page: pg, pagecount: 999, limit: 30, total: 999});
}

async function search(wd, quick, pg) {
  pg = pg > 0 ? pg : 1;
  let obj = safeParseJSON(await request(`${HOST}/api/film/search?keyword=${encodeURIComponent(wd)}&pageNum=${pg}&pageSize=30`));
  let list = obj?.data?.list || obj?.data?.records || [];
  return JSON.stringify({list: getVodList(list), page: pg, pagecount: 10, limit: 30, total: 300});
}

async function detail(ids) {
  let [id] = ids.split('@');
  let obj = safeParseJSON(await request(`${HOST}/api/film/detail?id=${id}`));
  let d = obj?.data;
  if (!d) return JSON.stringify({list: []});

  let tabs = [], urls = [];
  for (let it of d.playLineList || []) {
    tabs.push(it.playerName || '默认线路');
    urls.push((it.lines || []).map(e => `${e.name || '第1集'}$${e.id}@${it.playerName}`).join('#'));
  }

  return JSON.stringify({
    list: [{
      vod_id: d.id,
      vod_name: d.name,
      vod_pic: d.cover,
      vod_content: d.blurb,
      vod_play_from: tabs.join('$$$'),
      vod_play_url: urls.join('$$$')
    }]
  });
}

async function play(flag, ids) {
  let [id] = ids.split('@');
  let obj = safeParseJSON(await request(`${HOST}/api/line/play/parse?lineId=${id}`));
  let url = obj?.data || '';
  let parse = !/\.m3u8|\.mp4|\.mkv/.test(url);
  return JSON.stringify({jx: parse ? 1 : 0, parse: parse ? 1 : 0, url, header: DefHeader});
}

function getVodList(arr) {
  return arr.map(it => ({
    vod_name: it.name,
    vod_pic: it.cover,
    vod_remarks: it.updateStatus || '',
    vod_id: String(it.id)
  }));
}

function safeParseJSON(s) {
  try { return JSON.parse(s); } catch { return null; }
}

async function request(url, opt = {}) {
  return (await req(url, {...KParams, ...opt})).content || '';
}

export function __jsEvalReturn() {
  return { init, home, homeVod, category, search, detail, play };
}
