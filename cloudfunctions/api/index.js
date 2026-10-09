'use strict';

/* =========================================================
   寻味 / Xunwei —— 接口云函数（Day 17 读接口 / Day 18 加一条写接口）

   五条路径，都在这一个云函数里：
     GET  /api                  接口目录（用来一眼确认"路由到底通没通"）
     GET  /api/dishes           列表：搜索 + 地区筛选 + 分页
     GET  /api/dishes/{id}      卡片：一道菜的完整内容
     GET  /api/regions          地区索引：34 个省级行政区 + 每省已收录几道
     POST /api/dishes           ★ Day 18：策展端新增一道菜（要管理口令）

   ---------------------------------------------------------
   【一、库是怎么读到的】

   云开发 PG 模式的数据库**不能**用 pg / mysql 那类驱动去直连
   （它没有暴露 5432 端口给我们）。官方给的读法是一个基于
   PostgREST 的 HTTP 网关：

     https://{环境ID}.api.tcloudbasegateway.com/v1/rdb/rest/{表名}?过滤参数

   鉴权靠请求头 `Authorization: Bearer <API Key>`。
   API Key 在库里对应 service_role 角色，属于**后端专用**——
   它只从云函数的环境变量读（process.env.CLOUDBASE_API_KEY），
   任何一条响应里都不会带上它，前端代码里也没有它。
   （对照：前端用的那把叫 Publishable Key、对应 anon 角色，我们没申请。）

   ★ 所以「SQL 参数化」在今天这句要求里换了副面孔：
     我们没有拼 SQL 字符串，而是把条件传成 PostgREST 的过滤表达式
     （如 status=eq.published）。但过滤表达式**自己也有元字符**
     （逗号、点、括号），用户输入必须先过白名单校验才能拼进去 ——
     见 readId() / readSlug() 两处。不校验就等于把注入点从 SQL 搬到了这里。

   ---------------------------------------------------------
   【二、为什么不用任何第三方包】

   全程只用 Node 内置的 https 模块。好处：云函数运行时是 Node 哪个版本
   都不用管（fetch 要 Node 18+，https 从 Node 8 起就有），
   也不用在控制台点"安装依赖"。少一个环节，就少一处会出错的地方。

   ---------------------------------------------------------
   【三、为什么响应形状要和 data/dishes.json 一模一样】

   js/data-source.js 当初就是为"换数据源"留的唯一出入口（它文件头写着）。
   形状不变 ⇒ 卡片的渲染代码一行都不用改，改动全在这层之外。
   依据是 api-contract.md §0 的那条硬规矩。

   ---------------------------------------------------------
   【四、Day 18 为什么写接口落在"策展端"而不是"用户端"】

   课程第 3 周的示例应用是个打卡应用，写接口是"用户打卡"。
   寻味**不是**那种产品：PRD §9 非目标第 4 条写死了"不做用户投稿 /
   注册登录 / UGC（本期无写入功能）"。这个结论今天依然成立。

   所以这条 POST 不写在用户侧，而写在**策展侧**：把原本"手写 SQL
   才能加一道菜"这件事，变成一次带口令的接口调用。它不收集任何
   用户数据，只是把我们自己维护内容的方式换了个入口。

   它同时把今天要练的两件事都摊开了：
     ① 防重复提交 —— dishes 的主键是 id，同一道菜提交两次，
        第二次会被 PostgreSQL 的 23505 唯一冲突顶回来，
        接口把它翻成 409 conflict（不是 500）。
     ② 防错误输入 —— 必填字段、双语成对、列宽、地区是否真实存在，
        全部在进库之前用**中文**逐条报出来，而不是把数据库的
        英文报错原样甩给调用者。
   ========================================================= */

const crypto = require('crypto');

/* Day 19：查数据库的代码整段搬进了隔壁的 db.js（数据访问层）。
   index.js 从此只管「听请求、验输入、组响应」，不再直接碰 https 和网关。
   连库要用的 ENV_ID / CLOUDBASE_API_KEY / 网关地址 / 超时，都随它搬走了。 */
const dbLayer = require('./db.js');
const httpError = dbLayer.httpError;
const restGet = dbLayer.restGet;
const restInsert = dbLayer.restInsert;
// Day 22：改（PATCH）与删（DELETE）。两个都会在 db.js 内部强制要求过滤条件 ——
// 少写过滤条件不是"改错一行"，而是"改整张表 / 清整张表"。
const restUpdate = dbLayer.restUpdate;
const restDelete = dbLayer.restDelete;
const parseTotal = dbLayer.parseTotal;
const gatewayError = dbLayer.gatewayError;
const API_KEY = dbLayer.API_KEY;

/* ---------- 环境常量 ---------- */

// ★ Day 18：写接口的管理口令。同样是环境变量，同样不写明文。
//   它不是"用户身份"——寻味没有用户。它只回答一个问题：
//   "这次调用是不是我们自己人发起的"。
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
// 写接口的请求体上限。不加这条，一段畸形输入能让函数吃满内存。
const MAX_BODY_BYTES = 64 * 1024;

// 菜品 id / 地区 slug 的白名单。两个都能进 PostgREST 的过滤表达式，
// 不校验就等于开了个注入点。
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/* 列宽上限，逐条抄自 db/schema.sql 的 VARCHAR(n)。
   在进库之前先挡一次，为的是把 PostgreSQL 那句
   "value too long for type character varying(32)" 换成一句中文人话。
   ★ 改了 schema 就要顺手改这里 —— 两处是同一份事实。 */
const MAX_LEN = {
  id: 64,
  name_zh: 32, name_en: 64,
  region_slug: 32, region_zh: 32, region_en: 64,
  tagline_zh: 255, tagline_en: 255,
  alias: 64,
  search_text: 255
};

/* ---------- 列清单：只取要用的列 ---------- */

// 列表用：画一张预览卡片需要的全部列（不含三段正文，那在详情接口里取）
const COLS_SUMMARY = [
  'id', 'status',
  'name_zh', 'name_en',
  'region_zh', 'region_en',
  'tagline_zh', 'tagline_en',
  'image_thumb_url', 'image_thumb_width', 'image_thumb_height',
  'image_alt_zh', 'image_alt_en'
].join(',');

// 详情用：主表整行（search_text 是派生列，取值时不进响应，见 mapDishDetail）
const COLS_DISH = '*';

/* =========================================================
   一、和用户输入打交道
   ========================================================= */

// ★ 必须与 js/app.js 的 normalize() 逐字符一致，否则会出现"页面搜得到、接口搜不到"
function normalize(text) {
  return String(text === null || text === undefined ? '' : text)
    .toLowerCase()
    .replace(/[\s·・\-_/（）()「」【】]/g, '');
}

// httpError（带 status/code 的错误类型）Day 19 起改由 db.js 定义并导出，
// 本文件从 dbLayer 里解构使用 —— 定义只保留一份。

function readInt(raw, fallback, min, max, name, hint) {
  if (raw === undefined || raw === null || raw === '') { return fallback; }
  // 只认纯数字：'12abc' / '1.5' / 'abc' 一律挡掉（Number() 会放过前两种）
  if (!/^\d+$/.test(String(raw))) {
    throw httpError(400, 'bad_request', name + ' 必须是' + hint + ' / ' + name + ' must be ' + hint);
  }
  const n = Number(raw);
  if (n < min || n > max) {
    throw httpError(400, 'bad_request', name + ' 必须是' + hint + ' / ' + name + ' must be ' + hint);
  }
  return n;
}

