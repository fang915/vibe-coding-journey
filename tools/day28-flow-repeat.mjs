/* Day 28 · 板块② 核心流程重复检测 —— 寻味 / Xunwei
 *
 * 目的：不是"再看一遍能不能用"，而是"同一套动作连做 N 遍，数字会不会飘"。
 * 每轮都重新加载页面（模拟新访客），依次走：首页 → 搜索 → 地区筛选 → 详情滑到底。
 *
 * 用法： node tools/day28-flow-repeat.mjs [轮数，默认 3]
 * 输出： 控制台 JSON + 报告文件 user-test/day28-flow-repeat.json
 *
 * 纪律：任何一项没拿到数字就写 null / fail 原因，不填默认值冒充通过。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const ROUNDS = Math.max(1, parseInt(process.argv[2] || '3', 10) || 3);

const CFG = {
  staticBase: 'https://vibecodingstudy-d1f1el6a03d5aad8-1499243471.tcloudbaseapp.com',
  apiBase: 'https://vibecodingstudy-d1f1el6a03d5aad8-1499243471.ap-shanghai.app.tcloudbase.com/api',
  edgePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  debugPort: 9566,
  viewport: { width: 1180, height: 1000 },
  expectCards: 13,          // 库里 13 道，首页应显示 13 张卡
  expectFujian: 2,          // 福建 2 道
  filterBtnRegion: '福建',   // 注意：按钮上的 data-region 存的是中文名，不是拼音 slug
  filterHash: '#/region/fujian',   // 地址栏里是拼音 slug
  searchKeyword: '螺蛳粉',
  searchExpectId: 'luosifen'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outFile = path.join(ROOT, 'user-test', 'day28-flow-repeat.json');

if (!fs.existsSync(CFG.edgePath)) {
  console.log(JSON.stringify({ ok: false, reason: '找不到浏览器：' + CFG.edgePath }, null, 2));
  process.exit(2);
}

const profile = path.join(os.tmpdir(), 'xunwei-day28-repeat-profile');
fs.rmSync(profile, { recursive: true, force: true });
fs.mkdirSync(profile, { recursive: true });

const child = spawn(CFG.edgePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + CFG.debugPort,
  '--user-data-dir=' + profile,
  '--window-size=' + CFG.viewport.width + ',' + CFG.viewport.height,
  'about:blank'
], { stdio: 'ignore', detached: false });

const kill = () => {
  try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); }
  catch { try { child.kill('SIGKILL'); } catch { /* ignore */ } }
};

let ws, send, ev, evs = [];
const consoleErrors = [];

function resetEvs() {
  evs = [];
  // 只保留网络/日志事件；错误由调用方在窗口内自行切片
}

async function connect() {
  let ok = false;
  for (let i = 0; i < 40; i++) {
    try {
      await (await fetch('http://127.0.0.1:' + CFG.debugPort + '/json/version', { signal: AbortSignal.timeout(1500) })).json();
      ok = true; break;
    } catch { await sleep(400); }
  }
  if (!ok) throw new Error('浏览器调试端口没起来');
  const page = (await (await fetch('http://127.0.0.1:' + CFG.debugPort + '/json/list')).json()).find((t) => t.type === 'page');
  if (!page) throw new Error('没有页面目标');

  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP 连不上')); });

  let id = 0;
  const pend = new Map();
  ws.onmessage = (e) => {
    const raw = typeof e.data === 'string' ? e.data : Buffer.from(e.data).toString('utf8');
    const m = JSON.parse(raw);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method) evs.push(m);
  };
  send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r?.result?.exceptionDetails) return undefined;
    return r?.result?.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: CFG.viewport.width, height: CFG.viewport.height, deviceScaleFactor: 1, mobile: false });
}

