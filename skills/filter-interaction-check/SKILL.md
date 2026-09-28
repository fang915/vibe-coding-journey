---
name: filter-interaction-check
description: 「寻味 / Xunwei」筛选与搜索交互的提交前自检清单。当你改动了筛选条、搜索框或列表渲染逻辑，需要确认三种情况（有结果 / 无结果 / 清空恢复）都正常时使用。它会逐条量出数字并给出「过 / 不过」的结论，而不是给"看起来还行"。
agent_created: true
---

# 筛选交互自检 · Filter interaction check

## 这个 Skill 干什么

对「寻味 / Xunwei」的**筛选 + 搜索**交互做一次提交前自检。覆盖三种情况、四种反馈渠道、
无障碍与工程卫生。**每条判据都给数字，不给主观判断。**

## 什么时候用

- 改动了 `index.html` 的筛选条、`js/app.js` 的筛选或搜索逻辑、`css/style.css` 里筛选相关样式之后。
- 提交之前。

## 什么时候不用

- 只改了详情页内容或卡片排版 —— 那些不走筛选路径。
- 数据文件增删了菜，且地区按钮没同步增删 —— 先补按钮，否则判据① 会误报。

## 前置条件

| 项 | 值 |
|---|---|
| 站点根目录 | `D:\桌面文件\vibe coding实战` |
| 本地服务器 | `http://127.0.0.1:8000/` |
| 调试端口 | `127.0.0.1:9333`（无头 Edge） |
| Node | `C:/Users/方/.workbuddy/binaries/node/versions/22.22.2-3/node.exe` |
| Python | `C:/Users/方/.workbuddy/binaries/python/versions/3.13.12/python.exe` |

启动服务器与无头浏览器（都用后台方式起）：

```bash
"C:/Users/方/.workbuddy/binaries/python/versions/3.13.12/python.exe" -m http.server 8000 \
  --bind 127.0.0.1 --directory "D:/桌面文件/vibe coding实战"

"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu \
  --remote-debugging-port=9333 --user-data-dir="C:\ProgramData\edge-filter-check" \
  --window-size=1080,700 "http://localhost:8000/"
```

**连页面时必须按网址挑 target。** 调试端口上常混进 Edge 自己的弹窗页：

```js
const page = list.find((t) => t.type === 'page' && (t.url || '').indexOf('localhost:8000') === 0);
```

## 怎么执行

```bash
"C:/Users/方/.workbuddy/binaries/node/versions/22.22.2-3/node.exe" \
  "D:/桌面文件/vibe coding实战/skills/filter-interaction-check/scripts/check-filter.js"
```

脚本把下面六条判据逐条断言，打印每条的实测值，截图存进 `screenshots/`，
最后给一行「汇总：N / M 通过」。跑完把输出粘进 `USAGE.md`。

视口由脚本固定成 1080×720 —— 无头浏览器默认窗口更窄，会把布局结论带偏。

## 依赖的页面契约

判据要靠这些选择器定位元素。**实现筛选条时必须满足下表**，否则判据失效：

| 选择器 | 含义 |
|---|---|
| `#region-filter` | 筛选按钮组的容器，需 `role="group"` 且 `aria-label` 非空 |
| `.filter-btn` | 每个地区按钮；`<button type="button">` |
| `[data-region]` | 按钮的地区键：`all` / `广西` / `甘肃` / `福建` / `云南` / `天津` |
| `aria-pressed` | 选中态为 `"true"`，其余为 `"false"` |
| `#dish-list` | 结果列表 |
| `#state-empty` | 无结果时的空态容器 |
| `#state-empty-all-btn` | 空态里的一键恢复按钮 |

## 六条判据

### ① 三态齐全（有结果 / 无结果 / 清空恢复）

