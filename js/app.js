/* =========================================================
   寻味 / Xunwei —— 前端逻辑（Day 8：补齐四种页面状态）
   技术约束（见 TECH_DESIGN.md §2）：原生 JavaScript，无框架、无依赖。

   这个文件只做三件事：
     1. 让 js/data-source.js 把数据取回来（数据从哪来，这里不管）
     2. 按用户输入的关键词找出匹配的美食
     3. 把结果画到页面上（检索视图 / 文化卡片视图）

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
    listState: 'loading' // 列表区当前是四种状态里的哪一种
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
    el.retryBtn.addEventListener('click', loadDishes);          // 失败 → 重试
    el.stateEmptyAll.addEventListener('click', showAllDishes);  // 没搜到 → 看全部

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
    renderCard(dish);
    el.searchView.hidden = true;
    el.cardView.hidden = false;
    window.scrollTo(0, 0);
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

    el.origin.innerHTML    = bilingual(dish, dish.blocks.origin);
    el.story.innerHTML     = bilingual(dish, dish.blocks.story);
    el.technique.innerHTML = bilingual(dish, dish.blocks.technique);

    // 关键事实清单（每一条都带出处角标）
    el.factList.innerHTML = '';
    (dish.facts || []).forEach(function (fact) {
      var li = document.createElement('li');
      li.innerHTML =
        '<span class="zh-text">' + richText(dish, fact.zh) + '</span>' +
        '<span class="en-text">'  + richText(dish, fact.en) + '</span>';
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

  // 一个板块 = 中文段落 + 英文段落
  function bilingual(dish, block) {
    if (!block) { return ''; }
    return '<p class="zh-text">' + richText(dish, block.zh) + '</p>' +
           '<p class="en-text">' + richText(dish, block.en) + '</p>';
  }

  /* 把文本里的 [[sourceId]] 标记渲染成可点的出处角标。
     例：[[ihchina]] → <a class="cite" href="#src-luosifen-ihchina">[1]</a>
     序号就是该来源在 sources 数组里的位置 —— 所以角标和文末出处列表能一一对应。 */
  function richText(dish, text) {
    var sources = dish.sources || [];
    var html = escapeHtml(text);

    html = html.replace(/\[\[([A-Za-z0-9_-]+)\]\]/g, function (whole, sourceId) {
      var index = -1;
      for (var i = 0; i < sources.length; i++) {
        if (sources[i].id === sourceId) { index = i; break; }
      }
      if (index === -1) { return ''; }
      return '<a class="cite" href="#src-' + dish.id + '-' + sourceId +
             '" title="查看出处 / view source">[' + (index + 1) + ']</a>';
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
    el.cardView.hidden = true;
    el.searchView.hidden = false;
    window.scrollTo(0, 0);
  }

  function showHint(message) {
    el.hint.textContent = message;
    el.hint.hidden = false;
  }

  function hideHint() {
    el.hint.textContent = '';
    el.hint.hidden = true;
  }

})();
