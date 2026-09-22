/* =========================================================
   寻味 / Xunwei —— MVP v0.1 前端逻辑
   技术约束（见 TECH_DESIGN.md §2）：原生 JavaScript，无框架、无依赖。
   这个文件只做三件事：
     1. 把 data/dishes.json 读进内存
     2. 按用户输入的关键词找出匹配的美食
     3. 把结果画到页面上（检索视图 / 文化卡片视图）
   ========================================================= */

(function () {
  'use strict';

  var DATA_URL = 'data/dishes.json';

  // 内存里的数据：一次读入，后面反复用
  var state = {
    dishes: [],   // 全部美食
    loaded: false
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
    el.dishList    = document.getElementById('dish-list');
    el.backBtn     = document.getElementById('back-btn');

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

    loadData();
  }

  /* ---------------------------------------------------------
     1. 读数据
     --------------------------------------------------------- */
  function loadData() {
    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (data) {
        state.dishes = (data && data.dishes) || [];
        state.loaded = true;
        renderDishList(state.dishes);
      })
      .catch(function (err) {
        // 最常见的失败原因：直接双击 index.html 打开（浏览器的同源策略不允许读本地 json）
        showHint(
          '数据没能读出来。如果你是在文件夹里双击 index.html 打开的，请改用本地服务器打开' +
          '（这不是你写错了，是浏览器的安全规则）。技术信息：' + err.message
        );
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
     5. 交互：提交搜索 / 返回
     --------------------------------------------------------- */
  function onSubmit(event) {
    event.preventDefault();

    var query = el.input.value.trim();
    if (!query) {
      showHint('请输入菜名，例如：螺蛳粉 / Luosifen');
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
      return;
    }

    // 一道都没命中 → 明确说"暂未收录"，并把全部收录列表摆出来
    showHint('暂未收录「' + query + '」。目前已收录 ' + state.dishes.length +
             ' 道美食，见下方列表。 · Not found: “' + query + '”. Showing all ' +
             state.dishes.length + ' included dishes.');
    renderDishList(state.dishes);
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
