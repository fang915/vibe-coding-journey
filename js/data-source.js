/* =========================================================
   寻味 / Xunwei —— 数据来源层（Day 8 新增 / Day 20 换成真实接口）
   技术约束（见 TECH_DESIGN.md §2）：原生 JavaScript，无框架、无依赖。

   这一层存在的唯一理由：把「数据从哪来」和「页面怎么画」分开。
   ★ Day 20 起：数据来自 CloudBase 上的真实读接口（不再是本地假数据文件）。
     换源只动了这一个文件 —— 页面代码（js/app.js）的渲染逻辑一行没改。

   对外暴露四样东西：
     DataSource.getDishes()   →  Promise，成功时给一个数组，每个元素是一道菜（摘要形状）
     DataSource.getDish(id)   →  Promise，一道菜的完整内容（三段正文 + 事实 + 出处）
     DataSource.sourceInfo()  →  { source, updatedAt, note } —— 当前数据是哪来的、什么时候读的
     DataSource.forcedState() →  'loading' / 'empty' / 'error' / null（调试开关，见下）

   ★ 为什么详情要单独取一次：
     接口的列表返回是**摘要形状**（不含三段正文/事实/出处），
     而卡片页要把这些都画出来 —— 所以按 id 再取一次 /api/dishes/{id}。
     这不是多余的请求：列表页可能列 100 道菜，没必要为了画一张卡把 100 道菜的全文都拉下来。
   ========================================================= */

window.DataSource = (function () {
  'use strict';

  /* 接口地址：云函数域名（不是静态托管域名，两者不同源，接口那边已开跨域）。
     ⚠️ 改环境时改这一行就够了。 */
  var API_BASE = 'https://vibecodingstudy-d1f1el6a03d5aad8-1499243471.ap-shanghai.app.tcloudbase.com';

  // 接口不可用时的退路：本地示例数据（降级时会在页面上标注「示例数据」，不偷偷用）
  var MOCK_URL = 'data/dishes.json';

  // 当前这份数据是哪来的 —— sourceInfo() 读它，页面状态栏据此显示
  var info = { source: null, updatedAt: null, note: '' };

  /* ---------------------------------------------------------
     调试开关：只为了"看得见"三种平时一闪而过的状态
     在网址后面加参数即可（不加就完全走正常流程）：
       ?state=loading   永远停在"加载中"，方便看骨架屏
       ?state=empty     当作一条数据都没有
       ?state=error     当作读取失败
     它只在本文件里生效，页面代码不知道它的存在。
     --------------------------------------------------------- */
  function forcedState() {
    var m = /[?&]state=(loading|empty|error)(?:&|$)/.exec(window.location.search);
    return m ? m[1] : null;
  }

  /* 取一次 JSON。cache: 'no-cache' 是必须的，别删 ——
     'no-cache' 不是"不用缓存"，而是"用之前先问服务器变了没有"：
     没变回 304（照样省流量），变了就拿新内容。
     不加它的后果（2026-09-28 实测，换接口后同理）：内容没有版本号，
     浏览器会按启发式规则自己算一个"新鲜期"，期内**根本不回源**，
     于是库里已经改了，页面上还是旧的。 */
  function requestJson(url, what) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) { throw new Error(what + ' 返回 HTTP ' + res.status); }
      return res.json();
    });
  }

  /* 正常路线：读接口 */
  function loadFromApi() {
    return requestJson(API_BASE + '/api/dishes?limit=100', '读接口').then(function (j) {
      // 形状不对就当失败处理 —— 宁可走降级，也不要画出一屏"看起来正常"的空页面
      if (!j || j.ok !== true || !j.data || !Array.isArray(j.data.items)) {
        throw new Error('读接口返回的形状不对');
      }
      info.source = 'api';
      info.updatedAt = new Date();
      info.note = '数据库共 ' + j.data.total + ' 道';
      return j.data.items;
    });
  }

  /* 降级路线：本地示例数据（只有接口不可用才会走这里） */
  function loadFromMock(reason) {
    return requestJson(MOCK_URL, '本地示例数据').then(function (data) {
      info.source = 'sample';
      info.updatedAt = new Date();
      info.note = '接口不可用，已退回本地示例数据：' + reason;
      return (data && data.dishes) || [];
    });
  }

  function getDishes() {
    var forced = forcedState();

    if (forced === 'loading') {
      // 返回一个永远不落地的 Promise，页面就会一直停在加载中
      return new Promise(function () {});
    }
    if (forced === 'empty') {
      return Promise.resolve([]);
    }
    if (forced === 'error') {
      return Promise.reject(new Error('调试开关生效：模拟读取数据失败（?state=error）'));
    }

    return loadFromApi().catch(function (err) {
      /* ★ 降级不静默：接口不通就退回本地示例数据，但把这件事记在 info 上，
         页面状态栏会明写「示例数据」—— 让看到页面的人一眼知道这不是库里的内容。
         （清单里的"卡住降级"就是这么要求的：宁可标注，不要假装。） */
      console.warn('[xunwei] 读接口失败，降级到本地示例数据：' + err.message);
      return loadFromMock(err.message);
    });
  }

  /* 详情：按 id 取一道菜的完整内容 */
  function getDish(id) {
    return requestJson(
      API_BASE + '/api/dishes/' + encodeURIComponent(id),
      '详情接口'
    ).then(function (j) {
      if (!j || j.ok !== true || !j.data) {
        throw new Error('详情接口返回的形状不对');
      }
      return j.data;
    });
  }

  function sourceInfo() {
    return info;
  }

  return {
    getDishes: getDishes,
    getDish: getDish,
    sourceInfo: sourceInfo,
    forcedState: forcedState
  };

})();
