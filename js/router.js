/* =========================================================
   寻味 / Xunwei —— 极简 hash 路由（Day 13 新增）
   技术约束（见 TECH_DESIGN.md §2）：原生 JavaScript，无框架、无依赖。

   这个文件只做三件事，别的一概不管：
     1. 解析 parse()   —— 把 location.hash 翻译成一个路由对象
     2. 跳转 go() / replace()
     3. 监听 start()   —— hash 变化时通知调用方

   它不认识任何 DOM 节点、不知道页面上有几个视图 ——
   「哪个路由该画哪一屏」全部由 js/app.js 决定。
   这样拆的理由：路由规则可以单独看懂、单独验证；以后换视图不用动这个文件。

   路由表（契约见 TECH_DESIGN.md §11.4）：
     '' 或 '#/'          → { view: 'list' }
     '#/regions'         → { view: 'regions' }
     '#/region/:slug'    → { view: 'region', slug: '…' }
     '#/dish/:id'        → { view: 'dish', id: '…' }
     其它任何东西         → null（调用方负责兜底，绝不白屏）

   地址里为什么用拼音 slug（#/region/guangxi）而不是中文（#/region/广西）：
   浏览器地址栏会把中文显示成 %E5%B9%BF%E8%A5%BF 那种编码，截图和分享都读不懂，
   「地址栏本身就是证据」这条好处就没了。菜品 id 本来就是 ASCII
   （#/dish/luosifen），两者风格也统一。
   ========================================================= */

window.Router = (function () {
  'use strict';

  /* 去掉开头的 '#'，再按 '/' 拆成一段段。
     '/region/guangxi' → ['region', 'guangxi']；'/' → [] */
  function segments(hash) {
    return String(hash || '')
      .replace(/^#/, '')
      .split('/')
      .filter(function (s) { return s !== ''; });
  }

  /* 网址里的中文会被浏览器转成 %XX 存着，读回来是编码过的，这里统一解一次。
     残缺的编码（比如 '#/region/%E4'）会让 decodeURIComponent 抛错，
     那就原样返回 —— 反正这种 hash 后面也匹配不上任何东西，会走兜底。 */
  function decodePart(text) {
    if (!text) { return ''; }
    try { return decodeURIComponent(text); } catch (err) { return text; }
  }

  /* 解析。看不懂的一律返回 null。
     ★ 这里刻意不写"默认回首页"：返回 null 是留给调用方一个机会，
       让它在跳转前先给用户一句解释（"没找到这道菜"），而不是默默换一屏。 */
  function parse(hash) {
    var seg = segments(hash);

    if (seg.length === 0) { return { view: 'list' }; }

    if (seg[0] === 'regions' && seg.length === 1) { return { view: 'regions' }; }

    if (seg[0] === 'region' && seg.length === 2) {
      var slug = decodePart(seg[1]);
      return slug ? { view: 'region', slug: slug } : null;
    }

    if (seg[0] === 'dish' && seg.length === 2) {
      var id = decodePart(seg[1]);
      return id ? { view: 'dish', id: id } : null;
    }

    return null;
  }

  var onRoute = null;          // 调用方传进来的处理函数

  function hashOf(path) { return '#' + path; }

  /* 目标路径是否已经就是当前地址。
     用来判断"改 hash 会不会真的引发一次变化"（见 go）。 */
  function isSame(path) {
    var now = window.location.hash;
    if (path === '/') { return now === '' || now === '#' || now === '#/'; }
    return now === hashOf(path);
  }

  /* 跳转。会在浏览历史里留一条记录 —— 这样浏览器的"后退"能原路返回。
     ★ 必须处理"hash 没变"的情况：把 location.hash 设成它本来就等于的值，
       浏览器什么都不会发生（也就没有 hashchange 事件），
       可用户明明做了个动作，界面理应重画一次。所以这里手动派发一次。 */
  function go(path) {
    if (isSame(path)) { dispatch(); return; }
    window.location.hash = hashOf(path);
  }

  /* 兜底跳转：覆盖当前这条，不留新记录。
     ★ 为什么不能用 go()：地址栏里躺着一个看不懂的 hash 时，若用 go() 跳到 '#/'，
       历史里就多了一条"非法地址"。用户按一下后退，又回到那个非法地址，
       于是再被弹走一次 —— 卡在循环里出不去。replace 是覆盖，后退键因此能正常离开。 */
  function replace(path) {
    window.history.replaceState(null, '', hashOf(path));
    dispatch();   // replaceState 不触发 hashchange，自己再走一遍
  }

  function dispatch() {
    if (onRoute) { onRoute(parse(window.location.hash)); }
  }

  /* 启动：记下处理函数 → 立刻按当前 hash 派发一次
     （这样直接打开别人分享的 '#/dish/luosifen' 也能落到正确的视图）→ 之后监听变化。 */
  function start(handler) {
    onRoute = handler;
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }

  return {
    parse: parse,
    go: go,
    replace: replace,
    start: start,
    dispatch: dispatch
  };

})();