function readId(raw) {
  const id = String(raw || '');
  if (!ID_RE.test(id)) {
    throw httpError(400, 'bad_request', '菜品 id 不合法 / invalid dish id: ' + id.slice(0, 40));
  }
  return id;
}

function readSlug(raw) {
  const slug = String(raw || '');
  if (!ID_RE.test(slug)) {
    throw httpError(400, 'bad_request', 'region 要传省级英文短名（如 guangxi）/ region must be a slug');
  }
  return slug;
}

/* =========================================================
   二、行 → 响应形状（这一步决定"前端要不要改代码"）
   ========================================================= */

function bilingual(zh, en) {
  return { zh: zh === null || zh === undefined ? '' : zh, en: en === null || en === undefined ? '' : en };
}

// 列表里的图片：只要画缩略图那几项。没图就是 null（12 道里 7 道没图）
function mapImageSummary(row) {
  if (!row.image_thumb_url) { return null; }
  const img = {
    thumb: row.image_thumb_url,
    thumbWidth: row.image_thumb_width,
    thumbHeight: row.image_thumb_height
  };
  if (row.image_alt_zh !== null && row.image_alt_zh !== undefined) {
    img.alt = bilingual(row.image_alt_zh, row.image_alt_en);
  }
  return img;
}

// 卡片里的图片：多出大图和署名。
// 署名不是装饰：图来自 Wikimedia Commons，CC BY-SA 4.0 的条件之一就是标明作者与许可。
function mapImageDetail(row) {
  const hasThumb = !!row.image_thumb_url;
  const hasHero = !!row.image_hero_url;
  if (!hasThumb && !hasHero) { return null; }

  const img = {};
  if (hasThumb) {
    img.thumb = row.image_thumb_url;
    img.thumbWidth = row.image_thumb_width;
    img.thumbHeight = row.image_thumb_height;
  }
  if (hasHero) {
    img.hero = row.image_hero_url;
    img.heroWidth = row.image_hero_width;
    img.heroHeight = row.image_hero_height;
  }
  if (row.image_alt_zh !== null && row.image_alt_zh !== undefined) {
    img.alt = bilingual(row.image_alt_zh, row.image_alt_en);
  }

  const credit = {};
  if (row.image_credit_author) { credit.author = row.image_credit_author; }
  if (row.image_credit_license) { credit.license = row.image_credit_license; }
  if (row.image_credit_license_url) { credit.licenseUrl = row.image_credit_license_url; }
  if (row.image_credit_page) { credit.page = row.image_credit_page; }
  if (Object.keys(credit).length) { img.credit = credit; }

  return img;
}

// 列表项：只有"画一张预览卡片"需要的字段，不含正文（契约 §3.2）
function mapDishSummary(row, aliases) {
  return {
    id: row.id,
    status: row.status,
    name: bilingual(row.name_zh, row.name_en),
    region: bilingual(row.region_zh, row.region_en),
    aliases: aliases,
    tagline: bilingual(row.tagline_zh, row.tagline_en),
    image: mapImageSummary(row)
  };
}

// 详情：完整一道菜
function mapDishDetail(row, aliases, facts, sources) {
  const dish = {
    id: row.id,
    status: row.status,
    name: bilingual(row.name_zh, row.name_en),
    aliases: aliases,
    region: bilingual(row.region_zh, row.region_en),
    image: mapImageDetail(row),
    tagline: bilingual(row.tagline_zh, row.tagline_en),
    /* ★ 三段正文里的 [[sourceId]] 标记必须原样带出去。
       剥掉 = 每条事实陈述当场失去出处，而这个产品的地基就是"每条事实能点回原文"
       （契约 §1.3）。所以这里一个字都不动，不做转义、不转 HTML。 */
    blocks: {
      origin: bilingual(row.block_origin_zh, row.block_origin_en),
      story: bilingual(row.block_story_zh, row.block_story_en),
      technique: bilingual(row.block_technique_zh, row.block_technique_en)
    },
    facts: facts,
    sources: sources
  };
  // note 只在有值时才出现（本期 12 道都是 published，都没有 note）
  if (row.note_zh) { dish.note = bilingual(row.note_zh, row.note_en); }
  return dish;
}

/* =========================================================
   三、三条路由各自怎么做
   ========================================================= */

/* 搜索：先找出"可能命中的 id"，再由主查询统一过滤。
   为什么拆成两小步而不是写一句 or=(...) 的大表达式：
   因为多表 or 的写法依赖 PostgREST 的复合过滤语法，出错了很难看出错在哪；
   而 =like.*x* 和 =in.(a,b) 这两种最简单、最不会踩坑。
   本项目的量级（12 道菜）下，多两次请求完全不值得换成"更聪明但更难查"的写法。

   为什么用库里的派生列而不是把过滤搬到 JS：
   dishes.search_text 与 dish_aliases.alias_norm 就是为这件事预存的
   （见 db/schema.sql 的 COMMENT）。它们和 app.js 的 normalize() 是**同一条规则**，
   由 db/tools/make-seed.py 保证只有一份实现。 */
async function findCandidateIds(normQuery) {
  const like = 'like.*' + normQuery + '*';
  const results = await Promise.all([
    restGet('dishes', [['select', 'id'], ['search_text', like], ['limit', String(MAX_LIMIT)]], { count: false }),
    restGet('dish_aliases', [['select', 'dish_id'], ['alias_norm', like], ['limit', '500']], { count: false })
  ]);

  const seen = {};
  results.forEach(function (res) {
    res.rows.forEach(function (r) {
      const id = r.id || r.dish_id;
      if (id) { seen[id] = true; }
    });
  });
  return Object.keys(seen);
}

// 一次把这一页所有菜的别名取回来，按 dish_id 分组
async function aliasesFor(dishIds) {
  const map = {};
  if (!dishIds.length) { return map; }

  const res = await restGet('dish_aliases', [
    ['select', 'dish_id,alias'],
    ['dish_id', 'in.(' + dishIds.join(',') + ')'],
    ['order', 'dish_id.asc,sort_order.asc']
  ], { count: false });

  res.rows.forEach(function (r) {
    if (!map[r.dish_id]) { map[r.dish_id] = []; }
    map[r.dish_id].push(r.alias);
  });
  return map;
}

