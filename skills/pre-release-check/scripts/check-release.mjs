#!/usr/bin/env node
/* =========================================================
   寻味 / Xunwei —— 发布前检查（Day 25 建）
   跑法：node skills/pre-release-check/scripts/check-release.mjs [--browser] [--out <目录>]

   它在干什么：把「发布之前必须确认的事」逐条量出来，给四级结论：
     FAIL  违反判据 —— 发布这件事现在不能做
     WARN  不阻断发布，但该看一眼（例如线上落后于本地）
     PASS  实测达标
     SKIP  这条没查（网络不通 / 缺依赖）—— **不算通过，单独计数**

   最后一行汇总，退出码：有 FAIL → 1，否则 0。
   它会写一份 HTML 报告（默认同目录 report.html，可用 --out 换位置）。
   ========================================================= */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(HERE, '..', 'check.config.json');
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const ROOT = path.resolve(HERE, '..', CONFIG.root);
const NODE = CONFIG.browser.nodePath || process.execPath;
const PYTHON = CONFIG.browser.pythonPath || 'python';

/* ---------- 参数 ---------- */
const ARGV = process.argv.slice(2);
const OPT = {
  browser: ARGV.includes('--browser') || CONFIG.browser.enabled === true,
  skipLive: ARGV.includes('--skip-live'),
  out: (() => {
    const i = ARGV.indexOf('--out');
    return i >= 0 && ARGV[i + 1] ? path.resolve(ARGV[i + 1]) : path.join(HERE, '..');
  })(),
  noHtml: ARGV.includes('--no-html')
};

/* ---------- 结果收集 ---------- */
const results = [];
function add(id, title, level, status, detail) {
  results.push({ id, title, level, status, detail });
}
/** 包一层：检查函数自己抛错时，绝不记成通过 —— 记 SKIP 并写明原因 */
async function step(id, title, level, fn) {
  try {
    const r = await fn();
    add(id, title, level, r.status, r.detail);
  } catch (e) {
    add(id, title, level, 'skip', '检查过程本身出错（未判定）：' + (e && e.message ? e.message : String(e)));
  }
}

/* ---------- 小工具 ---------- */
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const exists = (p) => fs.existsSync(p);

function run(cmd, args, opts = {}) {
  try {
    const out = execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    return { ok: true, out: out || '' };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || ''), code: e.status, err: e };
  }
}

function walk(dir, filter, acc = [], ignore = new Set(['.git', 'node_modules'])) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (ignore.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, filter, acc, ignore);
    else if (filter(full)) acc.push(full);
  }
  return acc;
}

async function fetchText(url, ms = 20000) {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms), redirect: 'follow' });
  const body = await r.text();
  return { status: r.status, body };
}

const isNetworkError = (e) =>
  /fetch failed|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|aborted|TimeoutError|certificate/i.test(
    (e && (e.message || e.cause?.message)) || ''
  );

/* =========================================================
   1. 仓库卫生
   ========================================================= */
await step('git-clean', '工作区无未提交改动', 'warn', () => {
  const r = run('git', ['status', '--porcelain']);
  if (!r.ok) return { status: 'skip', detail: 'git 不可用：' + r.code };
  const lines = r.out.split('\n').filter(Boolean);
  if (!lines.length) return { status: 'pass', detail: '工作区干净（0 个改动）' };
  return {
    status: 'warn',
    detail: lines.length + ' 个未提交改动（发布前应清空）：' + lines.slice(0, 4).map((l) => l.trim()).join(' / ')
  };
});

await step('git-sync', '本地与远端一致', 'fail', () => {
  const head = run('git', ['rev-parse', 'HEAD']);
  if (!head.ok) return { status: 'skip', detail: 'git 不可用' };
  const remote = run('git', ['ls-remote', 'origin', 'main'], { timeout: 60000 });
  if (!remote.ok) return { status: 'skip', detail: '取不到远端（网络问题，未判定）：' + (remote.out || '').split('\n')[0] };
  const rsha = (remote.out.trim().split(/\s+/)[0] || '');
  const lsha = head.out.trim();
  if (!rsha) return { status: 'skip', detail: '远端没返回 main 的 SHA' };
  return rsha === lsha
    ? { status: 'pass', detail: '本地 = 远端 = ' + lsha.slice(0, 7) }
    : { status: 'fail', detail: '本地 ' + lsha.slice(0, 7) + ' ≠ 远端 ' + rsha.slice(0, 7) + '（有提交没推）' };
});

