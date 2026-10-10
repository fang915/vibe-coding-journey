/* =========================================================
   寻味 / Xunwei —— 数据访问层（Day 19 从 index.js 拆出）

   这个文件只回答一个问题：「怎么和数据库（CloudBase 网关）说话」。
   它不知道什么叫"菜品列表"、不知道接口路径、不知道响应长什么样 ——
   那些是 index.js（业务层）的事；它也不认识用户输入 —— 校验在业务层做完，
   到这里的参数已经是干净的。

   拆这一层的收益（Day 19 的主题）：
     ① 改数据库相关的任何东西（超时、报错翻译、查询编码）只动这一个文件；
     ② index.js 不再 require('https')——业务代码里看不到一行网络请求；
     ③ 将来换数据源（比如直连 PG、或换存储），业务层一行不用改。

   ⚠️ 部署注意：这个文件必须和 index.js 在**同一个目录**里
     （cloudfunctions/api/db.js），index.js 用 require('./db.js') 找它。
   ========================================================= */

const https = require('https');

/* ---------- 环境常量 ---------- */

// 环境 ID 允许被环境变量覆盖；没配就用本项目的。注意这只是 ID，不是密钥。
const ENV_ID = process.env.CLOUDBASE_ENV_ID || 'vibecodingstudy-d1f1el6a03d5aad8';
// ★ 密钥只从环境变量来。代码里永远不写明文 Key。
const API_KEY = process.env.CLOUDBASE_API_KEY || '';

const GATEWAY_HOST = ENV_ID + '.api.tcloudbasegateway.com';
const REST_PREFIX = '/v1/rdb/rest/';

const GATEWAY_TIMEOUT_MS = 8000;

/* ---------- 跨层共用的错误类型 ---------- */

/* 带 status / code 的错误对象：main 的 catch 靠 err.status 认出
   "这是我们主动判定的错"（4xx），认不出的才按 500 处理。
   它原本住在 index.js，但 gatewayError 也要造这种错，
   于是搬进 db.js 统一定义、两层共用（Day 19 拆层时顺手理顺的依赖方向）。 */
function httpError(status, code, message, technical) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  /* technical：给日志看的技术原文（网关响应、Node 底层报错里的英文）。
     刻意**不放进响应体** —— 调用方只需要读懂"发生了什么、要不要重试"，
     主机名、端口、SQL 原文这类噪声留在日志里给维护者看。见 index.js 的 catch。 */
  if (technical) { err.technical = technical; }
  return err;
}

/* 「我们这边坏了」的统一出口（连不上 / 超时 / 网关报错）。
   ★ 和 httpError 的分工是"谁的问题"：
     httpError（400 / 404…）说的是"你给错了"；
     这个固定 500 + internal_error，说的是"我们的故障"。
   message 只放人话（中文 + 一句英文），原始报错塞进 technical 留给日志。 */
function dataServiceError(publicMessage, technicalDetail) {
  return httpError(500, 'internal_error', publicMessage, technicalDetail);
}

