/* =========================================================
   寻味 / Xunwei —— 前端逻辑（Day 8：补齐四种页面状态）
   技术约束（见 TECH_DESIGN.md §2）：原生 JavaScript，无框架、无依赖。

   这个文件做八件事：
     1. 让 js/data-source.js 把数据取回来（数据从哪来，这里不管）
     2. 按用户输入的关键词找出匹配的美食
     3. 把结果画到页面上（检索视图 / 地区索引视图 / 文化卡片视图）
     4. 监听滚动，决定"回到顶部"按钮什么时候出现（Day 10 新增）
     5. 详情页的"复制名称与链接"，并给四重反馈（Day 11 新增）
     6. 按地区筛选，并把筛选结果与关键词取交集（Day 12 新增）
     7. 用 hash 路由在三个视图之间切换，并画出面包屑（Day 13 新增）
     8. 生成"地区索引"这个目录页（Day 13 新增，数据零新增、全部现算）

   ★ Day 13 定下的一条硬规矩：**谁都不许直接改视图的 hidden，一律改 hash**。
     视图显隐只由 renderRoute() 一处决定；跳转一律走 Router.go()。
     两处各改一半，页面迟早会出现"地址栏说 A、画面是 B"的不一致。

   ⚠️ 四种页面状态（Day 8 的正题）——同一时刻只亮一个，切换一律走 applyState()：
     success  成功   —— 正常内容（列表 / 地区目录 / 卡片）
     loading  加载中 —— 骨架屏
     empty    无结果 —— 数据一条都没有，或者搜索没命中
     error    失败   —— 读不到数据，带一个「重试」按钮

   ★ Day 13 板块③：这四种状态从"列表视图专用"升级成**三个视图共用的机制**。
     每个视图在自己的容器里备好 data-state 块（见 index.html 的说明），
     applyState() 只认"当前在哪一屏"，把状态画进那一屏 ——
     于是新加一个视图时，状态是随 HTML 一起长出来的，不必再改这个文件。
   ========================================================= */