await step('env-ignored', '敏感文件被忽略且未被跟踪', 'fail', () => {
  const ls = run('git', ['ls-files']);
  if (!ls.ok) return { status: 'skip', detail: 'git 不可用' };
  const tracked = new Set(ls.out.split('\n').map((s) => s.trim()));
  const mustIgnore = ['.env', '.env.local', 'tests/admin-token.txt'];
  const leaked = mustIgnore.filter((f) => tracked.has(f));
  const gi = exists(path.join(ROOT, '.gitignore')) ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8') : '';
  const notIgnored = mustIgnore.filter((f) => gi.indexOf(f.split('/').pop()) === -1);
  if (leaked.length) return { status: 'fail', detail: '这些敏感文件已被 git 跟踪：' + leaked.join(', ') };
  if (notIgnored.length) return { status: 'fail', detail: '.gitignore 里缺规则：' + notIgnored.join(', ') };
  return { status: 'pass', detail: '3 个敏感文件均被忽略、均未被跟踪' };
});

/* =========================================================
   2. 密钥与敏感信息
   ========================================================= */
await step('secret-scan', '已跟踪文件里没有真密钥', 'fail', () => {
  const ls = run('git', ['ls-files']);
  if (!ls.ok) return { status: 'skip', detail: 'git 不可用' };
  const allow = new Set(CONFIG.secrets.allowFiles || []);
  const minLen = CONFIG.secrets.minValueLength || 16;
  const patterns = [
    ['OpenAI 风格密钥', /sk-[A-Za-z0-9]{16,}/],
    ['腾讯云 SecretId', /AKID[A-Za-z0-9]{16,}/],
    ['私钥块', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
    ['Admin Token 实值', /X-Admin-Token["'\s:]+[A-Za-z0-9_-]{16,}/i],
    ['超长 Bearer', /Bearer\s+[A-Za-z0-9._-]{24,}/],
    ['带口令的连接串', /(postgres|postgresql|mysql|mongodb(\+srv)?):\/\/[^\s'"@]+:[^\s'"@]+@/i],
    ['硬编码密钥赋值', new RegExp('(api[_-]?key|secret|token|password|passwd)\\s*[:=]\\s*[\'"][A-Za-z0-9_\\-]{' + minLen + ',}[\'"]', 'i')]
  ];
  // 这些值是无害的占位/变量引用，命中不算问题
  const benign = /process\.env|YOUR_|CHANGE_?ME|REPLACE_|example|placeholder|<[^>]*>|xxxx|\*\*\*/i;
  const hits = [];
  for (const f of ls.out.split('\n').map((s) => s.trim()).filter(Boolean)) {
    if (allow.has(f)) continue;
    const abs = path.join(ROOT, f);
    let buf;
    try { buf = fs.readFileSync(abs); } catch { continue; }
    if (buf.length > 2 * 1024 * 1024) continue;
    if (buf.includes(0)) continue; // 二进制
    const text = buf.toString('utf8');
    text.split('\n').forEach((line, i) => {
      for (const [kind, re] of patterns) {
        const m = line.match(re);
        if (!m) continue;
        if (benign.test(line)) continue;
        const secret = m[0].replace(/\s+/g, ' ');
        const masked = secret.slice(0, 12) + '…（已打码）';
        hits.push(f + ':' + (i + 1) + ' [' + kind + '] ' + masked);
      }
    });
  }
  return hits.length
    ? { status: 'fail', detail: '命中 ' + hits.length + ' 处：' + hits.slice(0, 6).join(' | ') }
    : { status: 'pass', detail: '扫描 ' + ls.out.split('\n').filter(Boolean).length + ' 个已跟踪文件，0 处命中' };
});

/* =========================================================
   3. 工程正确性（离线，随时可跑）
   ========================================================= */
await step('js-syntax', '所有 JS 语法可解析', 'fail', () => {
  const files = walk(ROOT, (f) => f.endsWith('.js') && !/[/\\]deploy[/\\]/.test(f));
  const bad = [];
  for (const f of files) {
    const r = run(NODE, ['--check', f]);
    if (!r.ok) bad.push(rel(f) + ' → ' + (r.out || '').split('\n').filter(Boolean)[0]);
  }
  return bad.length
    ? { status: 'fail', detail: bad.length + ' / ' + files.length + ' 个文件语法错：' + bad.slice(0, 3).join(' | ') }
    : { status: 'pass', detail: files.length + ' 个文件全部通过 node --check' };
});

await step('offline-tests', '离线接口契约测试全过', 'fail', () => {
  const t = CONFIG.tests.offline;
  if (!exists(path.join(ROOT, t))) return { status: 'skip', detail: '找不到测试文件 ' + t };
  const r = run(NODE, [t], { timeout: 180000 });
  const m = r.out.match(/通过\s*(\d+)\s*项[，,]\s*失败\s*(\d+)\s*项/);
  if (!m) return { status: 'fail', detail: '拿不到测试汇总行（输出格式可能变了）：' + (r.out || '').slice(-200) };
  const passed = Number(m[1]);
  const failed = Number(m[2]);
  const min = CONFIG.tests.expectPassedAtLeast || 0;
  if (failed > 0) return { status: 'fail', detail: '失败 ' + failed + ' 项（通过 ' + passed + '）' };
  if (passed < min) return { status: 'warn', detail: '通过 ' + passed + ' 项，少于基线 ' + min + ' 项，是不是有测试被删了？' };
  return { status: 'pass', detail: '通过 ' + passed + ' 项，失败 0 项（基线 ≥' + min + '）' };
});

await step('svg-xml', 'SVG 是合法 XML（Day 24 静默坑）', 'fail', () => {
  const files = walk(ROOT, (f) => f.endsWith('.svg'));
  if (!files.length) return { status: 'skip', detail: '没有 SVG 文件' };
  const probe = [
    'import sys, xml.etree.ElementTree as ET',
    'bad = []',
    'for f in sys.argv[1:]:',
    '    try:',
    '        ET.parse(f)',
    '    except Exception as e:',
    '        bad.append(f + " -> " + str(e))',
    'print("BAD" if bad else "OK")',
    'for b in bad: print(b)'
  ].join('\n');
  const tmp = path.join(os.tmpdir(), 'xunwei-svg-probe.py');
  fs.writeFileSync(tmp, probe, 'utf8');
  const r = run(PYTHON, [tmp, ...files]);
  if (!r.ok && /ENOENT|not found/.test(r.out + (r.err?.message || ''))) {
    return { status: 'skip', detail: '本机没有可用 Python，跳过 XML 校验（共 ' + files.length + ' 个 SVG）' };
  }
  const out = r.out.trim();
  if (out.startsWith('OK')) return { status: 'pass', detail: files.length + ' 个 SVG 全部是合法 XML' };
  const badLines = out.split('\n').filter((l) => l.includes('->'));
  return { status: 'fail', detail: badLines.length + ' 个 SVG 非法：' + badLines.slice(0, 3).join(' | ') };
});

await step('cjk-encoding', '中文文件编码完好（无乱码 / 无 BOM）', 'fail', () => {
  const files = (CONFIG.encoding.files || []).filter((f) => exists(path.join(ROOT, f)));
  if (!files.length) return { status: 'skip', detail: '配置里列的文件都不存在' };
  const fffd = [];
  const bom = [];
  const mojibake = [];
  for (const f of files) {
    const buf = fs.readFileSync(path.join(ROOT, f));
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) bom.push(f);
    const text = buf.toString('utf8');
    if (text.includes('\uFFFD')) { fffd.push(f); continue; }
    if (/Ã[\u0080-\u00bf]|â€|ï¿½|å¤|æ–/.test(text)) mojibake.push(f);
  }
  if (fffd.length) return { status: 'fail', detail: '含替换字符 U+FFFD（文件已损坏）：' + fffd.join(', ') };
  if (mojibake.length) return { status: 'fail', detail: '疑似乱码片段：' + mojibake.join(', ') };
  if (bom.length) return { status: 'warn', detail: '含 BOM（无害但多余）：' + bom.join(', ') };
  return { status: 'pass', detail: files.length + ' 个文件 UTF-8 解码正常、无乱码、无 BOM' };
});

await step('deploy-mirror', 'deploy/ 与源码逐文件一致', 'fail', () => {
  const d = CONFIG.deploy.dir;
  if (!exists(path.join(ROOT, d))) return { status: 'skip', detail: '没有 ' + d + '/ 目录（该项目不走静态上传？）' };
  const list = CONFIG.deploy.mirror || [];
  const missing = [];
  const diff = [];
  for (const f of list) {
    const src = path.join(ROOT, f);
    const dst = path.join(ROOT, d, f);
    if (!exists(src)) { missing.push(rel(src) + '（源码都没有）'); continue; }
    if (!exists(dst)) { missing.push(rel(dst) + '（镜像缺失）'); continue; }
    if (sha(src) !== sha(dst)) diff.push(f);
  }
  // 反向：deploy 里多出来的文件也报出来
  const extra = walk(path.join(ROOT, d), () => true)
    .map((p) => rel(p).slice(d.length + 1))
    .filter((p) => list.indexOf(p) === -1);
  if (missing.length || diff.length) {
    return {
      status: 'fail',
      detail: [diff.length ? '内容不一致：' + diff.join(', ') : '', missing.length ? '缺失：' + missing.join(', ') : '']
        .filter(Boolean).join('；')
    };
  }
  return {
    status: extra.length ? 'warn' : 'pass',
    detail: list.length + ' 个文件哈希全部一致' + (extra.length ? '（deploy 里多出 ' + extra.length + ' 个未列入清单的文件）' : '')
  };
});

await step('version-drift', '改了内容就必须升版本号', 'fail', () => {
  /* 为什么不是「所有 ?v= 必须相同」：本项目四个资源的版本号本来就各不相同，
     而它们各自都与「该文件最后一次改动」对得上（css/app.js 是 Day 24、data-source 是 Day 20、
     router 是 Day 13）。按「必须相同」判会把正常状态判成 FAIL —— 那是判据自己在虚报。
     真该防的是：**内容改了、版本号没跟着升** → 用户会拿到旧缓存。
     做法：脚本自己记基线（文件 SHA256 + 当时的版本号），下次跑时比对。 */
  const idx = path.join(ROOT, CONFIG.site.indexFile);
  if (!exists(idx)) return { status: 'skip', detail: '找不到 ' + CONFIG.site.indexFile };
  const html = fs.readFileSync(idx, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"?]+)\?v=([A-Za-z0-9._-]+)"/g)].map((m) => ({ file: m[1], v: m[2] }));
  const noParam = [...new Set([...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))"/g)].map((m) => m[1]))];
  const statePath = path.join(HERE, '..', 'state', 'version-baseline.json');
  let prev = {};
  if (exists(statePath)) {
    try { prev = JSON.parse(fs.readFileSync(statePath, 'utf8')).files || {}; } catch { prev = {}; }
  }
  const cur = {};
  const drift = [];
  let freshCount = 0;
  for (const { file, v } of refs) {
    const abs = path.join(ROOT, file);
    if (!exists(abs)) continue; // 文件不存在由 asset-refs 负责报
    const h = sha(abs);
    const p = prev[file];
    if (!p) { cur[file] = { hash: h, version: v }; freshCount++; continue; }
    if (p.hash === h) { cur[file] = { hash: h, version: v }; continue; }        // 内容没变 → 刷新记录
    if (p.version !== v) { cur[file] = { hash: h, version: v }; continue; }     // 内容 + 版本号一起变 = 正常升版
    // 内容变了、版本号没变 → 保留旧基线，让这个问题一直报，直到修好（改回内容 或 升版本号）
    cur[file] = p;
    drift.push(file + '（内容变了，版本号仍是 ' + v + '）');
  }
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ updatedAt: new Date().toISOString(), files: cur }, null, 2) + '\n', 'utf8');

  if (drift.length) {
    return { status: 'fail', detail: '内容改了但版本号没升，用户会拿到旧缓存：' + drift.join(', ') };
  }
  if (noParam.length) return { status: 'warn', detail: '这些本地资源没带 ?v=，改完可能被缓存：' + noParam.join(', ') };
  const vs = [...new Set(refs.map((r) => r.v))];
  return {
    status: 'pass',
    detail: refs.length + ' 个资源均有版本号' + (freshCount ? '（首次记录基线 ' + freshCount + ' 个）' : '') +
      '，无「改了没升版」；当前值 ' + vs.join(' / ')
  };
});

await step('asset-refs', '页面引用的本地资源都真实存在', 'fail', () => {
  const required = CONFIG.assets.required || [];
  const missing = required.filter((f) => !exists(path.join(ROOT, f)));
  // 顺带扫 index.html 里的本地引用
  const idx = path.join(ROOT, CONFIG.site.indexFile);
  const broken = [];
  if (exists(idx)) {
    const html = fs.readFileSync(idx, 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((u) => !/^(https?:|data:|#|mailto:)/.test(u));
    for (const u of new Set(refs)) {
      const p = path.join(ROOT, u.split('?')[0]);
      if (!exists(p)) broken.push(u);
    }
  }
  if (missing.length || broken.length) {
    return { status: 'fail', detail: [missing.length ? '必备文件缺失：' + missing.join(', ') : '', broken.length ? '页面引用 404：' + broken.join(', ') : ''].filter(Boolean).join('；') };
  }
  return { status: 'pass', detail: required.length + ' 个必备文件齐全，页面本地引用 0 处 404' };
});

await step('docs-claims', '文档声称的数量与数据一致', 'warn', () => {
  const rd = path.join(ROOT, CONFIG.docs.readme);
  const df = path.join(ROOT, CONFIG.docs.dishCountFile);
  if (!exists(rd) || !exists(df)) return { status: 'skip', detail: 'README 或数据文件不存在' };
  const readme = fs.readFileSync(rd, 'utf8');
  let real = 0;
  try {
    const j = JSON.parse(fs.readFileSync(df, 'utf8'));
    real = Array.isArray(j) ? j.length : (j.dishes || j.items || []).length;
  } catch (e) { return { status: 'skip', detail: '数据文件读不出来：' + e.message }; }
  const m = readme.match(/收录\s*(\d+)\s*道/);
  const claimed = m ? Number(m[1]) : null;
  if (claimed === null) return { status: 'skip', detail: 'README 里没写「收录 N 道」，无法比对' };
  return claimed === real
    ? { status: 'pass', detail: 'README 写 ' + claimed + ' 道，数据实际 ' + real + ' 道' }
    : { status: 'warn', detail: 'README 写「收录 ' + claimed + ' 道」，数据实际 ' + real + ' 道（文档过期）' };
});

/* =========================================================
   4. 公网真实状态
   ========================================================= */
const LIVE = { staticOk: null, html: '' };

await step('live-static', '公网静态站可达且是当前版本', 'fail', async () => {
  if (OPT.skipLive) return { status: 'skip', detail: '按 --skip-live 跳过' };
  const base = CONFIG.site.staticBase;
  let r;
  try {
    r = await fetchText(base + '/' + CONFIG.site.indexFile);
  } catch (e) {
    return { status: 'skip', detail: '取不到公网（未判定）：' + (e.cause?.message || e.message) };
  }
  if (r.status !== 200) return { status: 'fail', detail: 'index.html 返回 ' + r.status };
  LIVE.staticOk = true;
  LIVE.html = r.body;
  if (CONFIG.site.pageTitleKeyword && !r.body.includes(CONFIG.site.pageTitleKeyword)) {
    return { status: 'fail', detail: '线上返回的不是本站页面（没找到「' + CONFIG.site.pageTitleKeyword + '」）' };
  }
  const local = path.join(ROOT, CONFIG.deploy.dir, CONFIG.site.indexFile);
  const same = exists(local) && fs.readFileSync(local, 'utf8') === r.body;
  const refs = [...r.body.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !/^(https?:|data:|#|mailto:)/.test(u));
  const bad = [];
  for (const u of new Set(refs)) {
    try {
      const rr = await fetchText(base + '/' + u.split('?')[0]);
      if (rr.status !== 200) bad.push(u + ' → ' + rr.status);
    } catch (e) { bad.push(u + ' → ' + (e.cause?.message || e.message)); }
  }
  if (bad.length) return { status: 'fail', detail: '线上有 ' + bad.length + ' 个资源拿不到：' + bad.slice(0, 4).join(', ') };
  return same
    ? { status: 'pass', detail: 'index.html 200 + ' + refs.length + ' 个引用资源全 200，与 deploy/ 副本字节一致' }
    : { status: 'warn', detail: 'index.html 200、资源全 200，但**与本地 deploy/ 副本不一致**（线上落后，或本地还没传）' };
});

  // 探针 id 必须「格式合法、但库里没有」：格式非法会被接口判 400（那是 400 该管的事），
  // 就不能验到 404 的文案了。下面这个合法格式 id 第一次跑就踩过这个坑。
  const probeId = CONFIG.site.notFoundProbeId || 'no-such-dish-for-check';
  await step('live-api', '公网接口可用且口径正确', 'fail', async () => {
    if (OPT.skipLive) return { status: 'skip', detail: '按 --skip-live 跳过' };
    const api = CONFIG.site.apiBase;
    let list, miss;
    try {
      list = await fetchText(api + '/dishes');
      miss = await fetchText(api + '/dishes/' + probeId);
    } catch (e) {
      return { status: 'skip', detail: '取不到接口（未判定）：' + (e.cause?.message || e.message) };
    }
  if (list.status !== 200) return { status: 'fail', detail: '/api/dishes 返回 ' + list.status };
  let data;
  try { data = JSON.parse(list.body); } catch (e) { return { status: 'fail', detail: '/api/dishes 返回的不是 JSON' }; }
  const items = Array.isArray(data) ? data : (data.data?.items || data.items || (Array.isArray(data.data) ? data.data : null));
  if (!items) return { status: 'fail', detail: '返回结构里找不到菜品数组（契约可能变了）' };
  let localCount = null;
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, CONFIG.docs.dishCountFile), 'utf8'));
    localCount = Array.isArray(j) ? j.length : (j.dishes || []).length;
  } catch { /* 拿不到就不比 */ }
  const countTxt = '接口 ' + items.length + ' 道' + (localCount === null ? '' : '，本地数据 ' + localCount + ' 道');
  const softNotes = [];
  if (localCount !== null && items.length !== localCount) {
    // 本地 JSON 只是「接口不通时的兜底」，条数不必等于库里的（库里是权威）
    softNotes.push('本地兜底数据 ' + localCount + ' 道 ≠ 库里 ' + items.length + ' 道（兜底偏旧，不阻断发布）');
  }
  // 404 文案：Day 23 定的双语文案（中文 + 斜杠 + 英文）
  const m = miss.body.match(/"code"\s*:\s*"([a-z_]+)"[\s\S]*?"message"\s*:\s*"([^"]+)"/);
  if (miss.status !== 404) return { status: 'fail', detail: '不存在的菜应返回 404，实际 ' + miss.status };
  if (!m) return { status: 'fail', detail: '404 响应结构不是 {ok:false,error:{code,message}}' };
  const msg = m[2];
  const bilingual = /[\u4e00-\u9fa5]/.test(msg) && msg.includes('/');
  if (!bilingual) return { status: 'fail', detail: '404 文案不是双语人话：「' + msg + '」（Day 23 的文案可能没部署）' };
  const noisy = /ECONNREFUSED|ETIMEDOUT|undefined|Internal error/i.test(msg);
  if (noisy) return { status: 'fail', detail: '404 文案里漏了技术原文：「' + msg + '」' };
  return {
    status: softNotes.length ? 'warn' : 'pass',
    detail: countTxt + '；404 文案 = 「' + msg + '」' + (softNotes.length ? '；' + softNotes.join('；') : '')
  };
});

await step('live-favicon', '声明的站点图标可达', 'fail', async () => {
  if (OPT.skipLive) return { status: 'skip', detail: '按 --skip-live 跳过' };
  if (!LIVE.html) return { status: 'skip', detail: '上一步没拿到线上 HTML，未判定' };
  const m = LIVE.html.match(/<link[^>]+rel="icon"[^>]*>/i);
  if (!m) return { status: 'fail', detail: '页面没有声明 <link rel="icon">（浏览器会去要 /favicon.ico 得 404）' };
  const href = (m[0].match(/href="([^"]+)"/) || [])[1];
  if (!href) return { status: 'fail', detail: 'icon 标签没有 href' };
  const url = /^https?:/.test(href) ? href : CONFIG.site.staticBase + '/' + href.replace(/^\//, '');
  try {
    const r = await fetchText(url);
    if (r.status !== 200) return { status: 'fail', detail: '图标 ' + href + ' 返回 ' + r.status };
    return { status: 'pass', detail: '声明了 ' + href + '，线上 200（注意：/favicon.ico 404 属正常，不查）' };
  } catch (e) {
    return { status: 'skip', detail: '取不到图标（未判定）：' + (e.cause?.message || e.message) };
  }
});

/* =========================================================
   5. 真实渲染（--browser）
   ========================================================= */
if (!OPT.browser) {
  add('render', '真实渲染（控制台 / 缩略图 / 溢出）', 'fail', 'skip', '没加 --browser，本次不查（记得用 --browser 跑一次）');
} else {
  await step('render', '真实渲染（控制台 / 缩略图 / 溢出）', 'fail', async () => {
    const B = CONFIG.browser;
    if (!exists(B.edgePath)) return { status: 'skip', detail: '找不到浏览器：' + B.edgePath };
    const profile = path.join(os.tmpdir(), 'xunwei-release-check-profile');
    fs.rmSync(profile, { recursive: true, force: true });
    fs.mkdirSync(profile, { recursive: true });
    const child = spawn(
      B.edgePath,
      ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=' + B.debugPort,
        '--user-data-dir=' + profile, '--window-size=' + B.viewport.width + ',' + B.viewport.height, 'about:blank'],
      { stdio: 'ignore', detached: false }
    );
    const kill = () => {
      try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); }
      catch { try { child.kill('SIGKILL'); } catch { /* ignore */ } }
    };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      // 等调试端口
      let ok = false;
      for (let i = 0; i < 40; i++) {
        try { await (await fetch('http://127.0.0.1:' + B.debugPort + '/json/version', { signal: AbortSignal.timeout(1500) })).json(); ok = true; break; }
        catch { await sleep(400); }
      }
      if (!ok) return { status: 'skip', detail: '浏览器调试端口没起来，未判定' };

      const page = (await (await fetch('http://127.0.0.1:' + B.debugPort + '/json/list')).json()).find((t) => t.type === 'page');
      if (!page) return { status: 'skip', detail: '没有页面目标，未判定' };

      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP 连不上')); });
      let id = 0;
      const pend = new Map();
      const evs = [];
      ws.onmessage = (ev) => {
        const raw = typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString('utf8');
        const m = JSON.parse(raw);
        if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
        else if (m.method) evs.push(m);
      };
      const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
      const ev = async (expr) => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
        if (r.result?.exceptionDetails) return undefined;
        return r.result?.result?.value;
      };

      await send('Page.enable');
      await send('Runtime.enable');
      await send('Log.enable');
      await send('Network.enable');
      await send('Network.setCacheDisabled', { cacheDisabled: true });
      await send('Emulation.setDeviceMetricsOverride', { width: B.viewport.width, height: B.viewport.height, deviceScaleFactor: 1, mobile: false });
      await send('Page.navigate', { url: CONFIG.site.staticBase + '/' + CONFIG.site.indexFile });
      await sleep(2500);

      // 腾讯云「风险提醒」中间页：按钮 3 秒倒计时禁用，等激活再点，否则点击被无声忽略。
      // 注意：闸门期本身会产生 404（那一次 Document 404 + 中间页自己的 /favicon.ico 404），
      // 那是腾讯云测试域名的行为，不是本站的毛病 —— 所以只判定「过闸门之后」的加载，
      // 并且把排除掉的那几条明示在报告里，不偷偷吞掉。
      let gateIndex = 0;
      let title = await ev('document.title');
      const preGate = [];
      if (/风险提醒/.test(String(title))) {
        for (let i = 0; i < 15; i++) {
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
        gateIndex = evs.length; // 这一刻之前的日志属于闸门期
      }
      for (const e of evs.slice(0, gateIndex)) {
        if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
          preGate.push((e.params.entry.url || '').split('/').slice(-1)[0] || '(无 url)');
        }
      }

      // 等缩略图有结论
      const thumbSel = B.thumbSelector;
      for (let i = 0; i < 25; i++) {
        const done = await ev(`(()=>{const a=[...document.querySelectorAll('${thumbSel}')];return a.length>0 && a.every(i=>i.complete)})()`);
        if (done) break;
        await sleep(600);
      }
      await sleep(1200);

      const m = await ev(`JSON.stringify({
        thumbs: [...document.querySelectorAll('${thumbSel}')].map(i=>({nw:i.naturalWidth, ph:i.classList.contains('is-placeholder')})),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        cards: document.querySelectorAll('button.dish-entry').length
      })`);
      const info = m ? JSON.parse(m) : { thumbs: [], overflow: 0, cards: 0 };

      // 控制台 / 网络错误：本地资源失败才算自己的问题，外部图床失败单独提示
      const host = new URL(CONFIG.site.staticBase).host;
      const errors = [];
      for (const e of evs.slice(gateIndex)) {
        if (e.method === 'Runtime.exceptionThrown') {
          errors.push({ kind: '运行时异常', text: String(e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || '').split('\n')[0] });
        } else if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
          errors.push({ kind: '脚本报错', text: (e.params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 120) });
        } else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
          const en = e.params.entry;
          errors.push({ kind: '日志错误', text: (en.text || '').slice(0, 200), url: en.url || '' });
        } else if (e.method === 'Network.loadingFailed') {
          errors.push({ kind: '网络失败', text: (e.params.errorText || '') + ' ' + (e.params.type || ''), local: true });
        }
      }
      const localErrs = errors.filter((e) => e.kind !== '网络失败' || /本地资源|Document|Stylesheet|Script|Image/.test(e.text));
      const seen = new Set();
      const uniq = localErrs.filter((e) => { const k = e.kind + '|' + e.text; if (seen.has(k)) return false; seen.add(k); return true; });

      ws.close();
      const thumbTotal = info.thumbs.length;
      const thumbOk = info.thumbs.filter((t) => t.nw > 0).length;

      const problems = [];
      if (info.overflow > 0) problems.push('横向溢出 ' + info.overflow + 'px');
      if (thumbTotal === 0) problems.push('列表里一个缩略图都没有（选择器 ' + thumbSel + ' 可能变了）');
      else if (thumbOk < thumbTotal) problems.push('缩略图 ' + thumbOk + '/' + thumbTotal + ' 有内容');
      if (B.thumbExpectCount && thumbTotal > 0 && thumbTotal < B.thumbExpectCount) problems.push('缩略图只有 ' + thumbTotal + ' 个，少于预期 ' + B.thumbExpectCount);
      if (uniq.length > (B.maxLocalConsoleErrors ?? 0)) problems.push('控制台错误 ' + uniq.length + ' 条');

      const detailBase = '缩略图 ' + thumbOk + '/' + thumbTotal + ' 有内容、横向溢出 ' + info.overflow + 'px、控制台错误 ' + uniq.length + ' 条' +
        (preGate.length ? '（另排除闸门期 ' + preGate.length + ' 条：' + [...new Set(preGate)].join('/') + '，那是测试域名中间页自己的 404）' : '');
      if (problems.length) {
        const why = uniq.slice(0, 3).map((e) => e.kind + '｜' + e.text.replace(/\s+/g, ' ') + (e.url ? '｜' + e.url : '')).join(' ／ ');
        return { status: 'fail', detail: '问题：' + problems.join('；') + '｜' + detailBase + (uniq.length ? '｜明细：' + why : '') };
      }
      return { status: 'pass', detail: detailBase };
    } finally {
      kill();
      await new Promise((r) => setTimeout(r, 300));
    }
  });
}

