/* =========================================================
   寻味 / Xunwei —— 接口形状离线自测（Day 17）
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

/* ---------- 异步那一条：main 的空密钥分支 ---------- */
(async function () {
  const saved = process.env.CLOUDBASE_API_KEY;
  delete process.env.CLOUDBASE_API_KEY;
  delete require.cache[require.resolve(path.join(ROOT, 'cloudfunctions', 'api', 'index.js'))];
  const fresh = require(path.join(ROOT, 'cloudfunctions', 'api', 'index.js'));

  const res = await fresh.main({ path: '/api/dishes', httpMethod: 'GET' });
  const body = JSON.parse(res.body);
  check('缺 CLOUDBASE_API_KEY 时返回 500 并说明原因', function () {
    assert(res.statusCode === 500, '状态码是 ' + res.statusCode);
    assert(body.ok === false, 'ok 应该是 false');
    assert(body.error.code === 'internal_error', '错误码是 ' + body.error.code);
    assert(/CLOUDBASE_API_KEY/.test(body.error.message), '报错里应该点出环境变量名');
  });

  if (saved !== undefined) { process.env.CLOUDBASE_API_KEY = saved; }

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