async function handleDishes(query) {
  const status = query.status === undefined || query.status === '' ? 'published' : String(query.status);
  if (status !== 'published' && status !== 'all') {
    throw httpError(400, 'bad_request', 'status 只能是 published 或 all / status must be published or all');
  }

  const limit = readInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT, 'limit', '1–100 的整数');
  const offset = readInt(query.offset, 0, 0, 1000000, 'offset', '不小于 0 的整数');
  const region = query.region ? readSlug(query.region) : '';
  const normQuery = normalize(query.q || '');

  const pairs = [['select', COLS_SUMMARY]];
  if (status === 'published') { pairs.push(['status', 'eq.published']); }
  if (region) { pairs.push(['region_slug', 'eq.' + region]); }

  if (normQuery) {
    const ids = await findCandidateIds(normQuery);
    if (!ids.length) {
      // 一个都没搜到：直接给空数组。空态归前端画（"没找到"和"库是空的"是两种画面）
      return { items: [], total: 0, limit: limit, offset: offset };
    }
    pairs.push(['id', 'in.(' + ids.join(',') + ')']);
  }

  pairs.push(['order', 'sort_order.asc']);
  pairs.push(['limit', String(limit)]);
  pairs.push(['offset', String(offset)]);

  const res = await restGet('dishes', pairs);
  const aliases = await aliasesFor(res.rows.map(function (r) { return r.id; }));

  return {
    items: res.rows.map(function (r) { return mapDishSummary(r, aliases[r.id] || []); }),
    total: res.total,
    limit: limit,
    offset: offset
  };
}

async function handleDishDetail(rawId) {
  const id = readId(rawId);

  const head = await restGet('dishes', [['select', COLS_DISH], ['id', 'eq.' + id], ['limit', '1']], { count: false });
  if (!head.rows.length) { return null; }   // 交给 main 变成 404，绝不能写成 500

  // 四张扩展表互不依赖，并发取，省一半等待时间
  const parts = await Promise.all([
    restGet('dish_aliases', [['select', 'alias'], ['dish_id', 'eq.' + id], ['order', 'sort_order.asc']], { count: false }),
    restGet('dish_facts', [['select', 'seq,text_zh,text_en'], ['dish_id', 'eq.' + id], ['order', 'seq.asc']], { count: false }),
    restGet('dish_sources', [['select', 'source_id,title,url,accessed'], ['dish_id', 'eq.' + id], ['order', 'sort_order.asc']], { count: false }),
    restGet('dish_fact_sources', [['select', 'fact_seq,source_id'], ['dish_id', 'eq.' + id], ['order', 'fact_seq.asc,sort_order.asc']], { count: false })
  ]);
  const aliasRows = parts[0], factRows = parts[1], sourceRows = parts[2], linkRows = parts[3];

  // 事实 ↔ 出处是"多对多"，中间表按 fact_seq 归组后拼回每条事实的 sources 数组
  const byFact = {};
  linkRows.rows.forEach(function (l) {
    if (!byFact[l.fact_seq]) { byFact[l.fact_seq] = []; }
    byFact[l.fact_seq].push(l.source_id);
  });

  const facts = factRows.rows.map(function (f) {
    return { zh: f.text_zh, en: f.text_en, sources: byFact[f.seq] || [] };
  });

  const sources = sourceRows.rows.map(function (s) {
    return { id: s.source_id, title: s.title, url: s.url, accessed: s.accessed };
  });

  return mapDishDetail(
    head.rows[0],
    aliasRows.rows.map(function (a) { return a.alias; }),
    facts,
    sources
  );
}

async function handleRegions() {
  const parts = await Promise.all([
    restGet('regions', [
      ['select', 'slug,name_zh,name_en,group_id,group_name_zh,group_name_en,group_order,sort_order'],
      ['order', 'group_order.asc,sort_order.asc']
    ], { count: false }),
    // count 用"按 region_slug 数一遍"来算，和列表接口的筛选条件是同一个等值比较，
    // 所以"索引上说广西有 1 道"和"点进去筛出 1 道"永远一致（契约 §3.4 的告警）
    restGet('dishes', [['select', 'region_slug'], ['status', 'eq.published'], ['limit', String(MAX_LIMIT)]], { count: false })
  ]);
  const regionRows = parts[0].rows, dishRows = parts[1].rows;

  const counts = {};
  dishRows.forEach(function (d) {
    counts[d.region_slug] = (counts[d.region_slug] || 0) + 1;
  });

  const groups = [];
  const seenGroup = {};
  regionRows.forEach(function (r) {
    if (!seenGroup[r.group_id]) {
      seenGroup[r.group_id] = true;
      groups.push({ id: r.group_id, name: r.group_name_zh, en: r.group_name_en });
    }
  });

  return {
    groups: groups,
    items: regionRows.map(function (r) {
      return {
        key: r.name_zh,
        en: r.name_en,
        slug: r.slug,
        group: r.group_name_zh,
        groupId: r.group_id,
        count: counts[r.slug] || 0
      };
    }),
    total: regionRows.length
  };
}

/* =========================================================
   四、写接口：新增一道菜（Day 18）
   ========================================================= */

/* ---------- 5.1 管理口令：确认"是我们自己发起的" ---------- */

// 请求头不分大小写，但 JS 对象分 —— 所以统一转小写后找一遍
function readHeader(event, name) {
  const headers = (event && event.headers) || {};
  const want = String(name).toLowerCase();
  const hit = Object.keys(headers).filter(function (k) {
    return String(k).toLowerCase() === want;
  })[0];
  return hit ? String(headers[hit]) : '';
}

/* 定长比较。不用 === 是因为字符串比较会"遇到第一个不同的字符就返回"，
   理论上能靠耗时差一个字符一个字符地试出口令。timingSafeEqual 把时间做成常量。
   （口令本身很短，这个防护在本项目里属于"顺手做对"，不是生死线。） */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) { return false; }
  try { return crypto.timingSafeEqual(ba, bb); } catch (e) { return false; }
}

function assertAdmin(event) {
  // 与 CLOUDBASE_API_KEY 同样的套路：环境变量没配，先把原因说清楚，
  // 别让调用者对着一句"口令不对"猜半天。
  if (!ADMIN_TOKEN) {
    throw httpError(500, 'internal_error',
      '云函数没读到环境变量 ADMIN_TOKEN（写接口的口令），请到函数配置里补上 / Missing ADMIN_TOKEN');
  }
  const given = readHeader(event, 'x-admin-token');
  if (!given) {
    throw httpError(401, 'unauthorized',
      '这条接口是策展端用的，请求头要带 X-Admin-Token / Missing X-Admin-Token header');
  }
  if (!safeEqual(given, ADMIN_TOKEN)) {
    throw httpError(401, 'unauthorized', '管理口令不对 / Invalid admin token');
  }
}

/* ---------- 5.2 请求体 ---------- */

function parseJsonBody(event) {
  const ev = event || {};
  let raw = ev.body;

  if (raw === undefined || raw === null || String(raw) === '') {
    throw httpError(400, 'bad_request', '请求体是空的，需要一段 JSON / Empty request body');
  }
  // 网关在传二进制时会把 body 做 base64。我们的请求体永远是文本，
  // 但真发生了也要能读出来，否则会报成"不是合法 JSON"，指向错误的方向。
  if (ev.isBase64Encoded) {
    raw = Buffer.from(String(raw), 'base64').toString('utf8');
  }
  if (Buffer.byteLength(String(raw), 'utf8') > MAX_BODY_BYTES) {
    throw httpError(400, 'bad_request',
      '请求体太大（上限 ' + MAX_BODY_BYTES + ' 字节）/ Request body too large');
  }
  try {
    return JSON.parse(String(raw));
  } catch (e) {
    throw httpError(400, 'bad_request', '请求体不是合法 JSON / Malformed JSON');
  }
}

/* ---------- 5.3 校验：错误一次报全，而且用中文 ---------- */