/* 过腾讯云测试域名的「风险提醒」中间页：按钮有 3 秒倒计时，禁用期点击被无声忽略 */
async function passGate() {
  let title = await ev('document.title');
  if (!/风险提醒/.test(String(title))) return { gated: false };
  const t0 = Date.now();
  for (let i = 0; i < 20; i++) {
    const ready = await ev("(()=>{const b=document.querySelector('#submitBtn');return !!(b&&!b.disabled)})()");
    if (ready) break;
    await sleep(600);
  }
  const rect = await ev("JSON.stringify((()=>{const b=document.querySelector('#submitBtn');if(!b)return null;const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})())");
  if (rect) {
    const { x, y } = JSON.parse(rect);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  for (let i = 0; i < 20; i++) { await sleep(500); title = await ev('document.title'); if (!/风险提醒/.test(String(title))) break; }
  return { gated: true, waitMs: Date.now() - t0, finalTitle: title };
}

/* 等一个条件成立；返回实际等待毫秒数，超时返回 null */
async function waitFor(expr, { timeout = 20000, step = 400 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await ev(expr)) return { ok: true, ms: Date.now() - t0 };
    await sleep(step);
  }
  return { ok: false, ms: Date.now() - t0 };
}

function errorsIn(from) {
  const local = new URL(CFG.staticBase).host;
  const out = [];
  for (const e of evs.slice(from)) {
    if (e.method === 'Runtime.exceptionThrown') {
      out.push({ kind: '运行时异常', text: String(e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || '').split('\n')[0] });
    } else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
      const url = e.params.entry.url || '';
      out.push({ kind: '控制台错误', url: url.split('/').slice(-1)[0] || '(无url)', text: String(e.params.entry.text || '').slice(0, 120) });
    } else if (e.method === 'Network.loadingFailed' && e.params.type !== 'Ping') {
      // 外部图床失败单独归类，不算本站问题
      out.push({ kind: '请求失败', text: String(e.params.errorText || '') + ' ' + (e.params.requestId || '') });
    }
  }
  // 去重（同一 url+text 只留一条）
  const seen = new Set();
  return out.filter((x) => { const k = (x.kind || '') + '|' + (x.url || '') + '|' + (x.text || ''); if (seen.has(k)) return false; seen.add(k); return true; });
}

const homeExpr = "(()=>{const a=[...document.querySelectorAll('#dish-list .dish-entry')];const st=document.getElementById('data-status');return JSON.stringify({cards:a.length,statusTxt:st?st.textContent.trim():null,source:st?st.getAttribute('data-source'):null,ph:a.filter(b=>b.querySelector('.entry-thumb')&&b.querySelector('.entry-thumb').classList.contains('is-placeholder')).length})})()";

const report = {
  ranAt: new Date().toISOString(),
  target: CFG.staticBase,
  rounds: ROUNDS,
  expectations: { cards: CFG.expectCards, fujian: CFG.expectFujian, search: CFG.searchExpectId },
  gate: null,
  roundList: [],
  verdict: null
};