/* =========================================================
   一、把查询参数编成网关认的形状
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

/* =========================================================
   二、一次读（GET）与一次写（POST）
   ========================================================= */

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
          /* 读接口吃 401，几乎总是"云函数里那把密钥不对 / 过期了"，
             而不是"没有权限看这张表" —— 单独给人话，省得对着 401 猜。
             其余非 2xx 统一说"数据服务出错了"，网关原文只写日志。 */
          if (res.statusCode === 401) {
            return reject(dataServiceError(
              '数据库密钥无效或已过期，请检查云函数环境变量 CLOUDBASE_API_KEY / ' +
              'The database key is invalid or expired, check CLOUDBASE_API_KEY',
              'GET ' + reqPath + ' → HTTP 401：' + body.slice(0, 300)));
          }
          return reject(dataServiceError(
            '读取数据时后端返回了错误，请稍后重试 / The data service returned an error, please retry',
            'GET ' + reqPath + ' → HTTP ' + res.statusCode + '：' + body.slice(0, 300)));
        }
        let json;
        try {
          json = JSON.parse(body || '[]');
        } catch (e) {
          return reject(dataServiceError(
            '数据服务返回的内容看不懂，请联系维护者 / The data service returned malformed data',
            'GET ' + reqPath + ' 返回的不是 JSON：' + body.slice(0, 200)));
        }
        resolve({
          rows: Array.isArray(json) ? json : [json],
          total: parseTotal(res.headers['content-range'], Array.isArray(json) ? json.length : 1)
        });
      });
    });

    req.on('timeout', function () {
      req.destroy(dataServiceError(
        '数据服务响应超时，请稍后重试 / The data service timed out, please retry',
        'GET ' + reqPath + ' 超过 ' + GATEWAY_TIMEOUT_MS + 'ms 未响应'));
    });
    req.on('error', function (e) {
      // 已经翻好的人话错误（超时那条）原样抛；其余（ECONNREFUSED / DNS 失败等）在这里翻译
      if (e && e.status) { return reject(e); }
      reject(dataServiceError(
        '连不上数据服务，请稍后重试 / Cannot reach the data service right now',
        'GET ' + reqPath + ' 请求失败：' + ((e && e.message) || String(e))));
    });
    req.end();
  });
}

// Content-Range: "0-11/12" → 12；"*/0" → 0；拿不到就退回本地行数
function parseTotal(contentRange, fallback) {
  if (!contentRange) { return fallback; }
  const m = /\/(\d+)\s*$/.exec(contentRange);
  return m ? Number(m[1]) : fallback;
}

/* 把网关（其实是网关背后的 PostgreSQL）的报错，翻成人能看懂的一句话。

   ★ 这里是 Day 18 "防重复提交"能成立的关键一环：
     重复提交不是我们在 JS 里"先查一遍再插"挡住的 —— 那样在并发下会漏。
     真正挡它的是**库里的主键**（dishes 的 PRIMARY KEY (id)），
     我们负责把 PostgreSQL 抛出的 SQLSTATE 翻成一个诚实的 HTTP 状态码：
       23505 唯一冲突     → 409 conflict（重复提交，不是服务器坏了）
       23502 非空违反     → 400（有必填字段没给）
       23514 CHECK 违反   → 400（值不合法，如 status 不在允许集合里）
       23503 外键违反     → 400（region_slug 指向一个不存在的省）
       42501 权限不足     → 500 + 直接点名该执行哪个 SQL 文件
     翻译这一步不能省：把 23505 原样当 500 报出去，调用者会以为服务坏了，
     然后无脑重试，反而把一个"本来就被拒绝了"的请求又发一遍。 */
function gatewayError(statusCode, bodyText) {
  let info = null;
  try { info = JSON.parse(bodyText); } catch (e) { info = null; }

  /* SQLSTATE 不做全等比对，而是从 code（兜底再到 message）里**提取连续 5 位数字**。
     实测（2026-10-08，Day 18 验证）网关会把 PG 的 23505 包成 "DATABASE_23505" ——
     精确比对 '23505' 就漏了。提取式写法对两种信封都成立；
     5 位数字里误撞出别的值的风险，由下面逐个白名单比对兜着（认不出的仍走兜底 500）。 */
  const haystack = [info && info.code, info && info.message]
    .map(function (v) { return v === null || v === undefined ? '' : String(v); })
    .join(' ');
  const m = /(\d{5})/.exec(haystack);
  const sqlstate = m ? m[1] : '';

  /* ★ 从这里往下，「给用户看的话」和「给日志看的话」是分开的：
       message   —— 只有人话（中文 + 一句英文）；
       technical —— 数据库 / 网关的原文，只进日志。
     Day 23 之前这里把数据库原文直接拼进 message，调用方会看到一串英文 SQL 报错；
     现在噪声留在日志里，响应里只留能读懂的那一句。 */
  const raw = String((info && info.message) || bodyText).slice(0, 300);

  if (sqlstate === '23505') {
    return httpError(409, 'conflict',
      '这道菜已经在库里了（id 重复），本次没有重复写入 / Dish already exists, nothing was written twice',
      raw);
  }
  if (sqlstate === '23502') {
    return httpError(400, 'bad_request',
      '有必填字段没填 / A required field is missing',
      'SQLSTATE 23502 非空违反：' + raw);
  }
  if (sqlstate === '23514') {
    return httpError(400, 'bad_request',
      '有字段的值不合法（没通过数据库的取值检查） / A field failed the database check',
      'SQLSTATE 23514 CHECK 违反：' + raw);
  }
  if (sqlstate === '23503') {
    return httpError(400, 'bad_request',
      '引用了不存在的地区（region_slug）或菜品 / unknown region_slug or dish id',
      'SQLSTATE 23503 外键违反：' + raw);
  }
  if (sqlstate === '42501') {
    return httpError(500, 'internal_error',
      '数据库权限不够，请先在 SQL 编辑器里执行 db/grants-write.sql / ' +
      'service_role lacks write privilege, run db/grants-write.sql first',
      'SQLSTATE 42501 权限不足：' + raw);
  }
  // 认不出来的：响应里给一句人话，网关原文只写日志（别自己编一个原因）
  return dataServiceError(
    '写入数据时后端返回了错误，请稍后重试 / The data service returned an error, please retry',
    '写入 → HTTP ' + statusCode + '：' + raw);
}

