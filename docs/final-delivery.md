# 结营交付说明 —— 运行、技术路线、数据库 / 部署 / 额度 / 到期 / 备份、200 字总结

> 对应结营交付清单的三项：**运行和技术路线说明**、**数据库、部署、额度、到期和备份说明（不含密钥）**、**200 字以内结营总结**。
> 本文不含任何密钥；口令类信息一律指向环境变量或 `.env.example`。

---

## 1. 运行说明

### 线上（公网，随时可看）

| 什么 | 地址 |
|---|---|
| 网站 | https://vibecodingstudy-d1f1el6a03d5aad8-1499243471.tcloudbaseapp.com/ |
| 健康接口 | `…ap-shanghai.app.tcloudbase.com/api/health` → `{"ok":true,"service":"xunwei"}` |
| 菜品列表 | `/api/dishes`（支持 `q` 关键词 / `region` / `limit` / `offset`） |
| 地区索引 | `/api/regions`（34 个省级行政区 + 每省收录数） |

首次访问会看到腾讯云的「风险提醒」中间页，点「确定访问」即进站（按钮有 3 秒倒计时）——那不是坏页面。

### 本地

- 仓库 clone 后直接用浏览器打开 `index.html` 即可——页面数据来自公网接口，本地无需数据库。
- 离线自测：`node tests/api-shape.test.js`（73 项）。
- 发布前检查：`node skills/pre-release-check/scripts/check-release.mjs`（判据见该 Skill 的 `SKILL.md`）。
- 修改前端后要发布：改 `index.html` / `css` / `js` / `data` / `assets` → 在 CloudBase 控制台静态托管上传同名文件（流程见 `docs/rollback-manual.md`）。

## 2. 技术路线（28 天怎么走到这里）

1. **Week 1（研究 → 设计）**：research（权威资料 vs 社交平台两条路都不通）→ PRD（目标用户：在华外国人；非目标：不做用户体系 / UGC）→ 技术设计 → AGENTS.md 协作规则。
2. **Week 2（本地 MVP）**：`index.html` + `js/app.js` + `css` + `data/dishes.json` 本地 mock；hash 路由三视图（首页列表 / 详情卡 / 地区筛选）；中英双语卡片、事实带可点出处。
3. **Week 3（后端与发布）**：CloudBase 环境 + PostgreSQL（7 张表：dishes / dish_aliases / dish_facts / dish_sources / dish_fact_sources 等）；`api-contract.md` 定契约（用户侧只读、策展端三条写接口带口令）；云函数 `health` + `api`（GET×3 / POST / PATCH / DELETE，错误分支 400/401/404/405/409）；图片兜底（本地占位 SVG + 图源开关）；发布前检查 Skill；v1.0 版本发布与回滚演练。
4. **结营（Day 27–28）**：第三方真人试用（T1 手机端全流程零卡点）+ 额度自查 + 附录 J 验收。

关键设计口径（已定案）：**用户侧零写接口；策展端 POST / PATCH / DELETE 三条接口，用 `X-Admin-Token` 请求头口令保护，口令在云函数环境变量里，不入库不入仓**。

## 3. 数据库、部署、额度、到期和备份

### 数据库

- PostgreSQL（CloudBase 环境 `vibecodingstudy-d1f1el6a03d5aad8`），7 张表，初始化脚本：`db/schema.sql`（建表）+ `db/seed.sql`（种子数据，12 道菜的基线）。
- 库里现存 **13 道**：第 13 道「佛跳墙」是通过 `POST /api/dishes` 真实写入的（`data/dishes.json` 里没有）——这本身就是「真实写入 + 持久化」的活证据。
- 已知欠账：`db/seed.sql`（12 道）与库（13 道）不同步，扩数据前先找平。

### 部署

- 静态托管：控制台上传 `index.html` / `css` / `js` / `data` / `assets`；HTML 响应头 `cache-control: no-store`，传完即生效。
- 云函数：`health`、`api` 两个函数，改动后控制台上传覆盖。
- 版本与回退：静态托管无一键回退；回退 = 重传上一版产物覆盖。上一版快照在仓库 `releases/v0.1/`，重建命令必须 `git -c core.autocrlf=false archive <tag>`（默认会换行转换导致哈希不符）。完整手册：`docs/rollback-manual.md`。

### 额度（2026-10 截至Day 27，控制台截图见 `user-test/screenshots/day27-额度-套餐用量*.png`）

- 套餐周期 10-01 至 11-01；本月总消耗约 653.7 点，**无告警**。
- 大头是 PostgreSQL（CU 1.91 秒时 / 容量 2.5 GB·时）；云函数 148 次调用、环境 API 调用 437 次 + HTTP 180 次，量级很轻。

### 到期

- 环境有效期至 **2027-04-01**（开通时记录）。套餐每月 1 日重置。到期前如需续用，以控制台环境详情页显示为准。

### 备份

- **代码与页面**：GitHub 仓库 `fang915/vibe-coding-journey`（public），每次课程日一提交；`releases/v0.1/` 存有上一版逐字节快照，另有 `v0.1` / `v1.0` 两个 git 标签。
- **数据**：当前可靠路径 = 控制台 SQL 编辑器导出 / `SELECT` 备份（**实操未演练**，如实标注）；`db/seed.sql` 是 12 道菜的基线（不含后写入的佛跳墙）。数据恢复演练与云函数回退演练列入结营后待办。

## 4. 结营总结（最终版 · 2026-10-14 定稿）

在这 28 天的打卡当中，完整地体验了如何把想法落地并且打造一个作品——寻味。我有一个很深的感触，就是想要完成一个作品的前提是清晰地知道自己想要什么样的产品，并且学会向 AI 提问，使用 AI。

（共 90 字，要求 ≤200 字。定稿由 Amity 自己撰写；仅修正了两处笔误：补「28 天」缺的「天」字、`ai` → `AI`。原始措辞未改。）
