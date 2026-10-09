/* =========================================================
   寻味 / Xunwei —— 接口形状离线自测（Day 17 建，Day 18 补写接口那一段）
   跑法：node tests/api-shape.test.js

   它不连数据库、不发任何网络请求，因此可以随时跑、跑多少次都一样。

   它在验什么：
   ① 【往返一致】把 data/dishes.json 拆成"6 张表里的行"（模拟库里真实存的样子），
      喂给云函数的映射函数，要求吐出来的对象与原 JSON **逐字段完全相等**。
      这条过了，就说明 api-contract.md §0 那句承诺成立：
      前端换成真接口后，卡片的渲染代码一行都不用改。
   ② 【归一化一致】云函数里的 normalize() 必须和 js/app.js 的 normalize() 同一条规则。
      实现方式是**直接从 app.js 里把那个正则抠出来**再比 —— 不是抄一遍（抄一遍就会各自漂移）。
   ③ 【路由与参数】前缀去掉、非法入参挡得掉、分页总数取得对。
   ④ 【写接口的校验】Day 18 加的 POST /api/dishes：必填、双语成对、列宽、
      地区是否真实存在、重复提交撞主键后翻译成哪个状态码。
   ⑤ 【改与删的校验】Day 22 加的 PATCH / DELETE /api/dishes/{id}：
      PATCH 只验"传了的字段"、派生列重算、以及**跨字段规则要看合并后的状态**；
      DELETE 的 confirm 确认、集合路径不许整体操作；
      外加数据层那道硬保护（缺过滤条件当场抛错 —— 它是"删库"唯一的安全带）。
      ★ 边界与 ④ 相同：只验"拒绝"那半边。真改 / 真删必须连库，
        所以留给板块③ 对着公网做。离线测试不该偷偷改线上数据。
   ========================================================= */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const api = require(path.join(ROOT, 'cloudfunctions', 'api', 'index.js'));
const X = api.__internals;

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed += 1;
    failures.push(name + '\n      ' + e.message);
    console.log('  ✗ ' + name);
  }
}

function assert(cond, msg) {
  if (!cond) { throw new Error(msg); }
}

// 逐字段深比较，报错时报到具体路径，好定位
function deepEqual(actual, expected, where) {
  const at = where || '$';
  if (expected === null || typeof expected !== 'object') {
    if (actual !== expected) {
      throw new Error(at + ' 不等：接口给 ' + JSON.stringify(actual) + '，原文件是 ' + JSON.stringify(expected));
    }
    return;
  }
  if (Array.isArray(expected)) {
    assert(Array.isArray(actual), at + ' 应该是数组，实际是 ' + typeof actual);
    assert(actual.length === expected.length, at + ' 长度不等：' + actual.length + ' vs ' + expected.length);
    expected.forEach(function (v, i) { deepEqual(actual[i], v, at + '[' + i + ']'); });
    return;
  }
  assert(actual && typeof actual === 'object', at + ' 应该是对象，实际是 ' + JSON.stringify(actual));
  const aKeys = Object.keys(actual).sort();
  const eKeys = Object.keys(expected).sort();
  assert(aKeys.join(',') === eKeys.join(','),
    at + ' 字段集合不同：\n        接口多出 ' + aKeys.filter(function (k) { return eKeys.indexOf(k) < 0; }).join(',') +
    '\n        接口少了 ' + eKeys.filter(function (k) { return aKeys.indexOf(k) < 0; }).join(','));
  eKeys.forEach(function (k) { deepEqual(actual[k], expected[k], at + '.' + k); });
}

/* ---------- 把 dishes.json 拆成"表里的行" ----------
   字段名严格照 db/schema.sql 的列名，值怎么来则照 db/tools/make-seed.py。
   （只造映射函数真正读的那些列；region_slug / sort_order / search_text 不参与映射，
     这里给占位值就行。） */

function toDishRow(dish, index) {
  const img = dish.image || {};
  const alt = img.alt || {};
  const credit = img.credit || {};
  return {
    id: dish.id,
    status: dish.status,
    name_zh: dish.name.zh,
    name_en: dish.name.en,
    region_slug: '(test)',
    region_zh: dish.region.zh,
    region_en: dish.region.en,
    tagline_zh: dish.tagline.zh,
    tagline_en: dish.tagline.en,
    block_origin_zh: dish.blocks.origin.zh,
    block_origin_en: dish.blocks.origin.en,
    block_story_zh: dish.blocks.story.zh,
    block_story_en: dish.blocks.story.en,
    block_technique_zh: dish.blocks.technique.zh,
    block_technique_en: dish.blocks.technique.en,
    note_zh: dish.note ? dish.note.zh : null,
    note_en: dish.note ? dish.note.en : null,
    image_thumb_url: img.thumb || null,
    image_thumb_width: img.thumbWidth || null,
    image_thumb_height: img.thumbHeight || null,
    image_hero_url: img.hero || null,
    image_hero_width: img.heroWidth || null,
    image_hero_height: img.heroHeight || null,
    image_alt_zh: alt.zh || null,
    image_alt_en: alt.en || null,
    image_credit_author: credit.author || null,
    image_credit_license: credit.license || null,
    image_credit_license_url: credit.licenseUrl || null,
    image_credit_page: credit.page || null,
    search_text: '(test)',
    sort_order: index + 1
  };
}