/* 向网关写一行。和 restGet 的区别只有两点：
   ① 用 POST，请求体是 JSON 数组（PostgREST 收数组，不收到单个对象）；
   ② Prefer: return=representation —— 让库里把"真正写进去的那一行"回给我们，
      这样能拿它跟发出去的值比对（Day 18 的"写入 + 读回验证"就靠这个）。
   注意：插入成功时 PostgREST 回的是 **201**，不是 200。 */
function restInsert(table, rows) {
  return new Promise(function (resolve, reject) {
    const payload = JSON.stringify(Array.isArray(rows) ? rows : [rows]);

    const req = https.request({
      host: GATEWAY_HOST,
      path: REST_PREFIX + table,
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'return=representation'
      },
      timeout: GATEWAY_TIMEOUT_MS
    }, function (res) {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) { body += chunk; });
      res.on('end', function () {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(gatewayError(res.statusCode, body));
        }
        let json;
        try {
          json = JSON.parse(body || '[]');
        } catch (e) {
          return reject(dataServiceError(
            '数据服务写入后返回的内容看不懂，请联系维护者 / The data service returned malformed data',
            'POST ' + REST_PREFIX + table + ' 返回的不是 JSON：' + body.slice(0, 200)));
        }
        resolve({
          rows: Array.isArray(json) ? json : [json],
          statusCode: res.statusCode
        });
      });
    });

    req.on('timeout', function () {
      req.destroy(dataServiceError(
        '数据服务响应超时，请稍后重试 / The data service timed out, please retry',
        'POST ' + REST_PREFIX + table + ' 超过 ' + GATEWAY_TIMEOUT_MS + 'ms 未响应'));
    });
    req.on('error', function (e) {
      if (e && e.status) { return reject(e); }
      reject(dataServiceError(
        '连不上数据服务，请稍后重试 / Cannot reach the data service right now',
        'POST ' + REST_PREFIX + table + ' 请求失败：' + ((e && e.message) || String(e))));
    });
    req.write(payload);
    req.end();
  });
}

/* =========================================================
   三、改（PATCH）与删（DELETE）—— Day 22
   ========================================================= */

/* ★★ 这两个方法和 POST 有一个本质区别，也是 Day 22 的主题：

      POST  天生只影响"你给的那一行"——漏写参数顶多是校验失败；
      PATCH / DELETE 是**按过滤条件**作用的——过滤条件为空时，
      PostgREST 会把它们应用到**整张表**（对 DELETE 就是清库）。

   所以这里加一条硬保护：过滤条件为空 → 立刻抛错，连请求都不发。
   宁可这一步失败，也不能让"少写一个参数"变成"整表被改、被清"。

   它和"防重复提交"是同一类设计思想：安全性要落在**不可能被绕过的那一层**，
   而不是指望每个调用方每次都记得写对。 */