// 三段正文是 TEXT，没有列宽。但仍要有个上限，不然一段畸形输入能撑爆请求体。
const BLOCK_MAX_CHARS = 8000;

/* 从 region.zh 反推省级 slug。

   ★ 为什么不让调用者直接传 region_slug：
     地区索引页的"广西 1 道"和"点进广西筛出 1 道"，靠的是**同一个**
     region_slug 等值比较（契约 §3.4 的告警）。如果 slug 由调用者自由填，
     他写成 guangxi 而 region.zh 写成「贵州贵阳」，索引和筛选立刻就打架，
     用户一眼就能看出网站不可信。所以 slug 由服务端从地名推，
     slug 与中文地名**不允许各说各话**。

   规则和 db/tools/make-seed.py 的 region_of_dish() 逐字一致：
   中文地名**以省名开头**即命中。 */
function matchRegionSlug(regionZh, regionRows) {
  if (!regionZh) { return ''; }
  for (let i = 0; i < regionRows.length; i += 1) {
    const r = regionRows[i] || {};
    if (r.name_zh && regionZh.indexOf(String(r.name_zh)) === 0) { return r.slug; }
  }
  return '';
}

/* ---------- 校验用的两个小工具（POST 与 PATCH 共用，Day 22 提出来） ---------- */

function text(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}

/* 双语字段一律成对（契约 §1.2）。少一个键，前端 bilingual() 会渲染出一行空白，
   所以"只给中文"这种输入必须在门口就被挡掉，不能等页面上去发现。
   错误推进调用方给的 errors 数组 —— 一次报全，而不是修一个报一个。
   （Day 22 加 PATCH 时把这段从 validateNewDish 里提了出来：两个接口必须
     用**同一套**双语文案与列宽规则，抄一份必然漂移。） */
function pairText(container, label, maxZh, maxEn, errors) {
  const c = (container && typeof container === 'object' && !Array.isArray(container)) ? container : {};
  const zh = text(c.zh);
  const en = text(c.en);
  if (!zh) { errors.push(label + ' 缺中文（.zh）'); }
  if (!en) { errors.push(label + ' 缺英文（.en）'); }
  if (zh && zh.length > maxZh) { errors.push(label + '.zh 太长（' + zh.length + ' 字符，上限 ' + maxZh + '）'); }
  if (en && en.length > maxEn) { errors.push(label + '.en 太长（' + en.length + ' 字符，上限 ' + maxEn + '）'); }
  return { zh: zh, en: en };
}

/* 把一段请求体变成一个"可以进库的行"。纯函数：不碰网络、不读环境变量，
   所以 tests/api-shape.test.js 能离线把每一条校验都跑一遍。
   校验不过就一次把所有问题列出来（而不是修一个报一个）。 */
function validateNewDish(body, regionRows, nextSortOrder) {
  const errors = [];
  const src = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {};

  function pair(container, label, maxZh, maxEn) {
    return pairText(container, label, maxZh, maxEn, errors);
  }

  // ① id：必填 + 白名单（它同时也是主键、也是过滤表达式里的一环）
  const id = text(src.id);
  if (!id) {
    errors.push('id 不能为空（小写英文短名，如 guilin-mifen）');
  } else if (!ID_RE.test(id)) {
    errors.push('id「' + id.slice(0, 40) + '」不合法：只能用小写字母、数字和连字符，以字母或数字开头');
  }

  // ② 四组双语字段
  const name = pair(src.name, '菜名 name', MAX_LEN.name_zh, MAX_LEN.name_en);
  const tagline = pair(src.tagline, '一句话卖点 tagline', MAX_LEN.tagline_zh, MAX_LEN.tagline_en);
  const region = pair(src.region, '地区 region', MAX_LEN.region_zh, MAX_LEN.region_en);

  // ③ 地区必须真实存在（否则外键会报错，报错还看不懂）
  const regionSlug = matchRegionSlug(region.zh, regionRows || []);
  if (region.zh && !regionSlug) {
    errors.push('地区 region.zh「' + region.zh.slice(0, 30) +
      '」不以任何省级行政区名开头，推不出 region_slug（正确写法如「广西柳州」）');
  }

  // ④ status：给值就只能是这两个；不给默认 draft
  //    ★ 默认 draft 是有意的：PRD §9 第 8 条说"未核实的内容不上线"，
  //      新写进来的一条天然还没核实过。
  const status = text(src.status) || 'draft';
  if (status !== 'published' && status !== 'draft') {
    errors.push('status 只能是 published 或 draft，收到「' + status.slice(0, 20) + '」');
  }

  // ⑤ 三段正文：可以不给（先建个骨架），但一旦给了就要双语成对
  const blocksSrc = (src.blocks && typeof src.blocks === 'object' && !Array.isArray(src.blocks)) ? src.blocks : {};
  const blocks = {};
  ['origin', 'story', 'technique'].forEach(function (key) {
    const label = { origin: '起源 origin', story: '故事 story', technique: '做法 technique' }[key];
    const raw = blocksSrc[key];
    if (raw === undefined || raw === null) {
      blocks[key] = { zh: '', en: '' };
      return;
    }
    blocks[key] = pair(raw, '正文 ' + label, BLOCK_MAX_CHARS, BLOCK_MAX_CHARS);
  });

  // ⑥ status=published 时三段正文不能是空的。
  //    这条是**跨字段**的规则，数据库的列定义表达不了（每列都只是 NOT NULL），
  //    只能在应用层判 —— 正好说明"库层约束"和"业务规则"是两件事。
  if (status === 'published') {
    ['origin', 'story', 'technique'].forEach(function (key) {
      const label = { origin: '起源', story: '故事', technique: '做法' }[key];
      if (!blocks[key].zh || !blocks[key].en) {
        errors.push('status=published 时「' + label + '」三段正文必须双语齐全');
      }
    });
  }

  // ⑦ 别名：可选。列表里同一个别名重复给，只是重复数据，去重即可（不报错）；
  //    单个过长或归一化后成空串的，报错——后者会让这条搜索永远命中不了。
  const rawAliases = Array.isArray(src.aliases) ? src.aliases : [];
  const aliasSeen = {};
  const aliases = [];
  rawAliases.forEach(function (a) {
    const s = text(a);
    if (!s) { return; }
    if (aliasSeen[s]) { return; }
    aliasSeen[s] = true;
    if (s.length > MAX_LEN.alias) {
      errors.push('别名「' + s.slice(0, 20) + '…」太长（' + s.length + ' 字符，上限 ' + MAX_LEN.alias + '）');
      return;
    }
    if (!normalize(s)) {
      errors.push('别名「' + s.slice(0, 20) + '」去掉符号后是空的，搜不到任何东西');
      return;
    }
    aliases.push(s);
  });

  /* ⑧ search_text：派生列，不进接口响应，但决定这道菜搜不搜得到。
     组成规则与 db/tools/make-seed.py 逐字一致：
       归一化后的  id | 中文名 | 英文名 | 中文地名 | 英文地名
     用 '|' 分隔，是因为归一化规则不会去掉它 —— 这样「甘肃」不会
     跨字段匹配到别的字段的尾巴上（前端逐字段 indexOf，天然不会跨字段）。 */
  const searchText = [id, name.zh, name.en, region.zh, region.en]
    .map(function (s) { return normalize(s); })
    .join('|');
  if (searchText.length > MAX_LEN.search_text) {
    errors.push('派生列 search_text 太长（' + searchText.length + ' 字符，上限 ' + MAX_LEN.search_text +
      '）：名字和地名合起来太长了');
  }

  if (errors.length) {
    throw httpError(400, 'bad_request',
      '提交的数据有 ' + errors.length + ' 个问题：' + errors.join('；'));
  }

  /* 图片这一组 12 列今天一律留空。
     理由：图片要先解决"存哪儿"（现在是境外图床，国内取不到，见项目待办）。
     把上传和写库混在一天做，两边都容易半成品。契约里记为"本期不支持"。 */
  return {
    row: {
      id: id,
      status: status,
      name_zh: name.zh,
      name_en: name.en,
      region_slug: regionSlug,
      region_zh: region.zh,
      region_en: region.en,
      tagline_zh: tagline.zh,
      tagline_en: tagline.en,
      block_origin_zh: blocks.origin.zh,
      block_origin_en: blocks.origin.en,
      block_story_zh: blocks.story.zh,
      block_story_en: blocks.story.en,
      block_technique_zh: blocks.technique.zh,
      block_technique_en: blocks.technique.en,
      note_zh: null,
      note_en: null,
      image_thumb_url: null,
      image_thumb_width: null,
      image_thumb_height: null,
      image_hero_url: null,
      image_hero_width: null,
      image_hero_height: null,
      image_alt_zh: null,
      image_alt_en: null,
      image_credit_author: null,
      image_credit_license: null,
      image_credit_license_url: null,
      image_credit_page: null,
      search_text: searchText,
      sort_order: nextSortOrder
    },
    aliases: aliases
  };
}