// 列表接口只返回"画预览卡片"需要的图片字段，所以期望值要按摘要形状单独拼
function expectedSummary(dish) {
  const img = dish.image;
  return {
    id: dish.id,
    status: dish.status,
    name: dish.name,
    region: dish.region,
    aliases: dish.aliases,
    tagline: dish.tagline,
    image: img ? {
      thumb: img.thumb,
      thumbWidth: img.thumbWidth,
      thumbHeight: img.thumbHeight,
      alt: img.alt
    } : null
  };
}

/* 【已知且有意的一处差异】——就是今天"今日一问"的答案
   那 7 道没配图的菜，mock 文件 data/dishes.json 里**根本没有 image 这个键**；
   而数据库里，它们的 27 个 image_* 列全都是 NULL，接口如实返回 "image": null。

   「字段在场但为空」和「字段根本不在场」在 JSON 里是两回事。
   保留 null 的理由：api-contract.md §3.2 白纸黑字写着"image 可以为 null"，
   而且前端从来都是写 `if (dish.image && dish.image.thumb)` 这种先判空再取值的写法，
   两种形状都吃得下 —— 所以这里是**照契约对齐**，不是接口漏了字段。

   把它单列成一个函数而不是在断言里悄悄放宽：差异必须看得见、能数得出来。 */
function toInterfaceExpected(dish) {
  const expected = {};
  Object.keys(dish).forEach(function (k) { expected[k] = dish[k]; });
  if (!('image' in expected)) { expected.image = null; }
  return expected;
}

// 数一数这处差异到底影响几道菜，好让输出里有个确切的数字
function countImagelessShapes(dishes) {
  return dishes.filter(function (d) { return !('image' in d); }).length;
}

/* ---------- 开跑 ---------- */

const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dishes.json'), 'utf8'));
const dishes = doc.dishes;

console.log('');
console.log('寻味读接口 · 离线自测');
console.log('数据源：data/dishes.json（' + dishes.length + ' 道菜）');
console.log('已知且有意的一处差异：' + countImagelessShapes(dishes) +
  ' 道没配图的菜，原文件里没有 image 键，接口返回 image: null（契约 §3.2 允许，前端按先判空再取值写的）');
console.log('');

console.log('① 往返一致：表里的行 → 接口响应 = 原 JSON');
dishes.forEach(function (dish, index) {
  check('列表摘要：' + dish.id, function () {
    deepEqual(
      X.mapDishSummary(toDishRow(dish, index), dish.aliases),
      expectedSummary(dish)
    );
  });

  check('卡片详情：' + dish.id, function () {
    const row = toDishRow(dish, index);

    const facts = dish.facts.map(function (f, i) {
      return { seq: i + 1, text_zh: f.zh, text_en: f.en, _sources: f.sources };
    });
    const sources = dish.sources.map(function (s) {
      return { source_id: s.id, title: s.title, url: s.url, accessed: s.accessed };
    });

    // 中间表：一条事实挂几个出处就是几行（含 fact_seq，与 dish_facts.seq 对应）
    const links = [];
    facts.forEach(function (f) {
      f._sources.forEach(function (sid) { links.push({ fact_seq: f.seq, source_id: sid }); });
    });

    const byFact = {};
    links.forEach(function (l) {
      if (!byFact[l.fact_seq]) { byFact[l.fact_seq] = []; }
      byFact[l.fact_seq].push(l.source_id);
    });

    const mappedFacts = facts.map(function (f) {
      return { zh: f.text_zh, en: f.text_en, sources: byFact[f.seq] || [] };
    });
    const mappedSources = sources.map(function (s) {
      return { id: s.source_id, title: s.title, url: s.url, accessed: s.accessed };
    });

    const expected = toInterfaceExpected(dish);

    deepEqual(X.mapDishDetail(row, dish.aliases, mappedFacts, mappedSources), expected);
  });
});

console.log('');
console.log('② 归一化一致：云函数的 normalize() ↔ js/app.js 的 normalize()');