| 情况 | 操作 | 通过标准 |
|---|---|---|
| 有结果 | 点「广西」 | 列表恰好 **1** 条，且该条 `data-id === "luosifen"` |
| 无结果 | 保持「广西」，搜索框输入「兰州」并提交 | 列表 **0** 条；`#state-empty` 可见；`#dish-list` 不可见 |
| 清空恢复 | 点「全部」，并清空搜索框后提交 | 列表 **5** 条 |

### ② 每态都有可感知反馈

- 选中态按钮：`aria-pressed === "true"`，且**存在非颜色线索**（字重变化或勾选标记或边框变化）。
- 无结果态：必须有说明文字 + 一个恢复按钮，不能是空白。
- 通过标准：三种状态各自至少能量出 1 项变化（文案 / 属性 / 配色）。

### ③ 筛选与搜索是「交集」而不是「并集」

- 单独搜「兰州」得 1 条；单独点「广西」得 1 条；**两者叠加必须得 0 条**。
- 若叠加得到 2 条，说明实现成了 OR。**这是本条唯一要防的错。**

### ④ 空态不是死胡同

- 点空态里的恢复按钮后，三样东西都要复位：筛选回到「全部」、搜索框清空、列表恢复 5 条。
- 只复位其中一样 → 不过。

### ⑤ 无障碍（Accessibility）

- 选中项不靠颜色区分：`aria-pressed` 存在且值正确。
- 键盘可达：Tab 能走到每个筛选按钮；Enter 或 Space 能触发；焦点可见（实测 `outline-width >= 2px` 或 `box-shadow` 不是 `none`）。
- 对比度：选中态按钮「文字色 vs 底色」≥ **4.5:1**（WCAG 1.4.3）。
- 按钮组有可读组名：`#region-filter` 的 `aria-label` 非空。

### ⑥ 工程卫生

- 横向溢出：1080 视口下 `document.documentElement.scrollWidth <= window.innerWidth`。
- JS 报错：`console.error` 与 `pageerror` 合计 **0** 条。
- 版本号同步：`css/style.css`、`js/data-source.js`、`js/app.js` 三处 `?v=` 的值**完全一致**。

## 报告格式

必须输出成表格，每条给出实测值：

```
判据              实测                          判定
① 三态齐全        1条 / 0条+空态可见 / 5条       通过
② 反馈齐全        三态均有可量出的变化            通过
③ 叠加为交集      1 + 1 叠加 = 0 条              通过
④ 空态可恢复      筛选/搜索/列表 三处均复位       通过
⑤ 无障碍          aria-pressed 正确 / 焦点 2px / 4.8:1   通过
⑥ 工程卫生        溢出 0px / 报错 0 条 / 版本号一致       通过
汇总：6 / 6 通过        （未通过的逐条列出实测值）
```

**没有数字的断言等于没检查。** 不许写「看起来正常」。

## 出岔子怎么办

| 症状 | 处理 |
|---|---|
| 端口 9333 没反应 | 重新起无头 Edge；若上次没退干净，换一个 `--user-data-dir` |
| 判断「显示没有」全是 true | 只看 `el.hidden` 会漏掉「祖先被隐藏」。统一用 `el.getClientRects().length > 0` |
| 按钮宽度跳来跳去 | `getBoundingClientRect()` 含 transform（动画缩放）。量布局要用 `offsetWidth` |
| 改了代码页面没变 | 三处 `?v=` 没一起改，浏览器用了旧的。三处同步后再看 |
| 页面里没有 `#region-filter` | 筛选条还没实现，或 id 写错了。先对齐上面的「依赖的页面契约」 |

## 不查什么

- 不查详情页排版、不查图片能否加载、不查内容是否准确 —— 那些是别的活。
- 不替你修复。它只报告「过 / 不过」。

## 调用记录

每次跑完，把报告追加到 `skills/filter-interaction-check/USAGE.md`，
格式：日期 + 触发原因 + 六条实测值 + 汇总。这样「什么时候跑过、当时什么结果」有据可查。