/* ---------- 5.3b PATCH 的校验：只验"这次真传了的字段"（Day 22） ----------

   与 validateNewDish 的关系是「同一套规则，不同的门槛」：

     POST  必须给全（id / 名字 / 地区 / 卖点），因为它要造出整行；
     PATCH 只校验这次真传了的字段，没传的一律不碰 —— 这正是 PATCH 与 PUT 的区别。

   ★ 一个只有 PATCH 才有的难点：**跨字段规则必须看"合并后的状态"。**
     「status=published 时三段正文要齐全」这条，光看请求体是不够的 ——
     请求体可能只有 {"status":"published"}，三段正文正躺在库里。
     所以调用方要把**库里现有那一行**（current）一起传进来，按合并结果判。
     POST 没有这个问题：它一次给全，规则只看请求体就成立。

   返回 { patch, aliases, touched }：
     patch   —— 要写进 dishes 的列（只含改动到的）
     aliases —— null = 没动别名；数组（含空数组）= 整组替换成这个
     touched —— 改了哪些字段，给日志和响应回执用 */
function validateDishPatch(body, regionRows, current) {
  const errors = [];
  const src = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {};
  const cur = current || {};
  const keys = Object.keys(src).filter(function (k) { return src[k] !== undefined; });

  // ① 主键不可改。它不是"嫌麻烦"，是"旧链接会全部失效"（契约 §4 那条备注）。
  if (keys.indexOf('id') !== -1) {
    errors.push('id 不能改：它是主键，也是卡片页地址 #/dish/{id} 的一部分，改了旧链接全部失效');
  }

  // ② 只认这几样。派生列（search_text / sort_order）和图片列都不接受直接传 ——
  //    前者由服务端算，后者本期不支持传图（与 POST 同一口径）。
  const ALLOWED = ['status', 'name', 'region', 'tagline', 'blocks', 'aliases', 'id'];
  keys.forEach(function (k) {
    if (ALLOWED.indexOf(k) === -1) {
      errors.push('不认识的字段「' + String(k).slice(0, 24) +
        '」（可改的是 status / name / region / tagline / blocks / aliases）');
    }
  });

  // ③ 一个字段都不给 = 没法执行。与其回一句"成功但什么也没做"，不如说清楚。
  if (!keys.length) {
    errors.push('请求体里没有任何字段（PATCH 只改你传的字段，至少得给一个）');
  }

  function pair(container, label, maxZh, maxEn) {
    return pairText(container, label, maxZh, maxEn, errors);
  }

  // ④ 三组双语字段：传了才验，规则与 POST 完全一致（同一个 pairText）
  let name = null, tagline = null, region = null;
  if ('name' in src) { name = pair(src.name, '菜名 name', MAX_LEN.name_zh, MAX_LEN.name_en); }
  if ('tagline' in src) { tagline = pair(src.tagline, '一句话卖点 tagline', MAX_LEN.tagline_zh, MAX_LEN.tagline_en); }
  if ('region' in src) { region = pair(src.region, '地区 region', MAX_LEN.region_zh, MAX_LEN.region_en); }

  // ⑤ 地区改了 → slug 跟着重推。不能让"地名"和"slug"各说各话（理由同 POST）。
  let regionSlug = '';
  if (region) {
    regionSlug = matchRegionSlug(region.zh, regionRows || []);
    if (region.zh && !regionSlug) {
      errors.push('地区 region.zh「' + region.zh.slice(0, 30) +
        '」不以任何省级行政区名开头，推不出 region_slug（正确写法如「广西柳州」）');
    }
  }

  // ⑥ status：给值就只能是这两个
  let status = '';
  if ('status' in src) {
    status = text(src.status);
    if (status !== 'published' && status !== 'draft') {
      errors.push('status 只能是 published 或 draft，收到「' + status.slice(0, 20) + '」');
    }
  }

  // ⑦ blocks：给哪几段就验哪几段
  let blocks = null;
  if ('blocks' in src) {
    const bs = (src.blocks && typeof src.blocks === 'object' && !Array.isArray(src.blocks)) ? src.blocks : {};
    blocks = {};
    ['origin', 'story', 'technique'].forEach(function (key) {
      const label = { origin: '起源 origin', story: '故事 story', technique: '做法 technique' }[key];
      if (!(key in bs) || bs[key] === undefined) { return; } // 这段没传 → 不动它
      blocks[key] = pair(bs[key], '正文 ' + label, BLOCK_MAX_CHARS, BLOCK_MAX_CHARS);
    });
    if (!Object.keys(blocks).length) {
      errors.push('blocks 里没有 origin / story / technique 任何一段');
    }
  }

  const BLOCK_COLS = {
    origin:    ['block_origin_zh',    'block_origin_en'],
    story:     ['block_story_zh',     'block_story_en'],
    technique: ['block_technique_zh', 'block_technique_en']
  };

  /* ⑧ ★ 跨字段：按"合并后"的状态判（PATCH 独有的难点，见函数头注释）。
     每段正文有两个来源 —— 这次改的（blocks）或库里原有的（cur）。 */
  const finalStatus = status || text(cur.status) || 'draft';
  if (finalStatus === 'published') {
    ['origin', 'story', 'technique'].forEach(function (key) {
      const label = { origin: '起源', story: '故事', technique: '做法' }[key];
      const zh = (blocks && blocks[key]) ? blocks[key].zh : text(cur[BLOCK_COLS[key][0]]);
      const en = (blocks && blocks[key]) ? blocks[key].en : text(cur[BLOCK_COLS[key][1]]);
      if (!zh || !en) {
        errors.push('status=published 时「' + label + '」三段正文必须双语齐全（这次没给，库里也是空的）');
      }
    });
  }

  // ⑨ aliases：传了就是**整组替换**（数组语义上不叫"追加"）
  let aliases = null;
  if ('aliases' in src) {
    if (!Array.isArray(src.aliases)) {
      errors.push('aliases 必须是数组（整组替换；想清空就给空数组 []）');
    } else {
      const seen = {};
      const list = [];
      src.aliases.forEach(function (a) {
        const s = text(a);
        if (!s || seen[s]) { return; }
        seen[s] = true;
        if (s.length > MAX_LEN.alias) {
          errors.push('别名「' + s.slice(0, 20) + '…」太长（' + s.length + ' 字符，上限 ' + MAX_LEN.alias + '）');
          return;
        }
        if (!normalize(s)) {
          errors.push('别名「' + s.slice(0, 20) + '」去掉符号后是空的，搜不到任何东西');
          return;
        }
        list.push(s);
      });
      aliases = list;
    }
  }

  // ⑩ 组装要写的列
  const patch = {};
  const touched = [];
  if (status) { patch.status = status; touched.push('status'); }
  if (name) {
    patch.name_zh = name.zh; patch.name_en = name.en; touched.push('name');
  }
  if (region) {
    patch.region_slug = regionSlug; patch.region_zh = region.zh; patch.region_en = region.en;
    touched.push('region');
  }
  if (tagline) {
    patch.tagline_zh = tagline.zh; patch.tagline_en = tagline.en; touched.push('tagline');
  }
  if (blocks) {
    Object.keys(blocks).forEach(function (key) {
      patch[BLOCK_COLS[key][0]] = blocks[key].zh;
      patch[BLOCK_COLS[key][1]] = blocks[key].en;
    });
    touched.push('blocks');
  }

  /* ⑪ search_text 是派生列：只要动了参与拼装的那四样（id|name|region）就要重算。
     id 不可改，所以触发条件是 name 或 region。规则与 make-seed.py 逐字一致 ——
     漏算的后果很隐蔽：改了名字，页面却搜不到新名字。 */
  if (name || region) {
    patch.search_text = [
      cur.id,
      name ? name.zh : cur.name_zh,
      name ? name.en : cur.name_en,
      region ? region.zh : cur.region_zh,
      region ? region.en : cur.region_en
    ].map(function (s) { return normalize(s); }).join('|');
    if (patch.search_text.length > MAX_LEN.search_text) {
      errors.push('派生列 search_text 太长（' + patch.search_text.length + ' 字符，上限 ' + MAX_LEN.search_text + '）');
    }
    touched.push('search_text');
  }

  if (errors.length) {
    throw httpError(400, 'bad_request',
      '提交的数据有 ' + errors.length + ' 个问题：' + errors.join('；'));
  }

  return { patch: patch, aliases: aliases, touched: touched };
}

