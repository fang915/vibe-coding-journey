/* =========================================================
   寻味 / Xunwei —— 数据来源层（Day 8 新增）
   技术约束（见 TECH_DESIGN.md §2）：原生 JavaScript，无框架、无依赖。

   这一层存在的唯一理由：把「数据从哪来」和「页面怎么画」分开。
   现在数据来自本地假数据文件 data/dishes.json —— 这就是本期的 mock 数据。
   第 3 周要接真实 API 时，只需要改这一个文件里的 getDishes()，
   页面代码（js/app.js）一行都不用动。

   对外只暴露两样东西：
     DataSource.getDishes()   →  Promise，成功时给一个数组，每个元素是一道菜
     DataSource.forcedState() →  'loading' / 'empty' / 'error' / null（调试开关，见下）
   ========================================================= */

window.DataSource = (function () {
  'use strict';

  var DATA_URL = 'data/dishes.json';

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

    /* ---- 正常流程：读本地 mock 数据文件 ---- */
    return fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (data) {
        return (data && data.dishes) || [];
      });
  }

  return {
    getDishes: getDishes,
    forcedState: forcedState
  };

})();