/* =========================================================
   汇总与输出
   ========================================================= */
const by = (s) => results.filter((r) => r.status === s);
const fails = by('fail');
const warns = by('warn');
const skips = by('skip');
const passes = by('pass');

const icon = { pass: 'PASS', fail: 'FAIL', warn: 'WARN', skip: 'SKIP' };
const pad = (s, n) => {
  let w = 0;
  for (const ch of String(s)) w += /[\u4e00-\u9fa5\uff00-\uffef\u3000-\u303f]/.test(ch) ? 2 : 1;
  return String(s) + ' '.repeat(Math.max(0, n - w));
};

console.log('');
console.log('寻味 / Xunwei —— 发布前检查');
console.log('项目根目录：' + ROOT);
console.log('时间：' + new Date().toLocaleString('zh-CN'));
console.log('─'.repeat(78));
for (const r of results) {
  console.log(icon[r.status] + '  ' + pad(r.id, 16) + pad(r.title, 30) + r.detail);
}
console.log('─'.repeat(78));
console.log('通过 ' + passes.length + ' 项 ／ 阻断 ' + fails.length + ' 项 ／ 提示 ' + warns.length + ' 项 ／ 未检查 ' + skips.length + ' 项（共 ' + results.length + ' 项）');
console.log(fails.length ? '结论：现在不要发布 —— 上面 ' + fails.length + ' 个 FAIL 是发布级问题。' : '结论：可以发布' + (warns.length ? '（' + warns.length + ' 条提示看一眼即可）' : '') + (skips.length ? '；注意有 ' + skips.length + ' 项未检查，别当成通过。' : ''));