/* ---------- 5.4 一次新增：口令 → 校验 → 写库 → 读回 ---------- */

async function handleCreateDish(event) {
  const startedAt = Date.now();
  assertAdmin(event);
  const body = parseJsonBody(event);

  /* 先要两样东西：
     ① 34 个省的 slug / 中文名 —— 用来把 region.zh 反推成 region_slug；
     ② 当前最大的 sort_order —— 新菜排在列表最后。
     两件互不依赖，并发取。 */
  const prep = await Promise.all([
    restGet('regions', [['select', 'slug,name_zh'], ['order', 'group_order.asc,sort_order.asc']], { count: false }),
    restGet('dishes', [['select', 'sort_order'], ['order', 'sort_order.desc'], ['limit', '1']], { count: false })
  ]);
  const nextSortOrder = prep[1].rows.length
    ? Number(prep[1].rows[0].sort_order) + 1
    : 1;

  // 校验不过会在这里抛 400，一句中文把问题列全 —— 还没碰数据库
  const checked = validateNewDish(body, prep[0].rows, nextSortOrder);

  /* 真正防重复提交的是这一句：dishes 的主键是 id。
     不在 JS 里"先查有没有再插" —— 那是典型的两步之间的竞态
     （两个请求同时查到"没有"，然后都插入）。让库来挡，是唯一可靠的做法。 */
  const inserted = await restInsert('dishes', checked.row);

  /* 别名落在 dish_aliases，主键是 (dish_id, alias)，同样由库挡重复。

     ⚠️ 已知限制：PostgREST 是"一张表一次 HTTP 调用"，跨表没有事务。
        万一别名这一步失败，会留下一行"主表写了、别名没写"的菜。
        本期量级（我们自己偶尔加菜）不值得为它上事务，记在契约的待办里。 */
  if (checked.aliases.length) {
    await restInsert('dish_aliases', checked.aliases.map(function (a, i) {
      return {
        dish_id: checked.row.id,
        alias: a,
        alias_norm: normalize(a),
        sort_order: i + 1
      };
    }));
  }

  /* 读回：**故意**复用读详情那条代码路径（handleDishDetail），
     而不是把请求体原样回显。两个好处：
       ① 返回的形状与 GET /api/dishes/{id} 天然一模一样，前端拿到就能渲染；
       ② 返回值里带的是**库里真正存下来的东西**——如果写入时被截断或被
          约束改写，读回立刻就能看出来，不用等页面上去发现。 */
  const dish = await handleDishDetail(checked.row.id);

  /* 一条服务端日志（清单的"余力加练"）。
     它解决的是"线上出问题时手里什么都没有"：云函数的 console 会进控制台的
     日志页，所以"这一笔到底有没有跑进来"不用靠猜。
     ★ 只记 id / status / 地区 / 条数 / 耗时 —— **绝不记请求头、绝不记口令**。
       日志本身也是数据，写日志时就要问一句"它泄露了什么"。 */
  console.log('[xunwei] 新增菜品 id=' + checked.row.id +
    ' status=' + checked.row.status +
    ' region_slug=' + checked.row.region_slug +
    ' 别名=' + checked.aliases.length + ' 条' +
    ' 耗时=' + (Date.now() - startedAt) + 'ms');

  return {
    dish: dish,
    written: {
      dishId: checked.row.id,
      sortOrder: nextSortOrder,
      aliasCount: checked.aliases.length,
      returnedRows: inserted.rows.length
    }
  };
}

/* ---------- 5.5 一次修改：口令 → 读现状 → 校验 → 写库 → 读回（Day 22） ----------

   PATCH 比 POST 多一次"读"：跨字段规则（published 要三段齐全）和派生列重算
   （search_text）都需要知道**库里现在是什么样**。
   这次读同时兼任 404 检查，不用多问一次。 */
