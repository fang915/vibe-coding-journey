/* =========================================================
   寻味 / Xunwei —— 前端逻辑（Day 8：补齐四种页面状态）
   技术约束（见 TECH_DESIGN.md §2）：原生 JavaScript，无框架、无依赖。

   这个文件做五件事：
     1. 让 js/data-source.js 把数据取回来（数据从哪来，这里不管）
     2. 按用户输入的关键词找出匹配的美食
     3. 把结果画到页面上（检索视图 / 文化卡片视图）
     4. 监听滚动，决定"回到顶部"按钮什么时候出现（Day 10 新增）
     5. 详情页的"复制名称与链接"，并给四重反馈（Day 11 新增）

   ⚠️ 四种页面状态（Day 8 的正题）——同一时刻只亮一个，切换一律走 applyState()：
     success  成功   —— 列表 / 卡片正常显示
     loading  加载中 —— 骨架屏
     empty    无结果 —— 数据一条都没有，或者搜索没命中
     error    失败   —— 读不到数据，给一个「重试」按钮
   ========================================================= */

(function () {
  'use strict';

  // 内存里的数据和当前状态
  var state = {
    dishes: [],          // 全部美食
    loaded: false,       // 数据是否已经成功读进来
    listState: 'loading',// 列表区当前是四种状态里的哪一种
    currentDish: null    // 详情页正在看的那一道（Day 11：复制按钮要知道复制的是哪道菜）
  };

  // 页面上要反复用到的元素，统一在 init 里取一次
  var el = {};

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
    el.backBtn     = document.getElementById('back-btn');
    el.toTop       = document.getElementById('to-top');   // Day 10

    // Day 11：复制按钮 + 它的读屏播报区
    el.copyBtn     = document.getElementById('copy-btn');
    el.copyLabel   = document.getElementById('copy-label');
    el.copyLabelEn = document.getElementById('copy-label-en');
    el.copyLive    = document.getElementById('copy-live');

    // 三种"非正常"状态的容器
    el.stateLoading   = document.getElementById('state-loading');
    el.stateEmpty     = document.getElementById('state-empty');
    el.stateEmptyText = document.getElementById('state-empty-text');
    el.stateEmptyAll  = document.getElementById('state-empty-all-btn');
    el.stateError     = document.getElementById('state-error');
    el.stateErrorText = document.getElementById('state-error-text');
    el.retryBtn       = document.getElementById('retry-btn');

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
    el.backBtn.addEventListener('click', showSearchView);
    el.copyBtn.addEventListener('click', copyCardLink);         // Day 11：复制并反馈
    el.retryBtn.addEventListener('click', loadDishes);          // 失败 → 重试
    el.stateEmptyAll.addEventListener('click', showAllDishes);  // 没搜到 → 看全部

    // Day 10：回到顶部。
    // passive: true 是告诉浏览器"这个监听里不会阻止滚动"，滚动因此更顺、不掉帧。
    el.toTop.addEventListener('click', scrollToTop);
    window.addEventListener('scroll', syncToTop, { passive: true });
    syncToTop();   // 刷新页面时可能停在中间，先按当前位置对一次

    loadDishes();
  }

  /* ---------------------------------------------------------
     状态切换：先把四种状态全部熄灯，再点亮要显示的那一个
     --------------------------------------------------------- */
  function applyState(name, opts) {
    opts = opts || {};
    state.listState = name;

    // 熄灯
    el.stateLoading.hidden = true;
    el.stateEmpty.hidden   = true;
    el.stateError.hidden   = true;
    el.listTitle.hidden    = true;
    el.dishList.hidden     = true;

    if (name === 'loading') {
      el.stateLoading.hidden = false;
      return;
    }

    if (name === 'empty') {
      if (opts.dataEmpty) {
        // 情况一：数据本身就是空的
        el.stateEmptyText.textContent = '目前还没有收录任何美食。· Nothing here yet.';
        el.stateEmptyAll.hidden = true;
      } else {
        // 情况二：搜索没命中
        var q = opts.query || '';
        el.stateEmptyText.textContent =
          '暂未收录「' + q + '」。换个说法再试试，比如：螺蛳粉 / Luosifen' +
          ' · Not found: “' + q + '”';
        el.stateEmptyAll.hidden = false;
      }
      el.stateEmpty.hidden = false;
      return;
    }

    if (name === 'error') {
      el.stateErrorText.textContent = opts.message || '资料没能读出来，点下面重试一次。';
      el.stateError.hidden = false;
      return;
    }

    // success
    el.listTitle.hidden = false;
    el.dishList.hidden  = false;
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

        if (state.dishes.length === 0) {
          el.dishList.innerHTML = '';
          applyState('empty', { dataEmpty: true });
          return;
        }

        renderDishList(state.dishes);
        applyState('success');
      })
      .catch(function (err) {
        state.loaded = false;
        applyState('error', {
          message:
            '可能是文件读取或网络出了问题。如果你是在文件夹里双击 index.html 打开的，' +
            '请改用本地服务器打开（这不是你写错了，是浏览器的安全规则）。' +
            '技术信息：' + err.message
        });
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

      btn.addEventListener('click', function () { openDish(dish.id); });

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
     --------------------------------------------------------- */
  function openDish(id) {
    var dish = state.dishes.filter(function (d) { return d.id === id; })[0];
    if (!dish) {
      showHint('没找到这道菜的数据。');
      return;
    }
    state.currentDish = dish;   // Day 11：复制按钮要知道复制的是哪一道
    resetCopy();                // 换了一道菜，按钮先复位成默认样子
    renderCard(dish);
    el.searchView.hidden = true;
    el.cardView.hidden = false;
    window.scrollTo(0, 0);
    syncToTop();   // 立即把"回到顶部"收起来，不等 scroll 事件绕一圈
  }

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
    if (!query) {
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

    var matches = findMatches(query);

    // 恰好一道 → 直接进卡片
    if (matches.length === 1) {
      hideHint();
      openDish(matches[0].id);
      return;
    }

    // 命中多道 → 只显示这几道
    if (matches.length > 1) {
      showHint('找到 ' + matches.length + ' 道与「' + query + '」相关的美食 · ' +
               matches.length + ' results for “' + query + '”');
      renderDishList(matches);
      applyState('success');
      return;
    }

    // 一道都没命中 → 走"无结果"状态（不再是页面顶上的一行小字）
    hideHint();
    el.dishList.innerHTML = '';
    applyState('empty', { query: query });
  }

  // 「看看已收录的」：清空搜索框，回到完整列表
  function showAllDishes() {
    el.input.value = '';
    hideHint();
    if (state.dishes.length === 0) { return; }
    renderDishList(state.dishes);
    applyState('success');
  }

  function showSearchView() {
    state.currentDish = null;   // Day 11：离开详情页就把复制目标清掉
    resetCopy();                // 免得"已复制"残留到下次进详情时还亮着
    el.cardView.hidden = true;
    el.searchView.hidden = false;
    window.scrollTo(0, 0);
    syncToTop();
  }

  function showHint(message) {
    el.hint.textContent = message;
    el.hint.hidden = false;
  }

  function hideHint() {
    el.hint.textContent = '';
    el.hint.hidden = true;
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
     目前网站没有"每道菜一个网址"（没做路由），所以链接复制的是本站首页。
     这是诚实的做法：宁可能力小一点，也不复制一个点开打不开的假链接。
     等以后加了路由（比如 #dish-luosifen），改这一个函数即可，别处不用动。 */
  function copyText(dish) {
    var zh  = dish.name ? dish.name.zh : '';
    var en  = dish.name ? dish.name.en : '';
    var url = window.location.origin + window.location.pathname;
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

})();
