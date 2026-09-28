/* =========================================================
   筛选交互自检 · 执行脚本
   配套：skills/filter-interaction-check/SKILL.md 的六条判据

   用法：node check-filter.js
   前置：① 本地服务器 http://127.0.0.1:8000 已起
         ② 无头 Edge 带 --remote-debugging-port=9333 已起（见 SKILL.md 前置条件）

   产物：终端里的逐条判定（实测值）+ screenshots/ 下的截图
   ========================================================= */

'use strict';

const fs   = require('fs');
const path = require('path');

const CDP_PORT = 9333;
const SITE     = 'http://localhost:8000/';
const SHOT_DIR = path.join(__dirname, '..', 'screenshots');

const rows = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function record(no, name, pass, measured) {
  rows.push({ no, name, pass: !!pass, measured });
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  // ---- 连页面：调试端口上常混进 Edge 自己的弹窗页，必须按网址精确挑 ----
  let list;
  try {
    list = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/list')).json();
  } catch (e) {
    console.log('连不上调试端口 ' + CDP_PORT + '。请先按 SKILL.md 的前置条件起无头 Edge。');
    process.exit(1);
  }

  const page = list.find((t) => t.type === 'page' && (t.url || '').indexOf('localhost:8000') === 0)
            || list.find((t) => t.type === 'page' && (t.url || '').indexOf('edge://') !== 0);
  if (!page) {
    console.log('调试端口上找不到可用页面，请重启无头 Edge。');
    process.exit(1);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error('WebSocket 连不上'));
  });

  let seq = 0;
  const pending = new Map();
  const jsErrors = [];

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) { p.reject(new Error(JSON.stringify(msg.error))); } else { p.resolve(msg.result); }
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') { jsErrors.push('console.error'); }
    if (msg.method === 'Runtime.exceptionThrown') { jsErrors.push('pageerror'); }
  };

  const send = (method, params) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression: expression, returnByValue: true, awaitPromise: true, userGesture: true
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error((d.exception && d.exception.description) || d.text);
    }
    return r.result.value;
  };

  const shoot = async (file) => {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(SHOT_DIR, file), Buffer.from(r.data, 'base64'));
  };

  // 视口固定 1080：无头浏览器默认窗口更窄，会把布局结论带偏
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1080, height: 720, deviceScaleFactor: 1, mobile: false
  });

  await send('Page.navigate', { url: SITE + '?_=' + Date.now() });
  await wait(2500);

  // ---- 页面内的操作与取数 ----
  const clickFilter = (region) => evaluate(`(function () {
    var b = document.querySelector('.filter-btn[data-region="${region}"]');
    if (!b) { return 'NO_BTN'; }
    b.click();
    return 'OK';
  })()`);

  const submitSearch = (q) => evaluate(`(function () {
    document.getElementById('search-input').value = ${JSON.stringify(q)};
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    return 'OK';
  })()`);

  const SNAPSHOT = `JSON.stringify((function () {
    var vis = function (el) { return !!el && el.getClientRects().length > 0; };
    var items = Array.prototype.slice.call(document.querySelectorAll('#dish-list .dish-entry'));
    return {
      count: items.length,
      ids: items.map(function (i) { return i.getAttribute('data-id'); }),
      listVisible: vis(document.getElementById('dish-list')),
      emptyVisible: vis(document.getElementById('state-empty')),
      emptyText: (document.getElementById('state-empty-text') || {}).textContent || '',
      hintText: (document.getElementById('search-hint') || {}).textContent || '',
      hintVisible: vis(document.getElementById('search-hint')),
      inputValue: document.getElementById('search-input').value,
      pressed: Array.prototype.slice.call(document.querySelectorAll('.filter-btn'))
                 .filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })
                 .map(function (b) { return b.getAttribute('data-region'); }),
      cardVisible: vis(document.getElementById('card-view')),
      cardName: (document.getElementById('card-name-zh') || {}).textContent || ''
    };
  })())`;

  const snapshot = async () => JSON.parse(await evaluate(SNAPSHOT));

  // ================= 走一遍三条路径 =================

  const sStart = await snapshot();

  await clickFilter('广西');
  await wait(200);
  const sGuangxi = await snapshot();
  await shoot('01-filter-guangxi.png');

  await clickFilter('all');
  await wait(180);
  await submitSearch('兰州');
  await wait(450);
  const sLanzhou = await snapshot();          // 无筛选 + 恰好一道 → 会走快捷路径进详情

  await evaluate(`document.getElementById('back-btn').click()`);
  await wait(300);
  await clickFilter('广西');
  await wait(180);
  await submitSearch('兰州');
  await wait(350);
  const sBoth = await snapshot();
  await shoot('02-filter-empty.png');

  // ---- 选中态样式 & 对比度（趁「广西」还选中着量）----
  const btnProbe = JSON.parse(await evaluate(`JSON.stringify((function () {
    var b = document.querySelector('.filter-btn[data-region="广西"]');
    var cs = getComputedStyle(b);
    var lum = function (c) {
      var v = c.match(/[\\d.]+/g).slice(0, 3).map(Number).map(function (x) {
        var s = x / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    var a = lum(cs.color), b2 = lum(cs.backgroundColor);
    return {
      pressed: b.getAttribute('aria-pressed'),
      weight: cs.fontWeight,
      shadow: cs.boxShadow,
      fg: cs.color,
      bg: cs.backgroundColor,
      ratio: Math.round(((Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05)) * 100) / 100
    };
  })())`));

  // ---- 空态一键恢复 ----
  await evaluate(`document.getElementById('state-empty-all-btn').click()`);
  await wait(300);
  const sReset = await snapshot();

  // ---- 组名与键盘 ----
  const groupInfo = JSON.parse(await evaluate(`JSON.stringify((function () {
    var g = document.getElementById('region-filter');
    return { role: g.getAttribute('role') || '', label: g.getAttribute('aria-label') || '' };
  })())`));

  await evaluate(`document.getElementById('search-input').blur();`);
  let kbReached = false;
  let kbOutline = 'n/a';
  for (let i = 0; i < 14 && !kbReached; i++) {
    await send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9
    });
    await wait(70);
    const o = JSON.parse(await evaluate(`JSON.stringify((function () {
      var a = document.activeElement;
      if (!a) { return {}; }
      var cs = getComputedStyle(a);
      return { region: a.getAttribute ? a.getAttribute('data-region') : null, outline: cs.outlineWidth };
    })())`));
    if (o.region) { kbReached = true; kbOutline = o.outline; }
  }

  // ---- 工程卫生 ----
  const geom = JSON.parse(await evaluate(
    `JSON.stringify({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })`));

  const vers = JSON.parse(await evaluate(`JSON.stringify((function () {
    var out = {};
    var link = document.querySelector('link[rel="stylesheet"]');
    if (link) {
      var m = link.getAttribute('href').match(/\\?v=([^&]+)/);
      out['style.css'] = m ? m[1] : '(无)';
    }
    Array.prototype.forEach.call(document.querySelectorAll('script[src]'), function (s) {
      var src = s.getAttribute('src');
      var name = src.split('/').pop().split('?')[0];
      var m = src.match(/\\?v=([^&]+)/);
      out[name] = m ? m[1] : '(无)';
    });
    return out;
  })())`));

  // ================= 按 SKILL.md 的顺序断言 =================

  record('①a', '有结果（点「广西」）',
    sGuangxi.count === 1 && sGuangxi.ids[0] === 'luosifen' && sGuangxi.listVisible,
    '列表 ' + sGuangxi.count + ' 条，id=' + sGuangxi.ids.join(',') + '，列表可见=' + sGuangxi.listVisible);

  record('①b', '无结果（筛选+关键词叠加）',
    sBoth.emptyVisible && !sBoth.listVisible && sBoth.emptyText.indexOf('广西') >= 0 && sBoth.emptyText.indexOf('兰州') >= 0,
    '列表 ' + sBoth.count + ' 条，空态可见=' + sBoth.emptyVisible + '，文案含两个条件=' +
    (sBoth.emptyText.indexOf('广西') >= 0 && sBoth.emptyText.indexOf('兰州') >= 0));

  record('①c', '清空恢复（点空态的恢复按钮）',
    sReset.count === 5 && sReset.inputValue === '' && sReset.pressed.join(',') === 'all',
    '列表 ' + sReset.count + ' 条；搜索框="' + sReset.inputValue + '"；选中=' + sReset.pressed.join(','));

  record('②a', '选中态不只有颜色（加粗 + 底边实线）',
    btnProbe.pressed === 'true' && Number(btnProbe.weight) >= 500 && btnProbe.shadow.indexOf('inset') >= 0,
    'aria-pressed=' + btnProbe.pressed + '；font-weight=' + btnProbe.weight +
    '；box-shadow 含 inset=' + (btnProbe.shadow.indexOf('inset') >= 0));

  record('②b', '三种状态各有可感知反馈',
    sGuangxi.hintVisible && sGuangxi.hintText.length > 0 && sBoth.emptyVisible && sReset.hintVisible === false,
    '有结果：提示条「' + sGuangxi.hintText.slice(0, 30) + '」；无结果：空态 ' + sBoth.emptyText.length + ' 字');

  record('③a', '单独搜关键词命中 1 道（无筛选走快捷路径）',
    sLanzhou.cardVisible && sLanzhou.cardName.indexOf('兰州') === 0,
    '直接进详情：' + sLanzhou.cardName);

  record('③b', '筛选 + 关键词取交集（不是并集）',
    sBoth.count === 0,
    '广西(1 道) + 兰州(1 道) 叠加 = ' + sBoth.count + ' 条' +
    (sBoth.count === 2 ? '  ← 这就是并集 bug' : ''));

  record('④', '空态一键恢复：筛选 / 搜索 / 列表三处都复位',
    sReset.count === 5 && sReset.inputValue === '' && sReset.pressed.length === 1 && sReset.pressed[0] === 'all',
    '列表 ' + sReset.count + ' 条；搜索框="' + sReset.inputValue + '"；选中=' + sReset.pressed.join(','));

  record('⑤a', '选中态文字对比度 ≥ 4.5:1',
    btnProbe.ratio >= 4.5,
    btnProbe.fg + ' on ' + btnProbe.bg + ' = ' + btnProbe.ratio + ':1');

  record('⑤b', '筛选组有可读组名',
    groupInfo.role === 'group' && groupInfo.label.length > 0,
    'role=' + groupInfo.role + '，aria-label="' + groupInfo.label + '"');

  record('⑤c', '筛选按钮键盘可达 + 焦点可见',
    kbReached && parseFloat(kbOutline) >= 2,
    kbReached ? ('Tab 能走到，outline-width=' + kbOutline) : 'Tab 按了 14 次也没到筛选按钮');

  record('⑥a', '横向不溢出', geom.sw <= geom.iw,
    'scrollWidth=' + geom.sw + ' <= innerWidth=' + geom.iw);

  record('⑥b', '全程无 JS 报错', jsErrors.length === 0,
    jsErrors.length === 0 ? '0 条' : jsErrors.join(' / '));

  const verVals = Object.keys(vers).map((k) => vers[k]);
  const verSame = verVals.length === 3 && verVals.every((v) => v === verVals[0]);
  record('⑥c', '三处版本号同步', verSame,
    Object.keys(vers).map((k) => k + '=' + vers[k]).join('  '));

  // ================= 打印报告 =================
  console.log('');
  console.log('===== 筛选交互自检 · ' + new Date().toLocaleString('zh-CN') + ' =====');
  console.log('');
  rows.forEach((r) => {
    console.log((r.pass ? '[通过] ' : '[不过] ') + r.no + ' ' + r.name);
    console.log('        实测：' + r.measured);
  });

  const failed = rows.filter((r) => !r.pass);
  console.log('');
  console.log('===== 汇总：' + (rows.length - failed.length) + ' / ' + rows.length + ' 通过 =====');
  if (failed.length) {
    console.log('未通过项：');
    failed.forEach((r) => console.log('  - ' + r.no + ' ' + r.name + '：' + r.measured));
  }
  console.log('');
  console.log('截图：screenshots/01-filter-guangxi.png 、 screenshots/02-filter-empty.png');
  console.log('起始状态：列表 ' + sStart.count + ' 条，选中=' + sStart.pressed.join(','));

  ws.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.log('脚本出错：' + e.message);
  process.exit(1);
});