try {
  await connect();
  const g0 = evs.length;
  await send('Page.navigate', { url: CFG.staticBase + '/' });
  await sleep(2500);
  report.gate = await passGate();
  report.gateErrors = errorsIn(g0);   // 中间页自身产生的 404 单独列出，不计入本轮

  for (let r = 1; r <= ROUNDS; r++) {
    const mark = evs.length;
    const t0 = Date.now();
    const row = { round: r, steps: {}, ok: true, notes: [] };

    // —— 重新加载首页（模拟新访客：带一个唯一查询串，确保是真刷新而不是只换 hash） ——
    // 注意：index.html 里预置了 5 张静态兜底卡（无 JS 也能看），所以「有卡片」不等于「接口数据到手」。
    // 必须等到页脚状态栏 data-source="api"，才说明拿到的是库里那 13 道。
    await send('Page.navigate', { url: CFG.staticBase + '/?day28r=' + r + '#/' });
    await sleep(1200);
    let w = await waitFor("(()=>{const s=document.getElementById('data-status');return !!(s&&s.getAttribute('data-source')==='api')})()", { timeout: 25000 });
    await sleep(500);
    const inputVal = await ev("(document.getElementById('search-input')||{}).value || ''");
    let home = await ev(homeExpr);
    home = home ? JSON.parse(home) : null;
    row.steps.home = {
      ok: w.ok && home && home.cards === CFG.expectCards && inputVal === '',
      waitMs: w.ms,
      cards: home ? home.cards : null,
      placeholders: home ? home.ph : null,
      dataSource: home ? home.source : null,
      statusText: home ? home.statusTxt : null,
      searchInput: inputVal
    };
    if (!row.steps.home.ok) { row.ok = false; row.notes.push('首页卡片数不是 ' + CFG.expectCards + '（拿到 ' + (home ? home.cards : 'null') + '，搜索框残留「' + inputVal + '」）'); }

    // —— 搜索「螺蛳粉」→ 应直接进详情 ——
    const s0 = Date.now();
    // 同样先打哨兵：上一轮停在卡片页时，#card-name-zh 里本来就有「螺蛳粉」，
    // 不清掉的话"卡名已经是螺蛳粉"会被上一轮满足，等于没等新渲染。
    await ev("(()=>{const n=document.getElementById('card-name-zh');if(n)n.textContent='__pending__';return true})()");
    await ev(`(()=>{const i=document.getElementById('search-input');i.value='${CFG.searchKeyword}';i.dispatchEvent(new Event('input',{bubbles:true}));const f=document.getElementById('search-form');if(f.requestSubmit){f.requestSubmit();}else{f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}return true})()`);
    // 先等路由，再等详情真的填进来（上一版只等路由，读到的是模板里的占位「菜名」）
    w = await waitFor(`location.hash.indexOf('#/dish/')===0`, { timeout: 15000 });
    const wName = await waitFor(`(()=>{const t=(document.getElementById('card-name-zh')||{}).textContent||'';return t.indexOf('${CFG.searchKeyword}')>=0})()`, { timeout: 15000 });
    const searchHash = await ev('location.hash');
    const searchName = await ev("(document.getElementById('card-name-zh')||{}).textContent||''");
    row.steps.search = {
      ok: w.ok && wName.ok && String(searchHash).includes(CFG.searchExpectId),
      ms: Date.now() - s0,
      hash: searchHash,
      cardName: String(searchName).trim()
    };
    if (!row.steps.search.ok) { row.ok = false; row.notes.push('搜索没进到 ' + CFG.searchExpectId + '（hash=' + searchHash + '，卡名=' + row.steps.search.cardName + '）'); }

    // —— 回首页 → 清空搜索框 → 地区筛选「福建」 ——
    // 为什么先清空：Day 12 的设计是「关键词 + 地区」取交集，搜索词留着再点地区就是 0 道
    // （空态会说明原因，不算 bug —— 这条单独用 probeB 测，见脚本末尾）。
    // 这里模拟的是试用卡四步各自从首页出发的干净流程。
    const f0 = Date.now();
    await ev("document.getElementById('back-btn').click(); true");
    await waitFor("location.hash==='#/' || location.hash===''", { timeout: 10000 });
    await waitFor("document.querySelectorAll('#dish-list .dish-entry').length>0", { timeout: 15000 });
    await ev("(()=>{const i=document.getElementById('search-input');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
    const clicked = await ev(`(()=>{const b=[...document.querySelectorAll('#region-filter .filter-btn')].find(x=>x.getAttribute('data-region')==='${CFG.filterBtnRegion}');if(!b)return false;b.click();return true})()`);
    w = await waitFor(`location.hash==='${CFG.filterHash}'`, { timeout: 15000 });
    await sleep(900);
    const fujianCards = await ev("document.querySelectorAll('#dish-list .dish-entry').length");
    const fujianTitle = await ev("(document.getElementById('list-title')||{}).textContent||''");
    row.steps.filter = {
      ok: !!clicked && w.ok && fujianCards === CFG.expectFujian,
      ms: Date.now() - f0,
      clicked,
      hash: await ev('location.hash'),
      cards: fujianCards,
      title: String(fujianTitle).trim()
    };
    if (!row.steps.filter.ok) { row.ok = false; row.notes.push('福建筛选不对（clicked=' + clicked + '，hash=' + row.steps.filter.hash + '，卡片=' + fujianCards + '）'); }

    // —— 点开第一张卡 → 滑到底 ——
    // 关键：先把卡片页"清空成哨兵值"，再点。否则等条件会被上一轮残留的 DOM 立刻满足，
    // 读到的其实是上一道菜的数字（这正是第一版脚本假绿的原因）。
    const d0 = Date.now();
    const clickId = await ev("document.querySelector('#dish-list .dish-entry').getAttribute('data-id')");
    await ev("(()=>{document.getElementById('card-name-zh').textContent='__pending__';document.getElementById('fact-list').innerHTML='';document.getElementById('source-list').innerHTML='';document.getElementById('block-story').textContent='';window.scrollTo(0,0);return true})()");
    await ev("document.querySelector('#dish-list .dish-entry').click(); true");
    w = await waitFor("document.getElementById('card-view') && document.getElementById('card-view').hidden===false", { timeout: 20000 });
    const wHash = await waitFor(`location.hash==='#/dish/${clickId}'`, { timeout: 15000 });
    const wNameCard = await waitFor("(()=>{const t=(document.getElementById('card-name-zh')||{}).textContent||'';return t.length>0 && t!=='__pending__' && t!=='菜名'})()", { timeout: 20000 });
    const wFacts = await waitFor("document.querySelectorAll('#fact-list li').length>0", { timeout: 15000 });
    const detail = await ev(`JSON.stringify({
      nameZh: (document.getElementById('card-name-zh')||{}).textContent||'',
      originLen: (document.getElementById('block-origin')||{textContent:''}).textContent.length,
      storyLen: (document.getElementById('block-story')||{textContent:''}).textContent.length,
      techLen: (document.getElementById('block-technique')||{textContent:''}).textContent.length,
      facts: document.querySelectorAll('#fact-list li').length,
      sources: document.querySelectorAll('#source-list li').length,
      imgNW: (document.getElementById('card-image')||{naturalWidth:0}).naturalWidth,
      imgPlaceholder: (document.getElementById('card-image')||{classList:{contains:()=>false}}).classList.contains('is-placeholder')
    })`);
    const d = detail ? JSON.parse(detail) : {};
    // 滑到底：真滚一遍，再量还剩多少可滚
    await ev("window.scrollTo(0, document.documentElement.scrollHeight); true");
    await sleep(700);
    const bottom = await ev("JSON.stringify({remain: document.documentElement.scrollHeight - window.scrollY - window.innerHeight, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, toTopVisible: !document.getElementById('to-top').hidden})");
    const b = bottom ? JSON.parse(bottom) : {};
    row.steps.detail = {
      ok: !!w.ok && wHash.ok && wNameCard.ok && wFacts.ok && d.storyLen > 0 && d.facts > 0 && d.sources > 0,
      ms: Date.now() - d0,
      clickedId: clickId,
      hash: await ev('location.hash'),
      nameZh: String(d.nameZh || '').trim(),
      originLen: d.originLen, storyLen: d.storyLen, techLen: d.techLen,
      facts: d.facts, sources: d.sources,
      imgNaturalWidth: d.imgNW, imgPlaceholder: d.imgPlaceholder,
      scrollRemainAtBottom: b.remain, overflowX: b.overflowX
    };
    if (!row.steps.detail.ok) { row.ok = false; row.notes.push('详情页没换到 ' + clickId + '（正文/事实/出处有一项为空，或卡名没刷新）'); }

    row.roundMs = Date.now() - t0;
    row.consoleErrors = errorsIn(mark);
    if (row.consoleErrors.length) { row.ok = false; row.notes.push('本轮有控制台/请求错误 ' + row.consoleErrors.length + ' 条'); }
    report.roundList.push(row);
  }

  /* =========================================================
     probeB：搜索词没清空就直接点地区（"组合条件"这条路）
     这一条**不算主流程**，但真人很可能这么点，所以单独测一次、留证据：
     期望看到「说清是哪两个条件叠加」的空态 + 一个能走出去的按钮。
     ========================================================= */
  {
    const pb = { name: 'search-then-region', steps: {} };
    await send('Page.navigate', { url: CFG.staticBase + '/?probeB=1#/' });
    await sleep(1200);
    await waitFor("document.querySelectorAll('#dish-list .dish-entry').length>0", { timeout: 20000 });
    await ev(`(()=>{const i=document.getElementById('search-input');i.value='${CFG.searchKeyword}';i.dispatchEvent(new Event('input',{bubbles:true}));const f=document.getElementById('search-form');f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return true})()`);
    await waitFor(`location.hash.indexOf('#/dish/')===0`, { timeout: 15000 });
    await waitFor(`(()=>{const t=(document.getElementById('card-name-zh')||{}).textContent||'';return t.indexOf('${CFG.searchKeyword}')>=0})()`, { timeout: 15000 });
    pb.steps.search = { hash: await ev('location.hash'), name: String(await ev("(document.getElementById('card-name-zh')||{}).textContent||''")).trim() };

    await ev("document.getElementById('back-btn').click(); true");
    await waitFor("location.hash==='#/' || location.hash===''", { timeout: 10000 });
    await sleep(600);
    // 关键：这里**故意不清空**搜索框
    pb.steps.inputStillFilled = await ev("(document.getElementById('search-input')||{}).value || ''");
    await ev(`(()=>{const b=[...document.querySelectorAll('#region-filter .filter-btn')].find(x=>x.getAttribute('data-region')==='${CFG.filterBtnRegion}');if(b)b.click();return !!b})()`);
    await waitFor(`location.hash==='${CFG.filterHash}'`, { timeout: 15000 });
    await sleep(900);

    const empty = await ev(`JSON.stringify({
      cards: document.querySelectorAll('#dish-list .dish-entry').length,
      emptyVisible: !document.getElementById('state-empty').hidden,
      emptyTitle: (document.getElementById('state-empty-title')||{}).textContent||'',
      emptyText: (document.getElementById('state-empty-text')||{}).textContent||'',
      allBtnVisible: !document.getElementById('state-empty-all-btn').hidden,
      hint: (document.getElementById('search-hint')||{}).textContent||''
    })`);
    pb.steps.afterRegionClick = empty ? JSON.parse(empty) : null;
    pb.explainsBothConditions = !!pb.steps.afterRegionClick &&
      new RegExp('「' + CFG.filterBtnRegion + '」里没有匹配').test(pb.steps.afterRegionClick.emptyText);
    pb.recoverable = !!(pb.steps.afterRegionClick && pb.steps.afterRegionClick.allBtnVisible);

    if (pb.recoverable) {
      await ev("document.getElementById('state-empty-all-btn').click(); true");
      await waitFor("document.querySelectorAll('#dish-list .dish-entry').length>0", { timeout: 15000 });
      await sleep(600);
      pb.steps.afterSeeAllBtn = {
        hash: await ev('location.hash'),
        cards: await ev("document.querySelectorAll('#dish-list .dish-entry').length")
      };
    }
    report.probeB = pb;
  }

  // —— 汇总：数字一不一致 ——
  const sum = (pick) => report.roundList.map(pick);
  report.summary = {
    homeCards: sum((r) => r.steps.home.cards),
    homeWaitMs: sum((r) => r.steps.home.waitMs),
    searchMs: sum((r) => r.steps.search.ms),
    filterCards: sum((r) => r.steps.filter.cards),
    filterMs: sum((r) => r.steps.filter.ms),
    facts: sum((r) => r.steps.detail.facts),
    sources: sum((r) => r.steps.detail.sources),
    storyLen: sum((r) => r.steps.detail.storyLen),
    roundMs: sum((r) => r.roundMs),
    consoleErrors: report.roundList.reduce((n, r) => n + r.consoleErrors.length, 0)
  };
  const uniq = (a) => [...new Set(a.map((x) => JSON.stringify(x)))].length;
  report.verdict = {
    allRoundsOk: report.roundList.every((r) => r.ok),
    identicalHomeCards: uniq(report.summary.homeCards) === 1,
    identicalFacts: uniq(report.summary.facts) === 1,
    identicalSources: uniq(report.summary.sources) === 1,
    totalConsoleErrors: report.summary.consoleErrors,
    slowestRoundMs: Math.max(...report.summary.roundMs),
    fastestRoundMs: Math.min(...report.summary.roundMs)
  };
  report.ok = report.verdict.allRoundsOk && report.verdict.totalConsoleErrors === 0;
} catch (e) {
  report.ok = false;
  report.fatal = String(e && e.message ? e.message : e);
} finally {
  try { ws && ws.close(); } catch { /* ignore */ }
  kill();
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