/* HTML 报告 */
if (!OPT.noHtml) {
  const color = { pass: '#1a7f37', fail: '#b42318', warn: '#a15c00', skip: '#5b6472' };
  const bg = { pass: '#eaf7ee', fail: '#fdecea', warn: '#fff5e5', skip: '#f1f2f4' };
  const rows = results.map((r) => `
      <tr>
        <td class="st" style="color:${color[r.status]};background:${bg[r.status]}">${icon[r.status]}</td>
        <td class="id">${r.id}</td>
        <td class="ttl">${r.title}<span class="lv">${r.level === 'fail' ? '阻断级' : '提示级'}</span></td>
        <td class="dt">${r.detail.replace(/</g, '&lt;')}</td>
      </tr>`).join('');
  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>寻味 · 发布前检查报告</title>
<style>
  body{margin:0;padding:32px 28px;background:#fbf8f6;color:#2c2321;
       font:14px/1.7 "Microsoft YaHei","PingFang SC",system-ui,sans-serif}
  h1{margin:0 0 4px;font-size:24px;color:#7d2a1e}
  .meta{color:#7a6a66;font-size:13px;margin-bottom:20px}
  .sum{display:flex;gap:12px;margin:18px 0 22px;flex-wrap:wrap}
  .chip{padding:10px 16px;border-radius:10px;font-weight:700;font-size:15px;border:1px solid rgba(0,0,0,.06)}
  .verdict{padding:12px 16px;border-radius:10px;margin-bottom:22px;font-weight:700}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;
        box-shadow:0 1px 3px rgba(0,0,0,.07)}
  th{background:#f4ece8;text-align:left;padding:10px 12px;font-size:13px;color:#6b5750;white-space:nowrap}
  td{padding:11px 12px;border-top:1px solid #f0e9e5;vertical-align:top}
  td.st{font-weight:800;font-size:12px;letter-spacing:.5px;white-space:nowrap}
  td.id{font-family:Consolas,monospace;font-size:12.5px;color:#7d2a1e;white-space:nowrap}
  td.ttl{white-space:nowrap}
  .lv{display:inline-block;margin-left:8px;padding:1px 6px;border-radius:6px;background:#f4ece8;
      color:#8a7168;font-size:11px;font-weight:600}
  td.dt{color:#4a3f3c;font-size:13px}
  .foot{margin-top:18px;color:#8a7a75;font-size:12.5px}
</style></head>
<body>
  <h1>寻味 / Xunwei · 发布前检查报告</h1>
  <div class="meta">项目根目录 ${ROOT} ｜ 生成时间 ${new Date().toLocaleString('zh-CN')}
    ｜ 共 ${results.length} 项检查</div>
  <div class="sum">
    <span class="chip" style="color:#1a7f37;background:#eaf7ee">通过 ${passes.length}</span>
    <span class="chip" style="color:#b42318;background:#fdecea">阻断 FAIL ${fails.length}</span>
    <span class="chip" style="color:#a15c00;background:#fff5e5">提示 WARN ${warns.length}</span>
    <span class="chip" style="color:#5b6472;background:#f1f2f4">未检查 SKIP ${skips.length}</span>
  </div>
  <div class="verdict" style="color:${fails.length ? '#b42318' : '#1a7f37'};background:${fails.length ? '#fdecea' : '#eaf7ee'}">
    ${fails.length ? '结论：现在不要发布 —— 有 ' + fails.length + ' 个发布级问题' : '结论：可以发布'}
    ${skips.length ? '（另有 ' + skips.length + ' 项未检查，未计入通过）' : ''}
  </div>
  <table>
    <thead><tr><th>状态</th><th>检查项</th><th>说明</th><th>实测 / 依据</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="foot">SKIP = 这条没查（网络不通 / 缺依赖），<b>不算通过</b>；WARN = 不阻断发布但该看一眼。</div>
</body></html>`;
  fs.mkdirSync(OPT.out, { recursive: true });
  const htmlPath = path.join(OPT.out, 'report.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  fs.writeFileSync(path.join(OPT.out, 'last-run.json'), JSON.stringify({
    time: new Date().toISOString(), root: ROOT,
    summary: { pass: passes.length, fail: fails.length, warn: warns.length, skip: skips.length },
    results
  }, null, 2), 'utf8');
  console.log('HTML 报告：' + htmlPath);
}

process.exitCode = fails.length ? 1 : 0;