(function () {
  'use strict';

  // 内存里的数据和当前状态
  var state = {
    dishes: [],          // 全部美食
    loaded: false,       // 数据是否已经成功读进来
    listState: 'loading',// 当前视图处于四种状态里的哪一种（板块③ 起不再只是"列表区"）
    errorMessage: '',    // 上一次取数失败的原因（板块③：换屏之后还要能原样复述）
    currentDish: null,   // 详情页正在看的那一道（Day 11：复制按钮要知道复制的是哪道菜）
    region: 'all',       // 当前选中的地区（Day 12）：'all' 表示不筛，否则是省份名如 '广西'
    route: null,         // 当前路由对象（Day 13）
    viewName: 'list'     // 当前露在外面的是哪个视图（Day 13），用于挑对提示条
  };

  // 页面上要反复用到的元素，统一在 init 里取一次
  var el = {};

  /* ---------------------------------------------------------
     Day 13：地区索引用的两张静态表（34 个省级行政区 + 所属分区）

     ★ 为什么写在代码里、而不是塞进 data/dishes.json：
       这属于「界面结构」不是「内容数据」。内容数据必须条条可溯源、
       而且要能整份替换成真 API 的返回值；34 个省的名字显然不属于那类。
       （TECH_DESIGN.md §11.5）

     每条四个字段：
       group 所属地理分区。前七个是通用的七大地理分区，
             港澳台单独一组 —— 与内容计划的分批口径一致（批5）。
       key   中文名。它同时是「筛选」和「已收录几道」的匹配前缀。
       en    英文名，只用于显示。
       slug  地址栏里用的键（#/region/guangxi）。
     ★ 陕西的 slug 只能用 shaanxi：纯拼音会和山西（shanxi）撞车。
     --------------------------------------------------------- */
  var REGION_GROUPS = [
    { name: '华北', en: 'North China' },
    { name: '东北', en: 'Northeast China' },
    { name: '华东', en: 'East China' },
    { name: '华中', en: 'Central China' },
    { name: '华南', en: 'South China' },
    { name: '西南', en: 'Southwest China' },
    { name: '西北', en: 'Northwest China' },
    { name: '港澳台', en: 'Hong Kong, Macao & Taiwan' }
  ];

  var REGIONS = [
    { group: '华北', key: '北京',     en: 'Beijing',         slug: 'beijing' },
    { group: '华北', key: '天津',     en: 'Tianjin',         slug: 'tianjin' },
    { group: '华北', key: '河北',     en: 'Hebei',           slug: 'hebei' },
    { group: '华北', key: '山西',     en: 'Shanxi',          slug: 'shanxi' },
    { group: '华北', key: '内蒙古',   en: 'Inner Mongolia',  slug: 'neimenggu' },

    { group: '东北', key: '辽宁',     en: 'Liaoning',        slug: 'liaoning' },
    { group: '东北', key: '吉林',     en: 'Jilin',           slug: 'jilin' },
    { group: '东北', key: '黑龙江',   en: 'Heilongjiang',    slug: 'heilongjiang' },

    { group: '华东', key: '上海',     en: 'Shanghai',        slug: 'shanghai' },
    { group: '华东', key: '江苏',     en: 'Jiangsu',         slug: 'jiangsu' },
    { group: '华东', key: '浙江',     en: 'Zhejiang',        slug: 'zhejiang' },
    { group: '华东', key: '安徽',     en: 'Anhui',           slug: 'anhui' },
    { group: '华东', key: '福建',     en: 'Fujian',          slug: 'fujian' },
    { group: '华东', key: '江西',     en: 'Jiangxi',         slug: 'jiangxi' },
    { group: '华东', key: '山东',     en: 'Shandong',        slug: 'shandong' },

    { group: '华中', key: '河南',     en: 'Henan',           slug: 'henan' },
    { group: '华中', key: '湖北',     en: 'Hubei',           slug: 'hubei' },
    { group: '华中', key: '湖南',     en: 'Hunan',           slug: 'hunan' },

    { group: '华南', key: '广东',     en: 'Guangdong',       slug: 'guangdong' },
    { group: '华南', key: '广西',     en: 'Guangxi',         slug: 'guangxi' },
    { group: '华南', key: '海南',     en: 'Hainan',          slug: 'hainan' },

    { group: '西南', key: '重庆',     en: 'Chongqing',       slug: 'chongqing' },
    { group: '西南', key: '四川',     en: 'Sichuan',         slug: 'sichuan' },
    { group: '西南', key: '贵州',     en: 'Guizhou',         slug: 'guizhou' },
    { group: '西南', key: '云南',     en: 'Yunnan',          slug: 'yunnan' },
    { group: '西南', key: '西藏',     en: 'Tibet',           slug: 'xizang' },

    { group: '西北', key: '陕西',     en: 'Shaanxi',         slug: 'shaanxi' },
    { group: '西北', key: '甘肃',     en: 'Gansu',           slug: 'gansu' },
    { group: '西北', key: '青海',     en: 'Qinghai',         slug: 'qinghai' },
    { group: '西北', key: '宁夏',     en: 'Ningxia',         slug: 'ningxia' },
    { group: '西北', key: '新疆',     en: 'Xinjiang',        slug: 'xinjiang' },

    { group: '港澳台', key: '中国香港', en: 'Hong Kong, China', slug: 'hong-kong' },
    { group: '港澳台', key: '中国澳门', en: 'Macao, China',     slug: 'macao' },
    { group: '港澳台', key: '中国台湾', en: 'Taiwan, China',    slug: 'taiwan' }
  ];

  // slug → 地区条目 / 中文名 → 地区条目
  function regionBySlug(slug) {
    for (var i = 0; i < REGIONS.length; i++) {
      if (REGIONS[i].slug === slug) { return REGIONS[i]; }
    }
    return null;
  }

  function regionByKey(key) {
    for (var i = 0; i < REGIONS.length; i++) {
      if (REGIONS[i].key === key) { return REGIONS[i]; }
    }
    return null;
  }

  /* 一道菜的 region.zh 形如"广西柳州"「浙江丽水缙云」「天津」，
     都以省份名开头。这里把那个省份名找出来（找不到返回空串）。
     与筛选用的是同一套前缀规则（见 regionMatches）。 */
  function regionKeyOf(regionZh) {
    if (!regionZh) { return ''; }
    for (var i = 0; i < REGIONS.length; i++) {
      if (regionZh.indexOf(REGIONS[i].key) === 0) { return REGIONS[i].key; }
    }
    return '';
  }

  /* 路由名 → 该露出哪个视图容器。
     ★ list 与 region 共用同一个容器：它们是同一屏，只是后者多了个筛选条件。

     ★★ 这两个常量为什么必须写在这里、不能挪到下面的「路由」小节去：
        紧跟着的那个 preShowRouteView() 在**脚本一执行**就要用它们，
        而 var 只有"声明"会提前，"赋值"不会 ——
        放到下面去，这里读到的就是 undefined（Day 13 真踩过：
        报错 "Cannot read properties of undefined (reading 'list')"，
        整份 app.js 因此一行都没跑起来，页面停在 HTML 里的静态兜底上）。 */
  var VIEW_OF_ROUTE = {
    list: 'search-view',
    region: 'search-view',
    regions: 'region-view',
    dish: 'card-view'
  };

  var ALL_VIEW_IDS = ['search-view', 'region-view', 'card-view'];

  /* Day 13：进页面时先按 hash 把该露的视图露出来。
     本脚本写在 </body> 之前，此刻 DOM 已经解析完、浏览器还没画第一帧，
     所以这一步能消掉"直接打开 #/regions 却先闪一下检索列表"。
     只拨 hidden，不碰任何数据 —— 数据要等 DOMContentLoaded 之后才取。 */
  (function preShowRouteView() {
    var route = window.Router.parse(window.location.hash);
    setViewVisibility(route ? route.view : 'list');
  })();

  document.addEventListener('DOMContentLoaded', init);

  /* ---------------------------------------------------------
     启动：取元素 → 绑事件 → 读数据
     --------------------------------------------------------- */
  function init() {
    el.searchView  = document.getElementById('search-view');
    el.cardView    = document.getElementById('card-view');
    el.form        = document.getElementById('search-form');
    el.input       = document.getElementById('search-input');
    el.hint        = document.getElementById('search-hint');
    el.listTitle   = document.getElementById('list-title');
    el.dishList    = document.getElementById('dish-list');

    // Day 12：地区筛选条。按钮是静态写在 HTML 里的，这里只取引用。
    el.filterBar   = document.getElementById('region-filter');
    el.filterBtns  = el.filterBar
      ? Array.prototype.slice.call(el.filterBar.querySelectorAll('.filter-btn'))
      : [];
    el.backBtn     = document.getElementById('back-btn');
    el.toTop       = document.getElementById('to-top');   // Day 10

    // Day 13：地区索引视图 + 面包屑。索引视图的内容整体由 JS 生成，
    // 所以 HTML 里只留一个空容器（#region-groups）等着被填。
    el.regionView   = document.getElementById('region-view');
    el.regionGroups = document.getElementById('region-groups');
    el.regionHint   = document.getElementById('region-hint');
    el.breadcrumb   = document.getElementById('breadcrumb');

    // Day 11：复制按钮 + 它的读屏播报区
    el.copyBtn     = document.getElementById('copy-btn');
    el.copyLabel   = document.getElementById('copy-label');
    el.copyLabelEn = document.getElementById('copy-label-en');
    el.copyLive    = document.getElementById('copy-live');

    // 三种"非正常"状态的容器。
    // ★ Day 13 板块③ 起，这些引用只用于"填文案/挂按钮"——
    //   真正决定显隐的是元素上的 data-state 属性，由 applyViewState() 统一开关。
    //   （剩下三个视图各自的那一组状态块，不用在这里逐个取引用。）
    el.stateLoading   = document.getElementById('state-loading');
    el.stateEmpty     = document.getElementById('state-empty');
    el.stateEmptyTitle= document.getElementById('state-empty-title');
    el.stateEmptyText = document.getElementById('state-empty-text');
    el.stateEmptyAll  = document.getElementById('state-empty-all-btn');
    el.stateError     = document.getElementById('state-error');
    el.stateErrorText = document.getElementById('state-error-text');

    // 三个视图的三个「重试」按钮 —— 都绑同一个取数函数。
    // 为什么不共用一个按钮：按钮必须长在用户当前看的那一屏上，
    // 让他"看到失败"和"点重试"发生在同一个位置，不用先找回去。
    el.retryBtn       = document.getElementById('retry-btn');
    el.regionRetryBtn = document.getElementById('region-retry-btn');
    el.cardRetryBtn   = document.getElementById('card-retry-btn');

    el.nameZh      = document.getElementById('card-name-zh');
    el.nameEn      = document.getElementById('card-name-en');
    el.meta        = document.getElementById('card-meta');
    el.cardFigure  = document.getElementById('card-figure');
    el.cardImage   = document.getElementById('card-image');
    el.cardCredit  = document.getElementById('card-credit');
    el.cardNote    = document.getElementById('card-note');
    el.origin      = document.getElementById('block-origin');
    el.story       = document.getElementById('block-story');
    el.technique   = document.getElementById('block-technique');
    el.factList    = document.getElementById('fact-list');
    el.sourceList  = document.getElementById('source-list');

    el.sections = [
      document.getElementById('section-origin'),
      document.getElementById('section-story'),
      document.getElementById('section-technique'),
      document.getElementById('section-facts'),
      document.getElementById('section-sources')
    ];

    el.form.addEventListener('submit', onSubmit);

    // Day 12：点地区按钮只重画列表，不跳详情 ——
    // 用户点筛选是想"看这一片有哪些"，跳进详情会把这个意图打断。
    // Day 13：改成改 hash（导航），由路由统一决定怎么画。
    el.filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        navigateToRegion(btn.getAttribute('data-region'));
      });
    });

    // Day 13：返回键不再自己开关 hidden，改成"回首页那条路由"
    el.backBtn.addEventListener('click', navigateHome);
    el.copyBtn.addEventListener('click', copyCardLink);         // Day 11：复制并反馈
    el.retryBtn.addEventListener('click', loadDishes);          // 失败 → 重试
    el.stateEmptyAll.addEventListener('click', showAllDishes);  // 没搜到 → 看全部

    // Day 10：回到顶部。
    // passive: true 是告诉浏览器"这个监听里不会阻止滚动"，滚动因此更顺、不掉帧。
    el.toTop.addEventListener('click', scrollToTop);
    window.addEventListener('scroll', syncToTop, { passive: true });
    syncToTop();   // 刷新页面时可能停在中间，先按当前位置对一次

    // Day 13：先让路由按当前 hash 派发一次（决定露出哪个视图），再取数据。
    // 顺序反过来的话，深链接会先按"默认视图"画一帧再纠正过来，白闪一下。
    window.Router.start(onRoute);
    loadDishes();
  }

  /* ---------------------------------------------------------
     状态切换（Day 8 建立，Day 13 板块③ 升级为「三个视图共用」）

     ★ 规矩只有一条：**状态写在元素的 data-state 属性上，不写在代码的 if 里。**
         data-state="loading|empty|error"  三种非正常态，同一时刻只亮一个
         data-state="content"              正常态才显示的内容（可以有好几块）
       于是给某个视图加一种新状态，不用回来改这个函数 ——
       在 HTML 里补一块、写上属性，它就自动纳入了体系。

     applyState(name) 是"对当前所在视图"的包装：它自己判断现在露在外面的是
     哪一屏，把状态画进那一屏的容器。调用点因此仍只写 applyState('loading')，
     不必知道自己在哪个视图 —— 这才是"通用机制"的意思。
     --------------------------------------------------------- */

  /* 当前露在外面的视图容器。
     认 state.viewName（由 renderRoute 设），不去问 DOM"谁没 hidden"——
     状态还没画完时问 DOM，问出来的会是上一轮的答案。 */
  function currentStateHost() {
    if (state.viewName === 'regions') { return el.regionView; }
    if (state.viewName === 'dish')    { return el.cardView; }
    return el.searchView;   // list 与 region 共用同一屏
  }

  /* 在某一个视图容器内切换状态。**全站改状态显隐的唯一出口。** */
  function applyViewState(host, name) {
    if (!host) { return; }
    var nodes = host.querySelectorAll('[data-state]');
    Array.prototype.forEach.call(nodes, function (node) {
      var role = node.getAttribute('data-state');
      // content 是"正常态才显示"，其余三种认名字
      node.hidden = (role === 'content') ? (name !== 'success') : (role !== name);
    });
  }

  function applyState(name, opts) {
    opts = opts || {};
    // 变量名保留 listState（别处还在读它），语义已是"当前这一屏的状态"。
    state.listState = name;

    var host = currentStateHost();
    applyViewState(host, name);

    /* 文案：只有列表视图需要临时拼。
       它得说清"是哪个关键词、哪个地区"叠加后没命中 —— 不拼，用户不知道错在哪。
       索引 / 卡片视图的文案对应固定场景，直接写在 HTML 里，不劳 JS 跑一趟。 */
    if (host !== el.searchView) { return; }

    if (name === 'empty') {
      if (opts.dataEmpty) {
        /* 情况一：数据本身就是空的。
           ★ 标题也得换。"没找到这道菜"是"你要找的那个东西不存在"的口吻，
             而此刻是"整个库都是空的" —— 两件事共用一句话就是在骗人。
             （这正是索引视图那条原则：读不出来、没有、没搜到，要说清是哪一种。） */
        el.stateEmptyTitle.innerHTML =
          '还没有收录美食<span class="en">· Nothing here yet</span>';
        el.stateEmptyText.textContent = '数据文件里还是空的。· Nothing here yet.';
        el.stateEmptyAll.hidden = true;
      } else {
        el.stateEmptyTitle.innerHTML =
          '没找到这道菜<span class="en">· Nothing found</span>';
        // 情况二：搜索 / 筛选没命中。
        // Day 12：有筛选时要说清是"哪个地区 + 哪个关键词"叠加后没命中，
        // 否则用户看着空页面，不知道是搜错了还是筛错了。
        var q = opts.query || '';
        var r = (opts.region && opts.region !== 'all') ? opts.region : '';

        if (r && q) {
          el.stateEmptyText.textContent =
            '「' + r + '」里没有匹配「' + q + '」的菜。换个说法，或点下面的按钮看全部。' +
            ' · No match for “' + q + '” in ' + r;
        } else if (r) {
          el.stateEmptyText.textContent =
            '「' + r + '」暂时还没有收录的菜。· Nothing in ' + r + ' yet.';
        } else {
          el.stateEmptyText.textContent =
            '暂未收录「' + q + '」。换个说法再试试，比如：螺蛳粉 / Luosifen' +
            ' · Not found: “' + q + '”';
        }
        el.stateEmptyAll.hidden = false;
      }
      return;
    }

    if (name === 'error') {
      el.stateErrorText.textContent = opts.message || '资料没能读出来，点下面重试一次。';
    }
  }

  /* 数据还没到手时，这一屏该显示「加载中」还是「读取失败」。
     三个视图都用得着，所以收在一处 —— 三处各写一遍，迟早会写岔。 */
  function applyPendingState() {
    applyState(state.listState === 'error' ? 'error' : 'loading',
               { message: state.errorMessage });
  }

  /* ---------------------------------------------------------
     0. 路由：三个视图怎么切（Day 13 新增）

     一句话原则：**谁都不直接改 hidden，改 hash 就是导航。**
     所有跳转都走 Router.go()，再由 renderRoute() 一处决定该画哪一屏。
     具体为什么要这么绕：如果"点卡片"自己切 DOM、"改地址"也自己切 DOM，
     两处各改一半，迟早出现"地址栏说 A、画面是 B"的不一致。

     路由 ↔ 视图对照（TECH_DESIGN.md §11.2）：
       #/                    列表视图（不筛地区）      ← 默认入口
       #/region/:slug        列表视图 + 地区条件
       #/regions             地区索引视图（目录页）
       #/dish/:id            文化卡片视图
     --------------------------------------------------------- */

  // 路由名 → 视图容器的对照表在文件上方（VIEW_OF_ROUTE）——
  // 它必须早于 preShowRouteView() 赋值，所以没放在这个小节里。

  /* 视图显隐。全站只有这一个地方改视图的 hidden ——
     三处各改一次，迟早会打架。 */
  function setViewVisibility(routeName) {
    var target = VIEW_OF_ROUTE[routeName] || 'search-view';
    ALL_VIEW_IDS.forEach(function (id) {
      var node = document.getElementById(id);
      if (node) { node.hidden = (id !== target); }
    });
  }

  /* 路由的唯一入口（Router.start 传进来的就是它）。
     这里只做"合法性判定"，画什么交给 renderRoute。 */
  function onRoute(route) {
    // ① 看不懂的 hash：先回首页，再给一句解释。
    //    顺序不能反 —— renderRoute 里的 refreshList 会顺手清掉提示条，
    //    提示要是先写、就会被立刻抹掉。
    //    用 replace 而不是 go：否则历史里留下一条非法地址，后退键会陷进循环。
    if (!route) {
      window.Router.replace('/');
      showHint('这个地址看不懂，已经带你回到首页。· Unknown address, back to home.');
      return;
    }

    // ② 地址形状对、东西却不存在（手改地址、旧链接失效）：同样回首页并说清楚。
    //    ★ 必须等数据到手才判 —— 数据还没读回来时，"找不到"只代表"还没到手"，
    //      这时候弹回去会误伤一切深链接（直接打开 #/dish/luosifen 就是这种情形）。
    if (state.loaded) {
      if (route.view === 'dish' && !dishById(route.id)) {
        window.Router.replace('/');
        showHint('没找到这道菜：' + route.id + ' · No such dish.');
        return;
      }
      if (route.view === 'region' && !regionBySlug(route.slug)) {
        window.Router.replace('/');
        showHint('没有名为「' + route.slug + '」的地区，已回到全部列表。· Unknown region.');
        return;
      }
    }

    state.route = route;
    renderRoute();
  }

  /* 按当前路由把画面画出来。**视图显隐的唯一出口。** */
  function renderRoute() {
    var route = state.route || { view: 'list' };

    /* 提示条只属于"当前这一屏"。换屏时先清掉上一条 ——
       否则会出现"切到别处了，那句『暂未收录』还挂在那儿"的鬼话。 */
    hideHint();

    /* Day 13 板块③：视图按地址走，**不再"偷偷换一个视图"**。
       原先数据没到手时会把 dish 降级成 list，于是出现"地址栏和面包屑说在卡片页、
       画面却是列表"的矛盾 —— 三处说法不一致，用户没法判断自己在哪。
       现在卡片视图自带一块"正在读"，地址、面包屑、画面三者一致。 */
    var showing = route.view;

    var changed = state.viewName !== showing;
    state.viewName = showing;

    setViewVisibility(showing);
    renderBreadcrumb(route);   // 面包屑按"用户要去哪"画，与数据到没到无关
    updateTitle(route);

    // 离开卡片视图：把复制按钮复位，免得"已复制"残留到下次进来还亮着
    if (route.view !== 'dish') {
      state.currentDish = null;
      resetCopy();
    }

    if (route.view === 'list' || route.view === 'region') {
      /* 数据还没到手：这一屏该显示「加载中」还是「读取失败」，
         由 loadDishes 说了算，路由无权覆盖 ——
         否则会把"正在读"误判成"一条都没有"（Day 13 真踩过：
         ?state=error 被这里的空态判定顶掉，看起来像"没搜到"）。
         ★ 板块③ 补的一点：失败时要把错误信息一并带上。
           用户可能是在别的视图撞上失败、又走回这一屏的，
           那时"当前该显示失败"要靠 listState 复述一遍，不能指望上次画的就是它。 */
      if (!state.loaded) { applyPendingState(); return; }

      if (state.dishes.length === 0) {
        // 一条数据都没有：这是"空"态，不是"筛没了"
        el.dishList.innerHTML = '';
        applyState('empty', { dataEmpty: true });
      } else if (route.view === 'region') {
        var region = regionBySlug(route.slug);
        if (region) { applyRegionKey(region.key); }
        refreshList();
      } else {
        // 地址栏是 #/ 时不能还留着地区筛选 ——
        // 否则"URL 说全部、列表却是筛过的"，两边对不上
        applyRegionKey('all');
        refreshList();
      }
    } else if (route.view === 'regions') {
      /* 索引视图也要有正经的三种状态（板块③ 之前这里只有一行占位文字）。 */
      if (!state.loaded) {
        applyPendingState();
      } else if (state.dishes.length === 0) {
        /* 一条数据都没有时，34 个地区会整整齐齐地显示"暂未收录"——
           那不是一张目录，那是一屏噪音。所以给正经的空态。 */
        el.regionGroups.innerHTML = '';
        applyState('empty', { dataEmpty: true });
      } else {
        renderRegionIndex();     // 先画内容
        applyState('success');   // 再把 content 亮出来（顺序反了会闪一下空容器）
      }
    } else {
      // 卡片视图
      if (!state.loaded) {
        applyPendingState();
      } else {
        var dish = dishById(route.id);
        if (dish) {
          state.currentDish = dish;
          resetCopy();
          renderCard(dish);
          applyState('success');
        }
      }
    }

    if (changed) { window.scrollTo(0, 0); }
    syncToTop();
  }

  /* 面包屑：多级视图（首页 → 收录地区 → 某地区 → 某道菜）需要一条
     "我在哪、怎么上去"的线索。首页（#/）不显示它 ——
     只有一个"首页"的面包屑是废话。
     每一级都是普通的 <a href="#/…">：点它浏览器自己改 hash、
     再触发一次路由，不需要额外绑事件。 */
  function renderBreadcrumb(route) {
    if (!el.breadcrumb) { return; }

    if (route.view === 'list') {
      el.breadcrumb.innerHTML = '';
      el.breadcrumb.hidden = true;
      return;
    }

    var parts = [crumbLink('#/', '首页', 'Home')];

    if (route.view === 'regions') {
      parts.push(crumbCurrent('收录地区', 'Regions'));
    } else if (route.view === 'region') {
      var region = regionBySlug(route.slug);
      parts.push(crumbLink('#/regions', '收录地区', 'Regions'));
      parts.push(crumbCurrent(region ? region.key : route.slug, region ? region.en : ''));
    } else if (route.view === 'dish') {
      var dish = dishById(route.id);
      parts.push(crumbLink('#/regions', '收录地区', 'Regions'));

      // 地区这一级只有"真能在索引里找到"时才给链接 ——
      // 否则会指向一个会被兜底弹回来的地址（点了跳走又跳回来，很怪）
      var regionEntry = dish && dish.region ? regionByKey(regionKeyOf(dish.region.zh)) : null;
      if (regionEntry) {
        parts.push(crumbLink('#/region/' + regionEntry.slug, regionEntry.key, regionEntry.en));
      } else if (dish && dish.region) {
        parts.push(crumbCurrent(dish.region.zh, dish.region.en));
      }

      parts.push(crumbCurrent(dish ? dish.name.zh : route.id, dish ? dish.name.en : ''));
    }

    el.breadcrumb.innerHTML = parts.join(
      '<span class="crumb-sep" aria-hidden="true">›</span>'
    );
    el.breadcrumb.hidden = false;
  }

  function crumbLink(href, zh, en) {
    return '<a href="' + escapeHtml(href) + '">' + escapeHtml(zh) +
           (en ? ' <span class="en">' + escapeHtml(en) + '</span>' : '') + '</a>';
  }

  function crumbCurrent(zh, en) {
    return '<span class="crumb-current" aria-current="page">' + escapeHtml(zh) +
           (en ? ' <span class="en">' + escapeHtml(en) + '</span>' : '') + '</span>';
  }

  /* 标题栏也跟着路由走。这不只是装饰：地址栏 + 标题栏同时说"我在哪道菜上"，
     截图时"此刻在哪一屏"就有了两条独立证据。 */
  var SITE_TITLE = '寻味 / Xunwei —— 中华美食文化检索';

  function updateTitle(route) {
    var title = SITE_TITLE;

    if (route.view === 'regions') {
      title = '收录地区 · 寻味 / Xunwei';
    } else if (route.view === 'region') {
      var region = regionBySlug(route.slug);
      title = (region ? region.key : '') + ' · 寻味 / Xunwei';
    } else if (route.view === 'dish') {
      var dish = dishById(route.id);
      if (dish && dish.name) { title = dish.name.zh + ' · 寻味 / Xunwei'; }
    }

    document.title = title;
  }

  /* 从 dish id 取数据（找不到返回 undefined，调用方自己决定怎么兜底） */
  function dishById(id) {
    return state.dishes.filter(function (d) { return d.id === id; })[0];
  }

  /* 导航动作：列表上的三处入口都走这里，它们只负责"报出目的地"，不碰 DOM */
  function navigateHome() {
    window.Router.go('/');
  }

  function navigateToRegion(name) {
    // 顶部筛选条给的是中文名（data-region="广西"），地址栏要的是 slug
    if (!name || name === 'all') { navigateHome(); return; }
    var region = regionByKey(name);
    if (region) { window.Router.go('/region/' + region.slug); }
  }

  /* ---------------------------------------------------------
     1. 读数据（取数逻辑全在 js/data-source.js）
     --------------------------------------------------------- */
  function loadDishes() {
    applyState('loading');

    window.DataSource.getDishes()
      .then(function (dishes) {
        state.dishes = dishes || [];
        state.loaded = true;
        hideHint();

        /* Day 13：数据到手，让当前地址再走一遍路由。
           原来这里是自己画列表；现在交给 renderRoute 统一决定 ——
           用户此刻未必在列表视图上（可能开着 #/regions 或某张卡片），
           由它按当前地址画才对。顺带，那些"这道菜 / 这个地区存不存在"
           的判定也在这时候才有意义（数据没到之前一律先放过）。 */

        /* ★ 先把列表区从「加载中」摘出来，再派发。
           因为 refreshList() 有一条守卫：见到 loading 就主动不动手
           （那是防止"数据没到手就重画"的），而此刻数据已经在手上了。
           不摘掉它的后果（Day 13 真踩过）：列表永远停在骨架屏，
           页面看着像卡住了 —— 路由和面包屑却都是好的，很容易误判。 */
        state.listState = 'success';
        window.Router.dispatch();
      })
      .catch(function (err) {
        state.loaded = false;
        state.listState = 'error';
        state.errorMessage =
          '可能是文件读取或网络出了问题。如果你是在文件夹里双击 index.html 打开的，' +
          '请改用本地服务器打开（这不是你写错了，是浏览器的安全规则）。' +
          '技术信息：' + err.message;

        /* 把"失败"记在 state 上，再让路由按**当前视图**去画 ——
           而不是在这里直接 applyState。理由：失败发生的那一刻用户可能在任一视图
           （比如在索引页点「重试」），记下事实、由 renderRoute 分派，
           才不会出现"错误画在 A 屏、用户人却在 B 屏"。 */
        renderRoute();
      });
  }

  /* ---------------------------------------------------------
     2. 检索：把用户输入和每一道菜的"检索关键词"做包含匹配
     --------------------------------------------------------- */

  // 归一化：统一小写、去掉空格与常见分隔符，这样"螺狮粉"和"螺 蛳 粉"都能对上
  function normalize(text) {
    return String(text === null || text === undefined ? '' : text)
      .toLowerCase()
      .replace(/[\s·・\-_/（）()「」【】]/g, '');
  }

  // 一道菜身上所有可以被搜到的字符串
  function searchKeys(dish) {
    var keys = [dish.id, dish.name && dish.name.zh, dish.name && dish.name.en];
    if (dish.aliases) { keys = keys.concat(dish.aliases); }
    if (dish.region) { keys = keys.concat([dish.region.zh, dish.region.en]); }
    return keys;
  }

  function findMatches(query) {
    var q = normalize(query);
    if (!q) { return []; }
    return state.dishes.filter(function (dish) {
      return searchKeys(dish).some(function (key) {
        return normalize(key).indexOf(q) !== -1;
      });
    });
  }

  /* ---------------------------------------------------------
     2b. 筛选：地区（Day 12）
     筛选与关键词是「交集」：两个条件都满足才留在列表里。
     实现上写在同一条链上（先按关键词挑，再按地区过一遍），
     所以不可能出现"两个条件各算各的再拼起来" —— 那不是筛选，那是并集。

     Day 13 补充：地区条件现在也是「地址的一部分」（#/region/guangxi）。
     好处是刷新页面、复制链接给别人，看到的都是同一份筛选结果；
     代价是"谁说了算"要定清楚 —— 答案是 **hash 说了算**：
     进列表先按 hash 设定 state.region（applyRegionKey），再画。
     --------------------------------------------------------- */

  // 一道菜是否落在当前选中的地区里。
  // 约定：data/dishes.json 里 region.zh 以省份名开头（"广西柳州" / "天津"），所以比前缀。
  // 以后加新菜时若 region.zh 不这么写，那道菜在筛选里会漏掉 —— 加菜时记得看一眼。
  function regionMatches(dish) {
    if (state.region === 'all') { return true; }
    if (!dish.region || !dish.region.zh) { return false; }
    return dish.region.zh.indexOf(state.region) === 0;
  }

  // 当前的筛选 + 当前的关键词，取交集之后的结果
  function currentMatches() {
    var query = el.input.value.trim();
    var byQuery = query ? findMatches(query) : state.dishes;
    return byQuery.filter(regionMatches);
  }

  // 把 state.region 同步到按钮上。
  // aria-pressed 不只是给读屏用的 —— 样式也靠它选中，
  // 这样"看起来选中的那个"和"读屏读到的那个"不可能对不上。
  function syncFilterButtons() {
    el.filterBtns.forEach(function (btn) {
      var on = btn.getAttribute('data-region') === state.region;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* 把"当前地区"写进内存，并同步到按钮上。
     ★ 它不重画列表、也不动 hash —— 因为它是被路由调用的：
       地址栏已经是目的地了，这一步只负责把内存对齐过去、把按钮点亮。
       用户主动改筛选走的是另一条路：点按钮 → navigateToRegion() → 改 hash → 路由回来。 */
  function applyRegionKey(region) {
    state.region = region || 'all';
    syncFilterButtons();
  }

  // 按当前条件重画列表。只有"成功 / 无结果"归它管：
  // 加载中、读取失败这两态数据还没到手，筛了也没意义，直接不动。
  function refreshList() {
    if (state.listState === 'loading' || state.listState === 'error') { return; }
    if (state.dishes.length === 0) { return; }

    var list = currentMatches();

    if (list.length === 0) {
      el.dishList.innerHTML = '';
      applyState('empty', { query: el.input.value.trim(), region: state.region });
      return;
    }

    renderDishList(list);
    applyState('success');
    showFilterHint(list.length);
  }

  // 反馈层：让用户知道"现在筛的是什么、还剩几道"。
  // 复用现成的提示条，不新增元素 —— 页面上的反馈渠道越少，越看得懂。
  function showFilterHint(count) {
    var query = el.input.value.trim();
    if (state.region === 'all' && !query) { hideHint(); return; }

    var desc = '';
    if (state.region !== 'all') { desc = '地区「' + state.region + '」'; }
    if (query) {
      desc = desc ? desc + ' + 关键词「' + query + '」' : '关键词「' + query + '」';
    }

    showHint('当前条件：' + desc + ' → ' + count + ' 道 · ' +
             count + (count === 1 ? ' result' : ' results'));
  }

  /* ---------------------------------------------------------
     3. 渲染：收录列表
     --------------------------------------------------------- */
  function renderDishList(dishes) {
    el.dishList.innerHTML = '';

    dishes.forEach(function (dish) {
      var li = document.createElement('li');
      var btn = document.createElement('button');

      btn.type = 'button';
      btn.className = 'dish-entry';
      btn.setAttribute('data-id', dish.id);

      // 缩略图（数据里配了才画）。alt 留空是有意的：
      // 菜名和地区就在下面紧挨着，读屏再念一遍图片描述是重复噪音。
      if (dish.image && dish.image.thumb) {
        var thumb = document.createElement('img');
        thumb.className = 'entry-thumb';
        thumb.src = dish.image.thumb;
        thumb.alt = '';
        thumb.loading = 'lazy';     // 列表有 5 张图，先只加载看得见的
        thumb.decoding = 'async';
        btn.appendChild(thumb);
      }

      btn.appendChild(makeSpan('zh', dish.name ? dish.name.zh : ''));
      btn.appendChild(makeSpan('en', dish.name ? dish.name.en : ''));
      if (dish.region) {
        btn.appendChild(makeSpan('region', dish.region.zh + ' · ' + dish.region.en));
      }
      if (dish.status !== 'published') {
        btn.appendChild(makeSpan('pending-tag', '内容整理中 / In progress'));
      }

      // Day 13：点卡片不再自己切视图，只报出目的地（改 hash），由路由画
      btn.addEventListener('click', function () {
        window.Router.go('/dish/' + dish.id);
      });

      li.appendChild(btn);
      el.dishList.appendChild(li);
    });
  }

  function makeSpan(className, text) {
    var span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }

  /* ---------------------------------------------------------
     4. 渲染：文化卡片

     Day 13 拆过一次：原来自带"切视图 + 滚到顶"的 openDish() 已经不在了 ——
     那些属于导航，归 renderRoute() 管。这里只管把一道菜的数据填进卡片。
     --------------------------------------------------------- */
  function renderCard(dish) {
    var isPublished = (dish.status === 'published') && !!dish.blocks;

    el.nameZh.textContent = dish.name ? dish.name.zh : '';
    el.nameEn.textContent = dish.name ? dish.name.en : '';

    var metaParts = [];
    if (dish.region) { metaParts.push(dish.region.zh + ' · ' + dish.region.en); }
    metaParts.push(isPublished ? '内容已核实 · Content verified' : '内容整理中 · Content in progress');
    el.meta.textContent = metaParts.join('　·　');

    // 没有核实过的内容，一个字都不展示（PRD.md 非目标第 8 条）
    if (!isPublished) {
      var note = dish.note || {};
      el.cardFigure.hidden = true;
      el.cardNote.hidden = false;
      el.cardNote.innerHTML =
        '<p>' + escapeHtml(note.zh || '内容整理中。') + '</p>' +
        '<p class="en">' + escapeHtml(note.en || 'Content in progress.') + '</p>';
      setSectionsVisible(false);
      el.origin.innerHTML = '';
      el.story.innerHTML = '';
      el.technique.innerHTML = '';
      el.factList.innerHTML = '';
      el.sourceList.innerHTML = '';
      return;
    }

    el.cardNote.hidden = true;
    el.cardNote.innerHTML = '';
    setSectionsVisible(true);
    renderImage(dish);

    el.origin.innerHTML    = bilingual(dish, dish.blocks.origin);
    el.story.innerHTML     = bilingual(dish, dish.blocks.story);
    el.technique.innerHTML = bilingual(dish, dish.blocks.technique);

    // 关键事实清单（每一条都带出处角标）
    el.factList.innerHTML = '';
    (dish.facts || []).forEach(function (fact) {
      var li = document.createElement('li');
      // 事实的出处是写在 sources 字段里的（不像板块正文那样内嵌 [[id]] 标记），
      // 所以这里渲染完中英文之后，再把角标补在末尾。
      // 万一将来有人在正文里也内嵌了标记，就不重复追加，免得出现两组角标。
      var inlineMarks = /\[\[[A-Za-z0-9_-]+\]\]/.test(fact.zh + fact.en);
      li.innerHTML =
        '<span class="zh-text">' + richText(dish, fact.zh) + '</span>' +
        '<span class="en-text">'  + richText(dish, fact.en) + '</span>' +
        (inlineMarks ? '' : citeMarkers(dish, fact.sources));
      el.factList.appendChild(li);
    });

    // 出处列表（角标 [n] 就指向这里）
    el.sourceList.innerHTML = '';
    (dish.sources || []).forEach(function (src) {
      var li = document.createElement('li');
      li.id = 'src-' + dish.id + '-' + src.id;
      li.innerHTML =
        escapeHtml(src.title) +
        ' —— <a href="' + escapeHtml(src.url) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(src.url) + '</a>' +
        '<span class="accessed">访问日期 / accessed：' + escapeHtml(src.accessed) + '</span>';
      el.sourceList.appendChild(li);
    });
  }

  function setSectionsVisible(visible) {
    el.sections.forEach(function (section) {
      if (section) { section.hidden = !visible; }
    });
  }

  /* 详情页的美食图 + 署名行。
     署名不是可选项：这些图来自 Wikimedia Commons，许可是 CC BY-SA 4.0，
     条件之一就是「标出作者与许可」——所以这一行走的是许可要求，不是装饰。
     数据里没配图（或配得不全）就整块藏起来，不留半张空图。 */
  function renderImage(dish) {
    var img = dish.image;

    if (!img || !img.hero) {
      el.cardFigure.hidden = true;
      el.cardImage.removeAttribute('src');
      el.cardCredit.innerHTML = '';
      return;
    }

    el.cardImage.src = img.hero;
    // 详情页这张给完整描述（列表页那张用的是空 alt，两处不一样是有意的）
    el.cardImage.alt = (img.alt && img.alt.zh) || (dish.name ? dish.name.zh : '');
    if (img.heroWidth)  { el.cardImage.width  = img.heroWidth; }
    if (img.heroHeight) { el.cardImage.height = img.heroHeight; }

    var c = img.credit || {};
    var parts = [];
    if (c.author)  { parts.push('图 / Photo：' + escapeHtml(c.author)); }
    if (c.license) {
      parts.push('<a href="' + escapeHtml(c.licenseUrl || '#') +
                 '" target="_blank" rel="noopener noreferrer">' + escapeHtml(c.license) + '</a>');
    }
    if (c.page) {
      parts.push('<a href="' + escapeHtml(c.page) +
                 '" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>');
    }
    el.cardCredit.innerHTML = parts.join('　·　');
    el.cardFigure.hidden = false;
  }

  // 一个板块 = 中文段落 + 英文段落
  function bilingual(dish, block) {
    if (!block) { return ''; }
    return '<p class="zh-text">' + richText(dish, block.zh) + '</p>' +
           '<p class="en-text">' + richText(dish, block.en) + '</p>';
  }

  /* 一个来源 id 在该道菜 sources 数组里的位置（从 0 数）。
     角标序号 = 这个位置 + 1，所以角标和文末出处列表能一一对应。
     找不到就返回 -1 —— 调用方据此决定「不渲染这个角标」，避免留下点了没反应的死链。 */
  function sourceIndex(dish, sourceId) {
    var sources = dish.sources || [];
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].id === sourceId) { return i; }
    }
    return -1;
  }

  // 一个角标：<a class="cite" href="#src-luosifen-ihchina">[1]</a>
  function citeLink(dish, sourceId, index) {
    return '<a class="cite" href="#src-' + dish.id + '-' + sourceId +
           '" title="查看出处 / view source">[' + (index + 1) + ']</a>';
  }

  /* 事实条目专用：把 fact.sources 里声明的 id 列表渲染成一串角标。
     事实正文本身不含 [[id]] 标记，出处是单独声明在字段里的，所以要走这条路。 */
  function citeMarkers(dish, sourceIds) {
    if (!sourceIds || !sourceIds.length) { return ''; }

    var html = '';
    sourceIds.forEach(function (sourceId) {
      // 只接受安全字符集的 id，同时必须真能在 sources 里找到
      if (!/^[A-Za-z0-9_-]+$/.test(sourceId)) { return; }
      var index = sourceIndex(dish, sourceId);
      if (index === -1) { return; }
      html += citeLink(dish, sourceId, index);
    });

    return html ? '<span class="fact-cites">' + html + '</span>' : '';
  }

  /* 把文本里的 [[sourceId]] 标记渲染成可点的出处角标。
     例：[[ihchina]] → <a class="cite" href="#src-luosifen-ihchina">[1]</a> */
  function richText(dish, text) {
    var html = escapeHtml(text);

    html = html.replace(/\[\[([A-Za-z0-9_-]+)\]\]/g, function (whole, sourceId) {
      var index = sourceIndex(dish, sourceId);
      if (index === -1) { return ''; }
      return citeLink(dish, sourceId, index);
    });

    // 数据里用空行分段，这里换成换行（样式里已设好行高）
    return html.replace(/\n/g, '<br>');
  }

  function escapeHtml(text) {
    return String(text === null || text === undefined ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------------------------------------------------------
     5. 交互：提交搜索 / 返回 / 看全部
     --------------------------------------------------------- */
  function onSubmit(event) {
    event.preventDefault();

    var query = el.input.value.trim();

    // 空关键词：如果此刻有筛选在生效，那就不是"输错了"，而是「把筛选结果给我看」
    if (!query) {
      if (state.region !== 'all') { refreshList(); return; }
      showHint('请输入菜名，例如：螺蛳粉 / Luosifen');
      return;
    }

    // 这两种状态下先别搜：还在读、或者刚才读失败了
    if (state.listState === 'loading') {
      showHint('资料还在读取中，稍等一下再搜。· Still loading, one moment.');
      return;
    }
    if (state.listState === 'error') {
      showHint('资料还没读出来，先点上面的「重试」。· Please retry first.');
      return;
    }

    var matches = currentMatches();   // Day 12：先把筛选与关键词取交集

    // 没按地区筛、又恰好只有一道 → 直接进卡片（Day 1–11 一直有的顺手路径，不动它）。
    // 有筛选时不跳：用户正看着某个地区的子集，跳走会把这个上下文丢掉。
    if (matches.length === 1 && state.region === 'all') {
      hideHint();
      window.Router.go('/dish/' + matches[0].id);
      return;
    }

    // 其余情况（多道 / 有筛选 / 一道都没命中）统一交给 refreshList：
    // 选状态、画列表、给提示都只有一个出口，三种状态就不会互相打架
    refreshList();
  }

  /* 「看看已收录的」：把筛选和关键词一起清掉，回到完整列表。
     Day 12：空态必须能一键回到全量 —— 只清搜索框却留着筛选，
     用户会觉得"我点了怎么还是这些"，那空态就成了死胡同。
     Day 13：清条件也走路由（回到 #/）。这样"点这个按钮"和"手打 #/ 回车"
     到达的是同一个状态，不会有第二条通往"全部"的暗道。 */
  function showAllDishes() {
    el.input.value = '';
    hideHint();
    window.Router.go('/');
  }

  /* 两条提示条：列表视图一条、地区索引视图一条（各自的布局位置不同）。
     为什么不在视图之间搬来搬去：那要动 DOM 结构，而两个位置本来就是对的 ——
     下面这个函数替调用方决定"该写哪一条"，调用方不必知道有两条。 */
  function hintNodes() {
    return [el.hint, el.regionHint];
  }

  function showHint(message) {
    // 索引视图和列表视图的提示条位置不同，按"此刻露在外面的是哪个视图"挑一条
    var target = (state.viewName === 'regions' && el.regionHint) ? el.regionHint : el.hint;
    hideHint();
    if (!target) { return; }
    target.textContent = message;
    target.hidden = false;
  }

  function hideHint() {
    hintNodes().forEach(function (node) {
      if (!node) { return; }
      node.textContent = '';
      node.hidden = true;
    });
  }

  /* ---------------------------------------------------------
     6. 回到顶部（Day 10 新增）
     --------------------------------------------------------- */

  /* 往下滚超过这个距离，才让"回到顶部"按钮出现。
     取 320px：大致是"第一屏已经看完"的位置；比这更浅的地方，
     随手往回滚一下就上去了，按钮反而是多余的。 */
  var TO_TOP_AT = 320;

  function syncToTop() {
    el.toTop.hidden = window.scrollY < TO_TOP_AT;
  }

  /* 平滑滚回顶部。开了"减少动态效果"的用户，长距离滚动动画可能引起不适，
     那就退化成瞬间跳回 —— 功能一样，只是不晃。 */
  function scrollToTop() {
    var reduce = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------------------------------------------------------
     7. 复制名称与链接（Day 11 新增）

     为什么挑这个做：它是全站第一个「确认式」反馈。
     前面所有交互的反馈都是"环境变了"——页面切走、内容变多、位置移动，
     用户得自己对比前后才敢确认；而这里，**按钮自己变了样**，
     因果锁在眼皮底下，不需要对比。
     四种反馈同时给（正是今天的正题要比的四个动作）：
       ① 文案   复制名称与链接 → 已复制，可直接粘贴
       ② 视觉   实心品牌红 → 实心墨绿（整块换色）
       ③ 动效   轻微弹一下
       ④ 读屏   播报"已复制：菜名"
     --------------------------------------------------------- */

  /* 状态亮着多久后自动复位。取 1800ms：
     要够人读完"已复制，可直接粘贴"，又不能长到让人以为按钮坏了。 */
  var COPY_RESET_MS = 1800;

  // 当前的复位定时器。★ 全局只留一个 —— 原因见 setCopyState 里的说明
  var copyResetTimer = null;

  /* 要复制进剪贴板的文字。
     Day 13 更新：路由上线了，这里终于能复制"每道菜自己的网址" ——
     别人粘到浏览器里打开，直达这张卡片。当初选 hash 路由的理由之一就是这个，
     Day 11 那条"等以后加了路由，改这一个函数即可"的注释，今天兑现。 */
  function copyText(dish) {
    var zh  = dish.name ? dish.name.zh : '';
    var en  = dish.name ? dish.name.en : '';
    var url = window.location.origin + window.location.pathname + '#/dish/' + dish.id;
    return zh + ' · ' + en + '\n' + url;
  }

  /* 真正去写剪贴板。
     两套方案是有必要的：navigator.clipboard 只在"安全上下文"里存在 ——
     https 或 localhost 有；哪天用 file:// 双击打开 index.html，它就没有。
     那条兜底能让人照样复制得动。 */
  function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';    // 移出画面即可，别用 display:none —— 那样根本选不中
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');   // 老办法，新浏览器仍然支持
        document.body.removeChild(ta);
        if (ok) { resolve(); } else { reject(new Error('execCommand 返回 false')); }
      } catch (err) {
        reject(err);
      }
    });
  }

  function currentDishName() {
    var dish = state.currentDish;
    if (!dish || !dish.name) { return ''; }
    return dish.name.zh + ' ' + dish.name.en;
  }

  // 点一下按钮：复制 → 按结果切到"已复制"或"复制失败"
  function copyCardLink() {
    var dish = state.currentDish;
    if (!dish) { return; }

    writeClipboard(copyText(dish)).then(
      function () { setCopyState('copied'); },
      function () { setCopyState('failed'); }
    );
  }

  /* 按钮的三种样子：default / copied / failed。
     文案、配色、播报全在这一个地方改 —— 集中在一处，
     是为了板块③ 连着点十次时，状态不会出现两套说法。 */
  function setCopyState(kind) {
    // 先摘掉两个状态类，避免"上次失败"的颜色残留到"这次成功"上
    el.copyBtn.classList.remove('is-copied', 'is-failed');

    /* 读一次布局，逼浏览器立刻结算上面那次删除。
       不读这一下，紧接着加回同一个类名时，浏览器会认为"样式没变"，
       弹跳动画就不会重播 —— 现象是：连着点第二次没有动效。
       （只是读宽度，不会让页面闪。） */
    void el.copyBtn.offsetWidth;

    if (kind === 'copied') {
      el.copyBtn.classList.add('is-copied');
      el.copyLabel.textContent   = '已复制，可直接粘贴';
      el.copyLabelEn.textContent = 'Copied';
      announce('已复制：' + currentDishName());
    } else if (kind === 'failed') {
      el.copyBtn.classList.add('is-failed');
      el.copyLabel.textContent   = '复制失败，请手动选中';
      el.copyLabelEn.textContent = 'Copy failed';
      announce('复制失败，请手动选中上面的文字复制');
    } else {
      el.copyLabel.textContent   = '复制名称与链接';
      el.copyLabelEn.textContent = 'Copy name & link';
      announce('');
    }

    /* 定时复位。
       ★ 关键：一定先清掉上一个定时器再设新的。
       不然连点 5 次会留下 5 个定时器，最早那个到点就把状态抹掉，
       用户看到的现象是"已复制"一闪就没了 —— 这正是板块③ 要测的东西。 */
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    if (kind !== 'default') {
      copyResetTimer = setTimeout(function () { setCopyState('default'); }, COPY_RESET_MS);
    }
  }

  /* 读屏播报区。
     先清空、下一帧再写入：连点两次时文案一字不差，
     屏幕阅读器会认为"内容没变"而不重念；中间空一拍，它才会当成新消息播报。 */
  function announce(text) {
    el.copyLive.textContent = '';
    if (!text) { return; }
    window.requestAnimationFrame(function () {
      el.copyLive.textContent = text;
    });
  }

  /* 换菜 / 回列表时复位。
     注意这里也顺手清掉了待执行的定时器 ——
     否则"上一道菜的复位闹钟"会在下一道菜上把状态抹掉。 */
  function resetCopy() {
    setCopyState('default');
  }

  /* ---------------------------------------------------------
     8. 渲染：地区索引（Day 13 新增的第三个视图）

     它是三个视图里唯一的"目录页"（一级）。数据零新增：
       · 分区归属、省名、英文名、slug → 上面那张 REGIONS 静态表
       · 「已收录几道」               → 由现有 dishes 现算
     所以全站内容数据仍然只有 data/dishes.json 这一个来源（TECH_DESIGN.md §11.5）。
     --------------------------------------------------------- */

  /* 某个地区已收录几道。
     判定规则与筛选完全一致（region.zh 以省名开头），
     所以"索引上写着 2 道"和"点进去筛出 2 道"不可能对不上 ——
     两处用同一条规则，就不会有第二套说法。 */
  function countByRegion(key) {
    return state.dishes.filter(function (dish) {
      return dish.region && dish.region.zh && dish.region.zh.indexOf(key) === 0;
    }).length;
  }

  function renderRegionIndex() {
    var host = el.regionGroups;
    if (!host) { return; }
    host.innerHTML = '';

    /* 三种非正常态由 renderRoute → applyState 统一管，这里只管"成功态" ——
       一个函数只管一件事。两处都管，就会出现"谁说了算"的争论，
       而那种争论没有赢家：页面会时对时错，且很难复现。 */

    REGION_GROUPS.forEach(function (group) {
      var items = REGIONS.filter(function (r) { return r.group === group.name; });
      if (!items.length) { return; }

      var section = document.createElement('section');
      section.className = 'region-group';

      var title = document.createElement('h3');
      title.className = 'region-group-title';
      title.innerHTML = escapeHtml(group.name) +
                        ' <span class="en">' + escapeHtml(group.en) + '</span>';
      section.appendChild(title);

      var ul = document.createElement('ul');
      ul.className = 'region-list';

      items.forEach(function (region) {
        ul.appendChild(makeRegionItem(region));
      });

      section.appendChild(ul);
      host.appendChild(section);
    });
  }

  function makeRegionItem(region) {
    var count = countByRegion(region.key);

    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'region-card' + (count ? '' : ' is-empty');

    btn.appendChild(makeSpan('zh', region.key));
    btn.appendChild(makeSpan('en', region.en));
    btn.appendChild(makeSpan('region-count', count
      ? '已收录 ' + count + ' 道 · ' + count + (count === 1 ? ' dish' : ' dishes')
      : '暂未收录 · Not yet'));

    /* 已收录的 → 跳到"该地区的列表"（二级视图）；
       还没收录的 → 不跳，只给一句话。
       ★ 不跳比"跳进一个空列表"更诚实：用户点它是想知道"这里有什么"，
         而不是想看一句"什么都没有"。 */
    btn.addEventListener('click', function () {
      if (count) {
        window.Router.go('/region/' + region.slug);
      } else {
        showHint('「' + region.key + '」的代表菜还在整理，没有上线。' +
                 '· Not covered yet — coming soon.');
      }
    });

    li.appendChild(btn);
    return li;
  }

})();
