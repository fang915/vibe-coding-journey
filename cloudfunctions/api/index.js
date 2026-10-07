'use strict';

/* =========================================================
   寻味 / Xunwei —— 读接口云函数（Day 17 新增）

   四条路径，都在这一个云函数里：
     GET /api                  接口目录（用来一眼确认"路由到底通没通"）
     GET /api/dishes           列表：搜索 + 地区筛选 + 分页
     GET /api/dishes/{id}      卡片：一道菜的完整内容
     GET /api/regions          地区索引：34 个省级行政区 + 每省已收录几道

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
   ========================================================= */

const https = require('https');

/* ---------- 环境常量 ---------- */

// 环境 ID 允许被环境变量覆盖；没配就用本项目的。注意这只是 ID，不是密钥。
const ENV_ID = process.env.CLOUDBASE_ENV_ID || 'vibecodingstudy-d1f1el6a03d5aad8';
// ★ 密钥只从环境变量来。代码里永远不写明文 Key。
const API_KEY = process.env.CLOUDBASE_API_KEY || '';

const GATEWAY_HOST = ENV_ID + '.api.tcloudbasegateway.com';
const REST_PREFIX = '/v1/rdb/rest/';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const GATEWAY_TIMEOUT_MS = 8000;

// 菜品 id / 地区 slug 的白名单。两个都能进 PostgREST 的过滤表达式，
// 不校验就等于开了个注入点。
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

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
   一、和网关打交道
   ========================================================= */

/* 给查询参数编码。
   和普通 URL 编码的唯一区别：PostgREST 的过滤表达式里，
   逗号、点、冒号、括号属于**语法**而不是数据，编成 %2C 之类反而会被当成值。
   （★ 星号 encodeURIComponent 本来就不编，所以 like.*螺* 里的 * 是安全的。） */
function encodeValue(v) {
  return encodeURIComponent(String(v))
    .replace(/%2C/gi, ',')
    .replace(/%2E/gi, '.')
    .replace(/%3A/gi, ':')
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')');
}

// pairs 用数组而不是对象：PostgREST 的同一个键可以合法地出现多次，对象表达不了
function buildQueryString(pairs) {
  return pairs
    .map(function (p) { return encodeURIComponent(p[0]) + '=' + encodeValue(p[1]); })
    .join('&');
}

/* 向网关发一次 GET。返回 { rows, total }。
   total 来自响应头 Content-Range（形如 0-11/12，斜杠后面那个才是"符合条件的总行数"）——
   分页时它是取不到的：limit=5 时响应体只有 5 行，但 total 仍然是 12。 */
function restGet(table, pairs, options) {
  const opts = options || {};
  const wantCount = opts.count !== false;

  return new Promise(function (resolve, reject) {
    const qs = buildQueryString(pairs || []);
    const reqPath = REST_PREFIX + table + (qs ? '?' + qs : '');

    const headers = {
      Authorization: 'Bearer ' + API_KEY,
      Accept: 'application/json'
    };
    if (wantCount) { headers.Prefer = 'count=exact'; }

    const req = https.request({
      host: GATEWAY_HOST,
      path: reqPath,
      method: 'GET',
      headers: headers,
      timeout: GATEWAY_TIMEOUT_MS
    }, function (res) {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) { body += chunk; });
      res.on('end', function () {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          // 网关的报错原文很有信息量（比如权限不足会明说），带上前 300 字
          return reject(new Error('网关返回 HTTP ' + res.statusCode + '：' + body.slice(0, 300)));
        }
        let json;
        try {
          json = JSON.parse(body || '[]');
        } catch (e) {
          return reject(new Error('网关返回的不是 JSON：' + body.slice(0, 200)));
        }
        resolve({
          rows: Array.isArray(json) ? json : [json],
          total: parseTotal(res.headers['content-range'], Array.isArray(json) ? json.length : 1)
        });
      });
    });

    req.on('timeout', function () {
      req.destroy(new Error('请求网关超时（' + GATEWAY_TIMEOUT_MS + 'ms）'));
    });
    req.on('error', reject);
    req.end();
  });
}

// Content-Range: "0-11/12" → 12；"*/0" → 0；拿不到就退回本地行数
function parseTotal(contentRange, fallback) {
  if (!contentRange) { return fallback; }
  const m = /\/(\d+)\s*$/.exec(contentRange);
  return m ? Number(m[1]) : fallback;
}

/* =========================================================
   二、和用户输入打交道
   ========================================================= */

// ★ 必须与 js/app.js 的 normalize() 逐字符一致，否则会出现"页面搜得到、接口搜不到"
function normalize(text) {
  return String(text === null || text === undefined ? '' : text)
    .toLowerCase()
    .replace(/[\s·・\-_/（）()「」【】]/g, '');
}

// 这些错误会被 main 的 catch 认出来（带 status 的就是"我们自己判定的客户端错误"）
function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

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
   三、行 → 响应形状（这一步决定"前端要不要改代码"）
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
   四、三条路由各自怎么做
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
  // 这几条接口都是公开只读、不带 Cookie、不需要携带身份，所以 * 是安全的。
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
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

// 根路径的接口目录。它同时干两件事：给人看有哪些接口；给调试用——
// 如果你打开 /api/dishes 却看到这份目录，说明那条路由没把后面的路径透传进来。
function endpointIndex() {
  return {
    service: 'xunwei',
    note: '寻味读接口，全部是 GET，没有任何写接口（见 api-contract.md §6）',
    endpoints: [
      { path: '/api/dishes', desc: '列表：q 关键词 / region 省级短名 / status / limit / offset' },
      { path: '/api/dishes/{id}', desc: '卡片：一道菜的完整内容，如 /api/dishes/luosifen' },
      { path: '/api/regions', desc: '地区索引：34 个省级行政区 + 每省已收录几道' }
    ]
  };
}

exports.main = async function (event) {
  try {
    const method = String((event && event.httpMethod) || 'GET').toUpperCase();

    // 浏览器的跨域预检：直接放行，不进业务逻辑
    if (method === 'OPTIONS') { return { statusCode: 204, headers: JSON_HEADERS, body: '' }; }

    if (method !== 'GET') {
      return fail(405, 'bad_request', '这几条接口只支持 GET / Only GET is supported');
    }

    // ★ 先查密钥。没配的话，后面每一步都会以"网关 401"的样子失败，
    //   而真正的原因是环境变量没填 —— 这里提前把它说清楚。
    if (!API_KEY) {
      return fail(500, 'internal_error',
        '云函数没读到环境变量 CLOUDBASE_API_KEY，请到云函数配置里补上 / Missing CLOUDBASE_API_KEY');
    }

    const route = resolveRoute(event);
    const query = (event && event.queryStringParameters) || {};

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
    if (err && err.status) { return fail(err.status, err.code, err.message); }
    return fail(500, 'internal_error', '服务端异常 / Internal error：' + ((err && err.message) || String(err)));
  }
};

/* 给本地自测用：tests/api-shape.test.js 直接 require 这个文件，
   拿这几个纯函数验"行 → JSON"的映射对不对，不用连库。
   （只多一个导出，不影响云函数本身的调用方式。） */
exports.__internals = {
  normalize: normalize,
  mapDishSummary: mapDishSummary,
  mapDishDetail: mapDishDetail,
  mapImageSummary: mapImageSummary,
  mapImageDetail: mapImageDetail,
  resolveRoute: resolveRoute,
  parseTotal: parseTotal,
  readInt: readInt,
  readId: readId
};