async function handleUpdateDish(event, rawId) {
  const startedAt = Date.now();
  assertAdmin(event);
  const body = parseJsonBody(event);
  const id = readId(rawId); // 与 GET 详情同一条白名单，非法 id 直接 400

  // ① 读现状，顺带当 404 检查：改一道不存在的菜，不该悄悄"成功"。
  const found = await restGet('dishes', [['select', COLS_DISH], ['id', 'eq.' + id], ['limit', '1']], { count: false });
  if (!found.rows.length) {
    throw httpError(404, 'not_found', '没有这道菜，改不了 / Dish not found');
  }
  const current = found.rows[0];

  /* ② 地区表只在"这次真要改地区"时才取 —— 不改地区的 PATCH 不该为它多等一次网络。
     纯粹是省时间：少一次串行请求，响应大致快一倍。 */
  let regionRows = [];
  if (body && typeof body === 'object' && body.region !== undefined) {
    regionRows = (await restGet('regions',
      [['select', 'slug,name_zh'], ['order', 'group_order.asc,sort_order.asc']], { count: false })).rows;
  }

  // ③ 校验（不过就 400，一次把问题报全；此时还没碰过数据库）
  const checked = validateDishPatch(body, regionRows, current);

  /* ④ 写主表。过滤条件是 id=eq.xxx —— 少了它就会改整张表，
     所以 db.js 的 restUpdate 见到空过滤条件会直接抛错（那层保护不靠这里写对）。 */
  const updated = await restUpdate('dishes', [['id', 'eq.' + id]], checked.patch);

  /* ⑤ 别名住在另一张表。传了 aliases 就是"整组替换"：先删旧的、再插新的。
     ⚠️ 与 POST 同样的已知限制：两张表之间没有事务，
        万一"插新别名"失败，会短暂处于"别名被清空"的状态。记在契约待办里。 */
  if (checked.aliases !== null) {
    await restDelete('dish_aliases', [['dish_id', 'eq.' + id]]);
    if (checked.aliases.length) {
      await restInsert('dish_aliases', checked.aliases.map(function (a, i) {
        return { dish_id: id, alias: a, alias_norm: normalize(a), sort_order: i + 1 };
      }));
    }
  }

  // ⑥ 读回：与 POST 一样**故意**复用详情那条路径 —— 返回的是"库里真正存下来的样子"。
  const dish = await handleDishDetail(id);

  console.log('[xunwei] 修改菜品 id=' + id +
    ' 改了=' + checked.touched.join(',') +
    (checked.aliases !== null ? ' 别名=' + checked.aliases.length + ' 条(整组替换)' : '') +
    ' 写回行数=' + updated.rows.length +
    ' 耗时=' + (Date.now() - startedAt) + 'ms');

  return {
    dish: dish,
    changed: {
      dishId: id,
      touched: checked.touched,
      aliasesReplaced: checked.aliases !== null,
      returnedRows: updated.rows.length
    }
  };
}

/* ---------- 5.6 一次删除：口令 → 确认 → 删（级联）→ 回执（Day 22） ----------

   ★ 删除是本期唯一**不可逆**的操作，所以它比别的接口多一道确认。

   确认为什么放在 URL 而不是"多问一次"？
     一次 HTTP 调用就是一次决定，接口没法"再问一遍"。
     所以把确认做成**必须显式写出来的参数**：?confirm=<同一个 id>。
     它防的不是坏人（口令在做那件事），而是**手滑**：
     把 /api/dishes/luosifen 误敲成 /api/dishes/luosilef 时，
     请求会先失败在"确认参数与路径 id 对不上"，而不是安静地删掉另一道菜。
     —— 这就是今天要回答的"你在哪加了确认"。 */
async function handleDeleteDish(event, rawId, query) {
  const startedAt = Date.now();
  assertAdmin(event);
  const id = readId(rawId);

  const confirm = String((query && query.confirm) || '').trim();
  if (!confirm) {
    throw httpError(400, 'bad_request',
      '删除不可逆，必须显式确认：地址里带上 ?confirm=' + id +
      '（值与路径里的 id 完全一致）/ Deleting is irreversible, add ?confirm=' + id);
  }
  if (confirm !== id) {
    throw httpError(400, 'bad_request',
      '确认参数与要删的 id 不一致：路径是「' + id + '」，confirm 是「' + confirm.slice(0, 40) +
      '」。已拒绝，什么都没删 / confirm does not match the id in the path, nothing was deleted');
  }

  /* 删主表。子表（别名 / 事实 / 出处 / 事实-出处）由外键 ON DELETE CASCADE
     自动带走 —— 不需要我们手写四条 DELETE，也就不会出现"删到一半"的中间状态
     （级联与主表删除在同一个事务里完成）。

     ★ 用 return=representation 一次拿到"删掉的那一行"，而不是"先查一遍、再删"：
       后者两次调用之间那道缝里，数据可能已经变了。 */
  const deleted = await restDelete('dishes', [['id', 'eq.' + id]]);

  if (!deleted.rows.length) {
    /* 删不存在的菜 → 404，而不是"200 成功"。
       ★ 这个区别对 DELETE 尤其要紧：第二次删同一个 id 时，
         回 200 会让人分不清"删成功了"还是"本来就没有"。404 说得清。 */
    throw httpError(404, 'not_found', '没有这道菜，没删任何东西 / Dish not found, nothing was deleted');
  }

  const row = deleted.rows[0];

  console.log('[xunwei] 删除菜品 id=' + id +
    ' name_zh=' + String(row.name_zh || '') +
    ' region_slug=' + String(row.region_slug || '') +
    ' 级联=别名/事实/出处已由外键 CASCADE 带走' +
    ' 耗时=' + (Date.now() - startedAt) + 'ms');

  return {
    deleted: {
      id: row.id,
      name: { zh: row.name_zh, en: row.name_en },
      region: { zh: row.region_zh, en: row.region_en },
      status: row.status,
      returnedRows: deleted.rows.length
    },
    cascade: '这道菜的别名、事实、出处及其关联已由数据库外键 ON DELETE CASCADE 一并删除（不可恢复）'
  };
}

/* =========================================================
   五、路由与响应包壳
   ========================================================= */

/* 云开发 HTTP 网关会把请求转成一个 event，形状是：
     { path, httpMethod, headers, queryStringParameters, body, isBase64Encoded }
   路由是**前缀匹配**的，所以配一条 /api 就能收到 /api/dishes/xxx。
   但前缀之后的那一段能不能拿到，取决于这条路由有没有开「路径透传」——
   开了 event.path 就是完整路径；没开就只有 /api。
   下面把 /api 前缀去掉，剩下什么就按什么分派；
   如果去掉后是空的，就返回接口目录（这也是"没开路径透传"最直观的信号）。 */
function resolveRoute(event) {
  const ev = event || {};
  let raw = ev.path;
  if (!raw && ev.requestContext && ev.requestContext.path) { raw = ev.requestContext.path; }
  raw = String(raw || '/');

  let route = raw;
  if (route.indexOf('/api/') === 0) { route = route.slice(4); }
  else if (route === '/api') { route = '/'; }
  if (route.charAt(0) !== '/') { route = '/' + route; }
  if (route.length > 1 && route.charAt(route.length - 1) === '/') { route = route.slice(0, -1); }
  return route;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  // 内容会随收录增加而变，本期不值得设计缓存策略（契约 §1.5）
  'Cache-Control': 'no-store',
  // 前端在静态托管域名上、接口在云函数域名上，两个域名不同源 ⇒ 必须允许跨域。
  // 读接口公开、不带 Cookie；写接口靠 X-Admin-Token 这个请求头自证身份，
  // 不依赖 Cookie，所以 * 依然是安全的（浏览器不会自动带上 X-Admin-Token）。
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token'
};