const appJs = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const m = /function normalize[\s\S]{0,200}?\.replace\(\/(.*?)\/g/.exec(appJs);
check('能从 app.js 里抠出那条正则', function () {
  assert(m, '没在 js/app.js 里找到 normalize() 的正则，检查函数是不是被改过');
});
const appRegex = m ? new RegExp(m[1], 'g') : null;

const NORM_CASES = [
  '螺狮粉',
  '螺 蛳 粉',
  '  柳州螺蛳粉  ',
  'Snail Noodles',
  'Liuzhou-Luosifen',
  '广 西 / 柳州',
  '「螺蛳粉」',
  '（柳州）螺蛳粉',
  '螺·蛳·粉',
  'A_B·C-D'
];

NORM_CASES.forEach(function (sample) {
  check('样例「' + sample + '」两边结果相同', function () {
    const mine = X.normalize(sample);
    const theirs = String(sample).toLowerCase().replace(appRegex, '');
    assert(mine === theirs,
      '云函数给 ' + JSON.stringify(mine) + '，app.js 给 ' + JSON.stringify(theirs));
  });
});

check('空格与变体都能归一化成同一个键', function () {
  const target = X.normalize('螺蛳粉');
  assert(X.normalize('螺 蛳 粉') === target, '空格没被去掉');
  assert(X.normalize('「螺蛳粉」') === target, '书名号没被去掉');
  assert(X.normalize('螺·蛳·粉') === target, '间隔号没被去掉');
});

console.log('');
console.log('③ 路由、参数与分页');

check('去掉 /api 前缀', function () {
  assert(X.resolveRoute({ path: '/api/dishes' }) === '/dishes', '/api/dishes 没解析对');
  assert(X.resolveRoute({ path: '/api/dishes/luosifen' }) === '/dishes/luosifen', '详情路径没解析对');
  assert(X.resolveRoute({ path: '/api/regions' }) === '/regions', '/api/regions 没解析对');
});

check('裸 /api 或 / 落到接口目录（没开路径透传时就是这个现象）', function () {
  assert(X.resolveRoute({ path: '/api' }) === '/', '裸 /api 没落到目录');
  assert(X.resolveRoute({ path: '/' }) === '/', '/ 没落到目录');
});

check('尾斜杠不影响匹配', function () {
  assert(X.resolveRoute({ path: '/api/dishes/' }) === '/dishes', '尾斜杠没被吃掉');
});

check('路径缺 path 字段时不炸', function () {
  assert(X.resolveRoute({}) === '/', '没有 path 时应该回到 /');
});

check('limit 默认 50，非数字挡掉', function () {
  assert(X.readInt(undefined, 50, 1, 100, 'limit', '1–100 的整数') === 50, '默认值不对');
  assert(X.readInt('20', 50, 1, 100, 'limit', '1–100 的整数') === 20, '正常值没解析出来');
  ['abc', '1.5', '12abc', '-3', '0', '101'].forEach(function (bad) {
    let threw = false;
    try { X.readInt(bad, 50, 1, 100, 'limit', '1–100 的整数'); } catch (e) { threw = true; }
    assert(threw, 'limit=' + bad + ' 应该被挡掉，实际放行了');
  });
});

check('菜品 id 白名单挡掉注入字符', function () {
  assert(X.readId('luosifen') === 'luosifen', '正常 id 没通过');
  ['luosifen,other', 'a)or(1', 'ABC', '../etc', ''].forEach(function (bad) {
    let threw = false;
    try { X.readId(bad); } catch (e) { threw = true; }
    assert(threw, 'id「' + bad + '」应该被挡掉，实际放行了');
  });
});

check('分页总数从 Content-Range 取，取不到才回退', function () {
  assert(X.parseTotal('0-11/12', 12) === 12, '正常 Content-Range 没解析对');
  assert(X.parseTotal('0-4/12', 5) === 12, 'limit=5 时总数应该是 12');
  assert(X.parseTotal('*/0', 1) === 0, '空结果的 */0 应该给 0');
  assert(X.parseTotal('', 7) === 7, '拿不到头应该回退');
});

console.log('');
console.log('④ 写接口的校验：错误输入挡得掉，而且报的是中文（Day 18）');

/* 只用 4 个省做样本就够了 —— 要验的是"匹配规则"，不是"34 个省的数据"。
   四川/陕西/山西三个一起放，是为了验前缀匹配**不会串省**。 */
const REGION_ROWS = [
  { slug: 'guangxi', name_zh: '广西' },
  { slug: 'guangdong', name_zh: '广东' },
  { slug: 'shaanxi', name_zh: '陕西' },
  { slug: 'shanxi', name_zh: '山西' }
];

function goodInput() {
  return {
    id: 'guilin-mifen',
    region: { zh: '广西桂林', en: 'Guilin, Guangxi' },
    name: { zh: '桂林米粉', en: 'Guilin Rice Noodles' },
    tagline: { zh: '一碗卤水打底的粉。', en: 'Noodles with a braised-sauce base.' },
    blocks: {
      origin: { zh: '起源正文', en: 'Origin text' },
      story: { zh: '故事正文', en: 'Story text' },
      technique: { zh: '做法正文', en: 'Technique text' }
    },
    status: 'published',
    aliases: ['桂林米粉', 'Guilin rice noodles', '桂林米粉']
  };
}

// 跑一次校验，要求它必须拒绝，并返回那句中文提示（供进一步检查措辞）
function rejectWith(body, regionRows) {
  let thrown = null;
  try {
    X.validateNewDish(body, regionRows || REGION_ROWS, 99);
  } catch (e) {
    thrown = e;
  }
  assert(thrown, '这份输入本该被拒绝，结果放行了');
  assert(thrown.status === 400, '应该是 400，实际是 ' + thrown.status);
  assert(thrown.code === 'bad_request', '错误码应该是 bad_request，实际是 ' + thrown.code);
  return String(thrown.message);
}

check('合法输入通过，并算出 region_slug 与 sort_order', function () {
  const out = X.validateNewDish(goodInput(), REGION_ROWS, 13);
  assert(out.row.region_slug === 'guangxi', 'region_slug 应该是 guangxi，实际 ' + out.row.region_slug);
  assert(out.row.sort_order === 13, 'sort_order 应该接着传进来的 13');
  assert(out.row.status === 'published', 'status 没保留');
  assert(out.aliases.length === 2, '重复的别名应该被去重成 2 条，实际 ' + out.aliases.length);
  assert(out.row.image_thumb_url === null, '本期不支持传图，图片列应该全是 null');
});

check('search_text 与 make-seed.py 同一条规则（5 段，归一化后拼）', function () {
  const out = X.validateNewDish(goodInput(), REGION_ROWS, 13);
  const parts = out.row.search_text.split('|');
  assert(parts.length === 5, '应该是 5 段（id|中文名|英文名|中文地名|英文地名），实际 ' + parts.length);
  assert(parts[0] === X.normalize('guilin-mifen'), '第 1 段应该是归一化后的 id');
  assert(parts[1] === X.normalize('桂林米粉'), '第 2 段应该是归一化后的中文名');
  assert(out.row.search_text.indexOf(X.normalize('桂林米粉')) >= 0, 'search_text 里要搜得到自己的中文名');
});

check('id 必填', function () {
  const body = goodInput(); delete body.id;
  assert(/id/.test(rejectWith(body)), '报错里应该提到 id');
});

check('id 不合法（大写 / 下划线 / 中文）一律挡掉', function () {
  ['Guilin-Mifen', 'guilin_mifen', '桂林米粉', '-abc'].forEach(function (bad) {
    const body = goodInput(); body.id = bad;
    assert(/id/.test(rejectWith(body)), 'id「' + bad + '」应该被挡掉');
  });
});

check('双语必须成对：只给中文的菜名被拒', function () {
  const body = goodInput(); delete body.name.en;
  const msg = rejectWith(body);
  assert(/菜名 name/.test(msg), '报错里应该点名是哪个字段，实际：' + msg);
  assert(/英文/.test(msg), '应该说明缺的是英文，实际：' + msg);
});

check('双语必须成对：只给英文的卖点被拒', function () {
  const body = goodInput(); body.tagline = { en: 'only english' };
  assert(/tagline/.test(rejectWith(body)), '报错里应该提到 tagline');
});

check('地区必须真的存在：不以省名开头就拒', function () {
  const body = goodInput(); body.region = { zh: '柳州', en: 'Liuzhou' };
  const msg = rejectWith(body);
  assert(/省级行政区/.test(msg), '报错应该说清"要以省级名开头"，实际：' + msg);
});

check('前缀匹配不串省：陕西西安 ≠ 山西', function () {
  const body = goodInput();
  body.region = { zh: '陕西西安', en: "Xi'an, Shaanxi" };
  const out = X.validateNewDish(body, REGION_ROWS, 13);
  assert(out.row.region_slug === 'shaanxi', '应该推成 shaanxi，实际 ' + out.row.region_slug);

  body.region = { zh: '山西太原', en: 'Taiyuan, Shanxi' };
  const out2 = X.validateNewDish(body, REGION_ROWS, 13);
  assert(out2.row.region_slug === 'shanxi', '应该推成 shanxi，实际 ' + out2.row.region_slug);
});

check('列宽：中文名超过 32 字在进库前就被挡（不留给数据库报英文错）', function () {
  const body = goodInput();
  body.name = { zh: '粉'.repeat(33), en: 'Too long name' };
  const msg = rejectWith(body);
  assert(/太长/.test(msg), '应该报"太长"，实际：' + msg);
  assert(/32/.test(msg), '应该说出上限是 32，实际：' + msg);
});

check('status 只能是 published / draft', function () {
  const body = goodInput(); body.status = 'online';
  assert(/status/.test(rejectWith(body)), '报错里应该提到 status');
});

check('status 不给时默认 draft（未核实的内容不上线）', function () {
  const body = goodInput(); delete body.status;
  const out = X.validateNewDish(body, REGION_ROWS, 13);
  assert(out.row.status === 'draft', '默认应该是 draft，实际 ' + out.row.status);
});

check('status=published 时三段正文必须齐全（跨字段规则，库里的列定义表达不了）', function () {
  const body = goodInput();
  body.blocks = {};
  const msg = rejectWith(body);
  assert(/published/.test(msg), '报错应该点明是 published 的要求，实际：' + msg);
  assert(/三段正文/.test(msg), '报错应该说清是哪三段，实际：' + msg);
});

check('别名：太长的挡掉', function () {
  const body = goodInput(); body.aliases = ['粉'.repeat(65)];
  assert(/别名/.test(rejectWith(body)), '报错里应该提到别名');
});

check('别名：去掉符号后成空串的挡掉（否则这条搜索永远命中不了）', function () {
  const body = goodInput(); body.aliases = ['---   '];
  assert(/搜不到/.test(rejectWith(body)), '应该说明它搜不到东西');
});

check('错误一次报全，而不是修一个报一个', function () {
  const msg = rejectWith({});
  const m = /有 (\d+) 个问题/.exec(msg);
  assert(m, '应该报出问题总数，实际：' + msg);
  assert(Number(m[1]) >= 5, '空请求体至少要报出 5 个问题，实际 ' + m[1]);
});

check('网关报错翻译：23505 唯一冲突 → 409（重复提交不是服务器坏了）', function () {
  const e = X.gatewayError(409, JSON.stringify({ code: '23505', message: 'duplicate key value violates unique constraint "pk_dishes"' }));
  assert(e.status === 409, '应该是 409，实际 ' + e.status);
  assert(e.code === 'conflict', '错误码应该是 conflict，实际 ' + e.code);
  assert(/重复|已经在库里/.test(e.message), '提示应该说清是重复，实际 ' + e.message);
});

check('网关报错翻译：信封是 DATABASE_23505 时也认得出（2026-10-08 线上实测格式）', function () {
  const e = X.gatewayError(409, JSON.stringify({
    code: 'DATABASE_23505',
    message: 'duplicate key value violates unique constraint "pk_dishes"'
  }));
  assert(e.status === 409, '带 DATABASE_ 前缀也应该翻成 409，实际 ' + e.status);
  assert(e.code === 'conflict', '错误码应该是 conflict，实际 ' + e.code);
});

check('网关报错翻译：23502 缺必填 → 400', function () {
  const e = X.gatewayError(400, JSON.stringify({ code: '23502', message: 'null value in column "name_zh"' }));
  assert(e.status === 400 && e.code === 'bad_request', '应该翻成 400 bad_request');
});

check('网关报错翻译：23503 外键 → 400，42501 权限 → 500 且点名 SQL 文件', function () {
  const fk = X.gatewayError(409, JSON.stringify({ code: '23503', message: 'insert or update violates foreign key' }));
  assert(fk.status === 400, '外键违反应该是 400（是调用者给错了地区）');

  const perm = X.gatewayError(403, JSON.stringify({ code: '42501', message: 'permission denied for table dishes' }));
  assert(perm.status === 500, '权限不足是服务端的事，应该是 500');
  assert(/grants-write\.sql/.test(perm.message), '报错里应该直接点名要执行哪个 SQL 文件');
});

check('请求头取值不分大小写', function () {
  assert(X.readHeader({ headers: { 'X-Admin-Token': 'abc' } }, 'x-admin-token') === 'abc', '大写键没读到');
  assert(X.readHeader({ headers: { 'x-admin-token': 'abc' } }, 'X-Admin-Token') === 'abc', '小写键没读到');
  assert(X.readHeader({ headers: {} }, 'x-admin-token') === '', '没有这个头应该给空串');
  assert(X.readHeader({}, 'x-admin-token') === '', '没有 headers 也不该炸');
});

check('口令比较：一致为真、长度不同为假、内容不同为假', function () {
  assert(X.safeEqual('secret-token', 'secret-token') === true, '相同口令应该为真');
  assert(X.safeEqual('secret-token', 'secret-toke') === false, '长度不同应该为假');
  assert(X.safeEqual('secret-token', 'secret-tokem') === false, '内容不同应该为假');
});

check('请求体解析：空 / 坏 JSON / 超长 都被挡，合法 JSON 正常读出', function () {
  function tryParse(ev) {
    let thrown = null;
    try { X.parseJsonBody(ev); } catch (e) { thrown = e; }
    return thrown;
  }
  assert(tryParse({ body: '' }).status === 400, '空请求体应该 400');
  assert(/JSON/.test(tryParse({ body: 'not json' }).message), '坏 JSON 的提示里应该提到 JSON');
  assert(tryParse({ body: 'x'.repeat(70000) }).status === 400, '超过 64KB 应该 400');
  const okObj = X.parseJsonBody({ body: '{"id":"x"}' });
  assert(okObj.id === 'x', '合法 JSON 没解析出来');
  const b64 = X.parseJsonBody({ body: Buffer.from('{"id":"y"}').toString('base64'), isBase64Encoded: true });
  assert(b64.id === 'y', 'base64 的请求体没读出来');
});

check('接口目录里登记齐了三条写接口（POST / PATCH / DELETE）', function () {
  const idx = X.endpointIndex();
  const write = idx.endpoints.filter(function (e) {
    return ['POST', 'PATCH', 'DELETE'].indexOf(e.method) >= 0;
  });
  assert(write.length === 3, '目录里应该有 3 条写接口，实际 ' + write.length);
  const post = idx.endpoints.filter(function (e) { return e.method === 'POST'; })[0];
  assert(post.path === '/api/dishes', 'POST 的路径是 /api/dishes');
  assert(/X-Admin-Token/.test(post.desc), '目录里应该写明要带口令');
  const patch = idx.endpoints.filter(function (e) { return e.method === 'PATCH'; })[0];
  assert(patch && patch.path === '/api/dishes/{id}', 'PATCH 的路径要带 {id}');
  const del = idx.endpoints.filter(function (e) { return e.method === 'DELETE'; })[0];
  assert(del && /confirm/.test(del.path), 'DELETE 的路径上要写明确认参数');
});

/* ---------------------------------------------------------
   ⑤ PATCH 的校验：只验"这次传了的字段"，且按"合并后的状态"判（Day 22）

   ★ 与 ④ 同一条边界：这里只验"拒绝"那半边。真改一条要连库，
     所以留给板块③ 对着公网做 —— 离线测试不该偷偷改线上数据。
   --------------------------------------------------------- */

// 一条"库里现有的行"，专门用来验跨字段规则（PATCH 的难点就在这）
const CUR_DRAFT = {
  id: 'day22-test',
  status: 'draft',
  name_zh: '测试菜', name_en: 'Test Dish',
  region_zh: '广西柳州', region_en: 'Liuzhou, Guangxi',
  tagline_zh: '旧的卖点', tagline_en: 'old tagline',
  block_origin_zh: '', block_origin_en: '',
  block_story_zh: '', block_story_en: '',
  block_technique_zh: '', block_technique_en: ''
};
const CUR_PUBLISHED = {
  id: 'day22-test',
  status: 'published',
  name_zh: '测试菜', name_en: 'Test Dish',
  region_zh: '广西柳州', region_en: 'Liuzhou, Guangxi',
  tagline_zh: '卖点', tagline_en: 'tagline',
  block_origin_zh: 'A', block_origin_en: 'a',
  block_story_zh: 'B', block_story_en: 'b',
  block_technique_zh: 'C', block_technique_en: 'c'
};
const TEST_REGIONS = [
  { slug: 'guangxi', name_zh: '广西' },
  { slug: 'guangdong', name_zh: '广东' }
];

// 把"应该被拒绝"写成一个断言：必须抛 400，且消息里含某个关键词
function rejectPatch(body, needWord, current) {
  let err = null;
  try { X.validateDishPatch(body, TEST_REGIONS, current || CUR_DRAFT); } catch (e) { err = e; }
  assert(err, '本该被拒绝，却通过了：' + JSON.stringify(body));
  assert(err.status === 400, '状态码是 ' + err.status);
  if (needWord) {
    assert(err.message.indexOf(needWord) >= 0, '报错里应该提到「' + needWord + '」，实际是：' + err.message);
  }
  return err;
}

check('PATCH：一个字段都不给 → 拒绝（不装作"成功但什么也没做"）', function () {
  rejectPatch({}, '没有任何字段');
});

check('PATCH：不许改 id（主键，也是卡片页地址的一部分）', function () {
  rejectPatch({ id: 'other-id' }, 'id 不能改');
});

check('PATCH：不认识的字段 → 拒绝（派生列不能直接传）', function () {
  rejectPatch({ search_text: 'x' }, '不认识的字段');
  rejectPatch({ sort_order: 99 }, '不认识的字段');
  rejectPatch({ image_thumb_url: 'http://x' }, '不认识的字段');
});

check('PATCH：只产出这次传了的列，没传的一个都不动', function () {
  const r = X.validateDishPatch({ status: 'draft', tagline: { zh: '新卖点', en: 'new tagline' } }, TEST_REGIONS, CUR_DRAFT);
  assert(r.patch.status === 'draft', 'status 应该写进去');
  assert(r.patch.tagline_zh === '新卖点', 'tagline 应该写进去');
  assert(!('name_zh' in r.patch), 'name 没传，就不该出现在 patch 里');
  assert(!('region_zh' in r.patch), 'region 没传，就不该出现在 patch 里');
  assert(!('search_text' in r.patch), '名字和地区都没动，不该重算 search_text');
  assert(r.aliases === null, '没传 aliases 时应该是 null（表示"不动别名"）');
});

check('PATCH：改了名字 → search_text 跟着重算（否则改了名却搜不到）', function () {
  const r = X.validateDishPatch({ name: { zh: '改名了', en: 'Renamed' } }, TEST_REGIONS, CUR_DRAFT);
  assert(r.patch.name_zh === '改名了', '新名字应该写进去');
  assert(typeof r.patch.search_text === 'string' && r.patch.search_text.length > 0, 'search_text 应该被重算');
  assert(r.patch.search_text.indexOf('改名了') >= 0, 'search_text 里应该含新名字');
  assert(r.patch.search_text.indexOf('测试菜') < 0, 'search_text 里不该残留旧名字');
});

check('PATCH：改了地区 → region_slug 由中文地名重推，不是照抄', function () {
  const r = X.validateDishPatch({ region: { zh: '广东广州', en: 'Guangzhou, Guangdong' } }, TEST_REGIONS, CUR_DRAFT);
  assert(r.patch.region_slug === 'guangdong', 'slug 应该是 guangdong，实际 ' + r.patch.region_slug);
  rejectPatch({ region: { zh: '柳州', en: 'Liuzhou' } }, '不以任何省级行政区名开头');
});

check('PATCH：只改一段正文 → 只写那一段的列', function () {
  const r = X.validateDishPatch({ blocks: { story: { zh: '故事', en: 'story' } } }, TEST_REGIONS, CUR_DRAFT);
  assert(r.patch.block_story_zh === '故事', 'story 应该写进去');
  assert(!('block_origin_zh' in r.patch), '没传 origin，就不该动它');
  assert(!('block_technique_zh' in r.patch), '没传 technique，就不该动它');
});

check('PATCH：双语成对规则与 POST 完全一致（只给中文名 → 拒绝）', function () {
  rejectPatch({ name: { zh: '只有中文' } }, '缺英文');
});

check('PATCH 跨字段（今天的关键）：库里 draft 且正文空，想改成 published → 拒绝', function () {
  rejectPatch({ status: 'published' }, '三段正文必须双语齐全');
});

check('PATCH 跨字段（今天的关键）：库里 published 且正文齐全，只把 status 改回 draft → 通过', function () {
  const r = X.validateDishPatch({ status: 'draft' }, TEST_REGIONS, CUR_PUBLISHED);
  assert(r.patch.status === 'draft', 'status 应该改掉');
  assert(!('block_origin_zh' in r.patch), '正文没传就不该动');
});

check('PATCH 跨字段（今天的关键）：库里 published，想把某段正文清空 → 拒绝', function () {
  rejectPatch({ blocks: { origin: { zh: '', en: '' } } }, '三段正文必须双语齐全', CUR_PUBLISHED);
});

check('PATCH：aliases 必须是数组；给了就是整组替换（空数组 = 清空）', function () {
  rejectPatch({ aliases: '不是数组' }, '必须是数组');
  const r = X.validateDishPatch({ aliases: ['新别名', '新别名', 'another one'] }, TEST_REGIONS, CUR_DRAFT);
  assert(Array.isArray(r.aliases), 'aliases 应该是数组');
  assert(r.aliases.length === 2, '重复的别名应该去掉，实际 ' + r.aliases.length);
  const empty = X.validateDishPatch({ aliases: [] }, TEST_REGIONS, CUR_DRAFT);
  assert(Array.isArray(empty.aliases) && empty.aliases.length === 0, '空数组代表"清空"，要与 null 区分开');
});

/* ---------- 数据层那道硬保护（今天最要紧的一行代码） ---------- */
check('db.js：PATCH / DELETE 缺过滤条件 → 当场抛错，绝不发出请求', function () {
  const db = require(path.join(ROOT, 'cloudfunctions', 'api', 'db.js'));
  let e1 = null, e2 = null;
  try { db.restUpdate('dishes', [], { status: 'draft' }); } catch (e) { e1 = e; }
  try { db.restDelete('dishes', []); } catch (e) { e2 = e; }
  assert(e1, 'restUpdate 传空过滤条件时本该抛错');
  assert(/过滤条件/.test(e1.message), 'restUpdate 的报错里应该点明"过滤条件"');
  assert(e2, 'restDelete 传空过滤条件时本该抛错');
  assert(/过滤条件/.test(e2.message), 'restDelete 的报错里应该点明"过滤条件"');
});

/* ---------- 异步那几条：走 main()，验方法/口令分派 ---------- */
(async function () {
  const INDEX = path.join(ROOT, 'cloudfunctions', 'api', 'index.js');
  const DB = path.join(ROOT, 'cloudfunctions', 'api', 'db.js');
  /* Day 19 起云函数拆成 index.js（业务层）+ db.js（数据访问层）两个模块，
     index.js 依赖 db.js。要让「改环境变量后重新 require」生效，
     两个模块的缓存都得清 —— 只清 index.js 的话，db.js 里载过的旧配置
     会盖住新环境变量（拆层后第一轮回归就抓出来的缝）。 */
  function freshIndex() {
    delete require.cache[require.resolve(INDEX)];
    delete require.cache[require.resolve(DB)];
    return require(INDEX);
  }

  // (1) Day 17 就有的那条：缺密钥时的自诊分支
  const savedKey = process.env.CLOUDBASE_API_KEY;
  delete process.env.CLOUDBASE_API_KEY;
  let fresh = freshIndex();

  const res = await fresh.main({ path: '/api/dishes', httpMethod: 'GET' });
  const body = JSON.parse(res.body);
  check('缺 CLOUDBASE_API_KEY 时返回 500 并说明原因', function () {
    assert(res.statusCode === 500, '状态码是 ' + res.statusCode);
    assert(body.ok === false, 'ok 应该是 false');
    assert(body.error.code === 'internal_error', '错误码是 ' + body.error.code);
    assert(/CLOUDBASE_API_KEY/.test(body.error.message), '报错里应该点出环境变量名');
  });

  // (2) Day 18：写接口的口令与方法分派
  //     这几条都在"校验之前"就返回了，所以不会碰网络。
  //     密钥填一个假值即可 —— 我们要验的是分派顺序，不是真连库。
  process.env.CLOUDBASE_API_KEY = 'dummy-for-offline-test';
  process.env.ADMIN_TOKEN = 'test-token';
  fresh = freshIndex();

  async function call(ev) {
    const r = await fresh.main(ev);
    return { status: r.statusCode, body: JSON.parse(r.body) };
  }

  const noToken = await call({ path: '/api/dishes', httpMethod: 'POST', headers: {}, body: '{}' });
  check('POST 不带口令 → 401，且说清要带哪个头', function () {
    assert(noToken.status === 401, '状态码是 ' + noToken.status);
    assert(noToken.body.error.code === 'unauthorized', '错误码是 ' + noToken.body.error.code);
    assert(/X-Admin-Token/.test(noToken.body.error.message), '提示里应该写明请求头名字');
  });

  const badToken = await call({ path: '/api/dishes', httpMethod: 'POST', headers: { 'x-admin-token': 'nope' }, body: '{}' });
  check('POST 口令不对 → 401', function () {
    assert(badToken.status === 401, '状态码是 ' + badToken.status);
  });

  const badJson = await call({ path: '/api/dishes', httpMethod: 'POST', headers: { 'x-admin-token': 'test-token' }, body: 'not json' });
  check('口令对了但请求体不是 JSON → 400（先验身份，再验数据）', function () {
    assert(badJson.status === 400, '状态码是 ' + badJson.status);
    assert(badJson.body.error.code === 'bad_request', '错误码是 ' + badJson.body.error.code);
  });

  const wrongPath = await call({ path: '/api/regions', httpMethod: 'POST', headers: { 'x-admin-token': 'test-token' }, body: '{}' });
  check('POST 打到 /regions → 405（写接口只开在 /dishes 一处）', function () {
    assert(wrongPath.status === 405, '状态码是 ' + wrongPath.status);
    assert(wrongPath.body.error.code === 'method_not_allowed', '错误码是 ' + wrongPath.body.error.code);
  });

  /* Day 22：DELETE 从"本期不做"变成真接口，旧断言随之退休。
     下面这几条都停在**碰数据库之前**，所以离线可测；真删一条留给板块③。 */
  const delNoToken = await call({ path: '/api/dishes/guilin-mifen', httpMethod: 'DELETE', queryStringParameters: { confirm: 'guilin-mifen' } });
  check('DELETE 不带口令 → 401（写接口先验身份）', function () {
    assert(delNoToken.status === 401, '状态码是 ' + delNoToken.status);
  });

  const delNoConfirm = await call({ path: '/api/dishes/guilin-mifen', httpMethod: 'DELETE', headers: { 'x-admin-token': 'test-token' } });
  check('DELETE 不带 confirm → 400，且说清要带什么（删除不可逆，必须显式确认）', function () {
    assert(delNoConfirm.status === 400, '状态码是 ' + delNoConfirm.status);
    assert(delNoConfirm.body.error.code === 'bad_request', '错误码是 ' + delNoConfirm.body.error.code);
    assert(/confirm/.test(delNoConfirm.body.error.message), '提示里要写明该带什么参数');
  });

  const delMismatch = await call({
    path: '/api/dishes/guilin-mifen', httpMethod: 'DELETE',
    headers: { 'x-admin-token': 'test-token' },
    queryStringParameters: { confirm: 'luosifen' }
  });
  check('DELETE 的 confirm 与路径 id 不一致 → 400，什么都没删（这就是"手滑保护"）', function () {
    assert(delMismatch.status === 400, '状态码是 ' + delMismatch.status);
    assert(/不一致/.test(delMismatch.body.error.message), '提示里要说清不一致');
  });

  const patchOnCollection = await call({
    path: '/api/dishes', httpMethod: 'PATCH',
    headers: { 'x-admin-token': 'test-token' }, body: '{"status":"draft"}'
  });
  check('PATCH 打到集合路径 /api/dishes → 405（不支持"改全部"）', function () {
    assert(patchOnCollection.status === 405, '状态码是 ' + patchOnCollection.status);
    assert(patchOnCollection.body.error.code === 'method_not_allowed', '错误码是 ' + patchOnCollection.body.error.code);
  });

  const delOnCollection = await call({
    path: '/api/dishes', httpMethod: 'DELETE',
    headers: { 'x-admin-token': 'test-token' }, queryStringParameters: { confirm: 'dishes' }
  });
  check('DELETE 打到集合路径 /api/dishes → 405（不支持"删全部"）', function () {
    assert(delOnCollection.status === 405, '状态码是 ' + delOnCollection.status);
  });

  const patchNoToken = await call({ path: '/api/dishes/luosifen', httpMethod: 'PATCH', body: '{"status":"draft"}' });
  check('PATCH 不带口令 → 401', function () {
    assert(patchNoToken.status === 401, '状态码是 ' + patchNoToken.status);
  });

  const patchBadId = await call({
    path: '/api/dishes/Bad_ID', httpMethod: 'PATCH',
    headers: { 'x-admin-token': 'test-token' }, body: '{"status":"draft"}'
  });
  check('PATCH 的 id 不合法 → 400（白名单在碰库之前就挡）', function () {
    assert(patchBadId.status === 400, '状态码是 ' + patchBadId.status);
  });

  const putElsewhere = await call({ path: '/api/dishes/luosifen', httpMethod: 'PUT', headers: { 'x-admin-token': 'test-token' } });
  check('PUT 仍未支持 → 405，且报错里指路（修改要用 PATCH）', function () {
    assert(putElsewhere.status === 405, '状态码是 ' + putElsewhere.status);
    assert(/PATCH/.test(putElsewhere.body.error.message), '报错里应该指路到 PATCH');
  });

  const opt = await fresh.main({ path: '/api/dishes', httpMethod: 'OPTIONS' });
  check('OPTIONS 预检直接放行（跨域要用，且已放行 PATCH / DELETE）', function () {
    assert(opt.statusCode === 204, '状态码是 ' + opt.statusCode);
    assert(/POST/.test(opt.headers['Access-Control-Allow-Methods']), '允许的方法里要有 POST');
    assert(/PATCH/.test(opt.headers['Access-Control-Allow-Methods']), '允许的方法里要有 PATCH');
    assert(/DELETE/.test(opt.headers['Access-Control-Allow-Methods']), '允许的方法里要有 DELETE');
    assert(/X-Admin-Token/.test(opt.headers['Access-Control-Allow-Headers']), '允许的请求头里要有 X-Admin-Token');
  });

  if (savedKey !== undefined) { process.env.CLOUDBASE_API_KEY = savedKey; }
  else { delete process.env.CLOUDBASE_API_KEY; }
  delete process.env.ADMIN_TOKEN;

  console.log('');
  console.log('────────────────────────────────────────');
  console.log('通过 ' + passed + ' 项，失败 ' + failed + ' 项');
  if (failed) {
    console.log('');
    failures.forEach(function (f) { console.log('  ✗ ' + f); });
    process.exitCode = 1;
  }
  console.log('');
})();