function assertHasFilter(pairs, who) {
  if (!pairs || !pairs.length) {
    throw dataServiceError(
      '服务端内部错误：一次改动缺少必要的过滤条件，已拦下、未执行 / ' +
      'Internal error: blocked a write without a filter',
      '拒绝执行不带过滤条件的 ' + who + '（否则会作用于整张表），未发出任何请求');
  }
}

/* PATCH 与 DELETE 共用的底层请求。
   （restInsert 保持原样不动 —— 它已经上线并验证过，
     没必要为了"少写几行"去动一个正在跑的东西。） */
function writeRequest(method, table, pairs, row) {
  return new Promise(function (resolve, reject) {
    const qs = buildQueryString(pairs || []);
    const reqPath = REST_PREFIX + table + '?' + qs; // 过滤条件必填，这里不再是可选的

    const payload = (row === null || row === undefined) ? null : JSON.stringify(row);
    const headers = {
      Authorization: 'Bearer ' + API_KEY,
      Accept: 'application/json',
      // 让库把"真正被改动的那一行"回给我们 —— PATCH 用它证明改成了什么，
      // DELETE 用它充当"删掉了什么"的回执。
      Prefer: 'return=representation'
    };
    if (payload !== null) { headers['Content-Type'] = 'application/json'; }

    const req = https.request({
      host: GATEWAY_HOST,
      path: reqPath,
      method: method,
      headers: headers,
      timeout: GATEWAY_TIMEOUT_MS
    }, function (res) {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) { body += chunk; });
      res.on('end', function () {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(gatewayError(res.statusCode, body));
        }
        let json;
        try {
          json = JSON.parse(body || '[]');
        } catch (e) {
          return reject(dataServiceError(
            '数据服务返回的内容看不懂，请联系维护者 / The data service returned malformed data',
            method + ' ' + reqPath + ' 返回的不是 JSON：' + body.slice(0, 200)));
        }
        /* rows 为空数组 = "过滤条件没匹配到任何行"。
           PATCH/DELETE 都不把这种情形当报错抛，而是把空结果交给业务层 ——
           业务层据此回 404（"没有这道菜"），而不是含糊地回个 200 说"成功"。
           ★ 这一点对 DELETE 尤其要紧：第二次删同一个 id 时，回 200 会让人
             分不清"删成功了"还是"本来就没有"。 */
        resolve({
          rows: Array.isArray(json) ? json : [json],
          statusCode: res.statusCode
        });
      });
    });

    req.on('timeout', function () {
      req.destroy(dataServiceError(
        '数据服务响应超时，请稍后重试 / The data service timed out, please retry',
        method + ' ' + reqPath + ' 超过 ' + GATEWAY_TIMEOUT_MS + 'ms 未响应'));
    });
    req.on('error', function (e) {
      if (e && e.status) { return reject(e); }
      reject(dataServiceError(
        '连不上数据服务，请稍后重试 / Cannot reach the data service right now',
        method + ' ' + reqPath + ' 请求失败：' + ((e && e.message) || String(e))));
    });
    if (payload !== null) { req.write(payload); }
    req.end();
  });
}

/* 改一行（部分更新）。rows 的形状由调用方给，PATCH 收单个对象即可。 */
function restUpdate(table, pairs, patchRow) {
  assertHasFilter(pairs, 'PATCH');
  return writeRequest('PATCH', table, pairs, patchRow);
}

/* 删一行。★ 用 return=representation 而不是"先查一遍再删"：
     ① 一次调用就拿到"删掉的是什么"，回执不需要第二次请求；
     ② 避开"先查后删"之间的竞态 —— 和防重复提交是同一个道理。 */
function restDelete(table, pairs) {
  assertHasFilter(pairs, 'DELETE');
  return writeRequest('DELETE', table, pairs, null);
}

module.exports = {
  httpError: httpError,
  encodeValue: encodeValue,
  buildQueryString: buildQueryString,
  restGet: restGet,
  parseTotal: parseTotal,
  gatewayError: gatewayError,
  dataServiceError: dataServiceError,
  restInsert: restInsert,
  restUpdate: restUpdate,
  restDelete: restDelete,
  assertHasFilter: assertHasFilter,
  API_KEY: API_KEY
};