function reply(statusCode, payload) {
  return { statusCode: statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) };
}

function ok(data) {
  return reply(200, { ok: true, data: data });
}

function fail(status, code, message) {
  return reply(status, { ok: false, error: { code: code, message: message } });
}

// 根路径的接口目录。它同时干三件事：给人看有哪些接口；给调试用——
// 如果你打开 /api/dishes 却看到这份目录，说明那条路由没把后面的路径透传进来；
// 顺手把"写接口要带口令"写在明处，免得别人对着 401 猜。
function endpointIndex() {
  return {
    service: 'xunwei',
    note: '寻味接口：四条公开只读（GET）+ 三条策展端写接口（新增 POST / 修改 PATCH / 删除 DELETE，' +
          '都要 X-Admin-Token）。详见 api-contract.md §3 与 §6。',
    endpoints: [
      { method: 'GET', path: '/api/dishes', desc: '列表：q 关键词 / region 省级短名 / status / limit / offset' },
      { method: 'GET', path: '/api/dishes/{id}', desc: '卡片：一道菜的完整内容，如 /api/dishes/luosifen' },
      { method: 'GET', path: '/api/regions', desc: '地区索引：34 个省级行政区 + 每省已收录几道' },
      { method: 'POST', path: '/api/dishes', desc: '新增一道菜（策展端，请求头需 X-Admin-Token）' },
      { method: 'PATCH', path: '/api/dishes/{id}', desc: '修改一道菜（策展端，只改你传的字段；id 不可改）' },
      { method: 'DELETE', path: '/api/dishes/{id}?confirm={id}', desc: '删除一道菜（策展端，必须带 confirm 确认；子表由外键级联删除）' }
    ]
  };
}

exports.main = async function (event) {
  try {
    const method = String((event && event.httpMethod) || 'GET').toUpperCase();

    // 浏览器的跨域预检：直接放行，不进业务逻辑
    if (method === 'OPTIONS') { return { statusCode: 204, headers: JSON_HEADERS, body: '' }; }

    // ★ 先查密钥。没配的话，后面每一步都会以"网关 401"的样子失败，
    //   而真正的原因是环境变量没填 —— 这里提前把它说清楚。
    //   （写接口那条还会再查一次 ADMIN_TOKEN，见 assertAdmin。）
    if (!API_KEY) {
      return fail(500, 'internal_error',
        '云函数没读到环境变量 CLOUDBASE_API_KEY，请到云函数配置里补上 / Missing CLOUDBASE_API_KEY');
    }

    const route = resolveRoute(event);
    const query = (event && event.queryStringParameters) || {};

    // ---- 写接口：POST /api/dishes（Day 18）、PATCH|DELETE /api/dishes/{id}（Day 22）----
    if (method === 'POST') {
      if (route === '/dishes') {
        // 201 Created：语义上"新资源建好了"。响应体形状仍遵守契约 §1.4 的
        // {ok:true,data:{...}}，只是多了一个"确实建成了"的状态码。
        return reply(201, { ok: true, data: await handleCreateDish(event) });
      }
      return fail(405, 'method_not_allowed',
        'POST 只支持 /api/dishes（新增一道菜）/ POST is only supported on /api/dishes');
    }

    /* 改与删都作用在"某一道菜"上，所以都要求路径里带 id。
       打在集合路径（/api/dishes）上不给做 —— 那等于"改全部 / 删全部"，
       正是 db.js 那道空过滤保护要挡的事；
       这里在路由层先拦住，报错更早，也更容易看懂。 */
    if (method === 'PATCH' || method === 'DELETE') {
      const target = /^\/dishes\/(.+)$/.exec(route);
      if (!target) {
        return fail(405, 'method_not_allowed',
          method + ' 必须作用在具体的一道菜上：/api/dishes/{id}（不支持对 /api/dishes 整体操作）/ ' +
          method + ' requires a dish id in the path');
      }
      const targetId = decodeURIComponent(target[1]);
      if (method === 'PATCH') {
        return ok(await handleUpdateDish(event, targetId));
      }
      return ok(await handleDeleteDish(event, targetId, query));
    }

    if (method !== 'GET') {
      // 其余方法（PUT 等）一律不给，说清楚而不是含糊 404
      return fail(405, 'method_not_allowed',
        '这个接口只支持 GET；新增用 POST /api/dishes，修改用 PATCH /api/dishes/{id}，' +
        '删除用 DELETE /api/dishes/{id}?confirm={id} / Only GET is supported here');
    }

    if (route === '/') { return ok(endpointIndex()); }
    if (route === '/dishes') { return ok(await handleDishes(query)); }
    if (route === '/regions') { return ok(await handleRegions()); }

    const detail = /^\/dishes\/(.+)$/.exec(route);
    if (detail) {
      const dish = await handleDishDetail(decodeURIComponent(detail[1]));
      if (!dish) {
        // ★ 必须是 404 而不是 500：前端对这两种情况画的是两个不同画面
        //   （「没找到这道菜」可点"看全部" vs「读取失败」可点"重试"）
        return fail(404, 'not_found', '没有这道菜 / Dish not found');
      }
      return ok(dish);
    }

    return fail(404, 'not_found', '没有这个接口 / Unknown endpoint，收到的 path 是「' + String((event && event.path) || '') + '」');
  } catch (err) {
    /* 失败也要留痕，而且要分得开：
       4xx 是"调用者给错了"（去看请求体），5xx 是"我们这边坏了"（去看代码和配置）。
       排查时这两类要翻的完全不是同一个地方，混在一条日志里等于没记。 */
    if (err && err.status) {
      console.log('[xunwei] 拒绝 ' + err.status + ' ' + err.code + '：' + err.message);
      return fail(err.status, err.code, err.message);
    }
    console.error('[xunwei] 服务端异常：' + ((err && err.stack) || String(err)));
    return fail(500, 'internal_error', '服务端异常 / Internal error：' + ((err && err.message) || String(err)));
  }
};

/* 给本地自测用：tests/api-shape.test.js 直接 require 这个文件，
   拿这几个纯函数验"行 → JSON"的映射对不对，不用连库。
   （只多一个导出，不影响云函数本身的调用方式。）
   Day 18 后加进来的这一组，验的是写接口的校验与报错翻译 —— 同样不连库。 */
exports.__internals = {
  normalize: normalize,
  mapDishSummary: mapDishSummary,
  mapDishDetail: mapDishDetail,
  mapImageSummary: mapImageSummary,
  mapImageDetail: mapImageDetail,
  resolveRoute: resolveRoute,
  parseTotal: parseTotal,
  readInt: readInt,
  readId: readId,
  endpointIndex: endpointIndex,
  validateNewDish: validateNewDish,
  validateDishPatch: validateDishPatch,
  matchRegionSlug: matchRegionSlug,
  gatewayError: gatewayError,
  parseJsonBody: parseJsonBody,
  readHeader: readHeader,
  safeEqual: safeEqual,
  MAX_LEN: MAX_LEN,
  BLOCK_MAX_CHARS: BLOCK_MAX_CHARS
};
