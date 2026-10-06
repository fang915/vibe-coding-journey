# -*- coding: utf-8 -*-
"""
make-seed.py —— 从 data/dishes.json + js/app.js 生成 db/seed.sql（种子数据）。

【为什么要有这个脚本，而不是手写 seed.sql】
  种子数据不是"想几条写几条"。它有两个硬要求：
    ① 必须与 data/dishes.json 一字不差（12 道菜、108 条别名、90 条事实、33 条出处、
       101 条"事实→出处"关系）；
    ② 里面有两个"算出来的列"（dishes.search_text / dish_aliases.alias_norm），
       而算它们的规则必须**和前端 js/app.js 的 normalize() 逐字一致** ——
       规则一旦两份，就会出现"页面上搜得到、接口搜不到"（契约 §3.2 的告警）。
  所以：脚本是唯一的"翻译官"，人只读结果。以后加菜 → 改 dishes.json → 重跑本脚本。

【它做了什么】
  1. 正则读 js/app.js：34 个省级行政区（REGIONS）+ 8 个地理分区（REGION_GROUPS）；
  2. 读 data/dishes.json：12 道菜；
  3. 算派生列：search_text、alias_norm（规则 = 转小写 + 去掉 空格 · ・ - _ / （）()「」【】）；
  4. 按「先删后插、倒序删」生成可重复执行的 INSERT，末尾附一条自查 SELECT；
  5. 跑 14 道自检，任何一道不过就**不产出文件**。

【用法】任意目录下执行：
    python db/tools/make-seed.py
"""

import io
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))            # db/tools -> db -> 项目根
APP_JS = os.path.join(ROOT, "js", "app.js")
DISHES = os.path.join(ROOT, "data", "dishes.json")
DST = os.path.join(ROOT, "db", "seed.sql")

# 8 个分区的 id（与 TECH_DESIGN.md §13.4 一致；中文名 → ASCII id）
GROUP_IDS = {
    "华北": "north",
    "东北": "northeast",
    "华东": "east",
    "华中": "central",
    "华南": "south",
    "西南": "southwest",
    "西北": "northwest",
    "港澳台": "hmt",
}

# ★★ 归一化规则：必须与 js/app.js 的 normalize() 逐字一致
#     JS: .toLowerCase().replace(/[\s·・\-_/（）()「」【】]/g, '')
#     JS 的 \s 展开 = 下面第一行（含 \ufeff）；第二行是那几个分隔符，
#     其中 - 放在字符类**最末尾**表示它自己（不是范围）。
NORM_RE = re.compile(u"[\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
                     u"\u00b7\u30fb\u005f\u002f\uff08\uff09\u0028\u0029\u300c\u300d\u3010\u3011\u002d]+")


def normalize(text):
    """与前端同一套规则：转小写 + 去掉空白与 · ・ - _ / （） () 「」 【】。"""
    return NORM_RE.sub("", text.lower())


def sql_lit(value):
    """Python 值 → SQL 字面量。None → NULL；字符串里的单引号按 SQL 规矩写成两个。"""
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    return "'" + value.replace("'", "''") + "'"


# ---------------------------------------------------------------- 读源数据

def read_js_tables():
    """从 js/app.js 里正则读出分区表与 34 个省级行政区。

    为什么用正则而不是"import 一份数据"：app.js 是浏览器脚本，Python 跑不了。
    正则脆，所以下面立刻做了数量与顺序的自检 —— 一旦 app.js 改了写法，这里会当场报错，
    而不是悄悄生成一份错的种子。
    """
    src = io.open(APP_JS, encoding="utf-8").read()

    m = re.search(r"var REGION_GROUPS = \[(.*?)\];", src, re.S)
    if not m:
        raise SystemExit(u"！在 js/app.js 里找不到 REGION_GROUPS")
    groups = re.findall(r"\{\s*name:\s*'([^']+)',\s*en:\s*'([^']+)'\s*\}", m.group(1))

    m = re.search(r"var REGIONS = \[(.*?)\];", src, re.S)
    if not m:
        raise SystemExit(u"！在 js/app.js 里找不到 REGIONS")
    rows = re.findall(
        r"\{\s*group:\s*'([^']+)',\s*key:\s*'([^']+)',\s*en:\s*'([^']+)',\s*slug:\s*'([^']+)'\s*\}",
        m.group(1))
    return groups, rows


def read_dishes():
    return json.load(io.open(DISHES, encoding="utf-8"))


# ---------------------------------------------------------------- 组织数据

def build_regions(groups, raw):
    """把 app.js 的扁平省份表，摊成 regions 表的 34 行。"""
    group_order_of = {}
    for i, (name_zh, name_en) in enumerate(groups):
        group_order_of[name_zh] = (i + 1, name_en, GROUP_IDS.get(name_zh))

    seq_in_group = {}
    out = []
    for group_zh, key, en, slug in raw:
        if group_zh not in group_order_of:
            raise SystemExit(u"！省份「%s」的分区「%s」不在 REGION_GROUPS 里" % (key, group_zh))
        seq_in_group[group_zh] = seq_in_group.get(group_zh, 0) + 1
        go, group_en, gid = group_order_of[group_zh]
        out.append({
            "slug": slug, "name_zh": key, "name_en": en,
            "group_id": gid, "group_name_zh": group_zh, "group_name_en": group_en,
            "group_order": go, "sort_order": seq_in_group[group_zh],
        })
    return out


def region_of_dish(region_zh, regions):
    """一道菜的 region.zh（如「广西柳州」）落在哪个省？

    规则与前端 regionKeyOf() 完全一样：**按 REGIONS 的顺序找第一个前缀命中的**。
    顺序不能乱 —— 山西排在陕西前面，否则「山西」会先被「陕西」…（本例不会，但规则要一致）。
    """
    for r in regions:
        if region_zh.startswith(r["name_zh"]):
            return r
    return None


def build_dish_rows(dishes, regions):
    rows = []
    for i, d in enumerate(dishes):
        reg = region_of_dish(d["region"]["zh"], regions)
        if reg is None:
            raise SystemExit(u"！%s：region.zh「%s」不以任何省名开头" % (d["id"], d["region"]["zh"]))
        img = d.get("image")
        # ★ search_text：先各自归一化、再用 '|' 拼起来。
        #   用 '|' 当分隔符是因为归一化**不会**去掉它（规则里没它），
        #   于是「甘肃」不会跨字段匹配到别的字段尾巴上。
        #   （前端是逐字段 indexOf，天然不会跨字段；这里用分隔符把边界还回来。）
        search_src = [d["id"], d["name"]["zh"], d["name"]["en"],
                      d["region"]["zh"], d["region"]["en"]]
        search_text = "|".join(normalize(s) for s in search_src)

        rows.append({
            "id": d["id"],
            "status": d["status"],
            "name_zh": d["name"]["zh"],
            "name_en": d["name"]["en"],
            "region_slug": reg["slug"],
            "region_zh": d["region"]["zh"],
            "region_en": d["region"]["en"],
            "tagline_zh": d["tagline"]["zh"],
            "tagline_en": d["tagline"]["en"],
            "block_origin_zh": d["blocks"]["origin"]["zh"],
            "block_origin_en": d["blocks"]["origin"]["en"],
            "block_story_zh": d["blocks"]["story"]["zh"],
            "block_story_en": d["blocks"]["story"]["en"],
            "block_technique_zh": d["blocks"]["technique"]["zh"],
            "block_technique_en": d["blocks"]["technique"]["en"],
            "note_zh": (d.get("note") or {}).get("zh"),
            "note_en": (d.get("note") or {}).get("en"),
            "image_thumb_url": (img or {}).get("thumb"),
            "image_thumb_width": (img or {}).get("thumbWidth"),
            "image_thumb_height": (img or {}).get("thumbHeight"),
            "image_hero_url": (img or {}).get("hero"),
            "image_hero_width": (img or {}).get("heroWidth"),
            "image_hero_height": (img or {}).get("heroHeight"),
            "image_alt_zh": ((img or {}).get("alt") or {}).get("zh"),
            "image_alt_en": ((img or {}).get("alt") or {}).get("en"),
            "image_credit_author": ((img or {}).get("credit") or {}).get("author"),
            "image_credit_license": ((img or {}).get("credit") or {}).get("license"),
            "image_credit_license_url": ((img or {}).get("credit") or {}).get("licenseUrl"),
            "image_credit_page": ((img or {}).get("credit") or {}).get("page"),
            "search_text": search_text,
            "sort_order": i + 1,
        })
    return rows


# ---------------------------------------------------------------- 自检

def self_check(dishes, regions, dish_rows, groups):
    """14 道自检。任何一道不过 → 抛 SystemExit，不产出文件。"""
    fails = []
    notes = []

    def want(cond, msg):
        if not cond:
            fails.append(msg)

    # ① 地区 34 行、8 个分区、slug 与中文名都不重复
    want(len(regions) == 34, u"① regions 应为 34 行，实为 %d" % len(regions))
    want(len(groups) == 8, u"① 分区应为 8 个，实为 %d" % len(groups))
    want(len(set(r["slug"] for r in regions)) == len(regions), u"① slug 有重复")
    want(len(set(r["name_zh"] for r in regions)) == len(regions), u"① 中文名有重复")
    for g in groups:
        if GROUP_IDS.get(g[0]) is None:
            fails.append(u"① 分区「%s」没有对应的 group_id" % g[0])
    # 八个分区每个都要有省份
    for g in groups:
        n = sum(1 for r in regions if r["group_name_zh"] == g[0])
        want(n > 0, u"① 分区「%s」一个省都没有" % g[0])

    # ② 省份在 app.js 里的出现顺序，必须与分区顺序一致（不能"跳回去"）
    prev = 0
    for r in regions:
        if r["group_order"] < prev:
            fails.append(u"② 省份出现顺序乱：%s 的分区序号 %d 小于前面的 %d"
                         % (r["name_zh"], r["group_order"], prev))
        prev = r["group_order"]

    # ③ 菜品 12 道，region_slug 都在 regions 里，且与 region_zh 的前缀自洽
    want(len(dish_rows) == 12, u"③ dishes 应为 12 行，实为 %d" % len(dish_rows))
    slug2zh = dict((r["slug"], r["name_zh"]) for r in regions)
    for r in dish_rows:
        want(r["region_slug"] in slug2zh, u"③ %s 的 region_slug「%s」不在 regions 里"
             % (r["id"], r["region_slug"]))
        want(r["region_zh"].startswith(slug2zh.get(r["region_slug"], "\0")),
             u"③ %s 的 region_zh「%s」不以 %s 开头（前缀规则会筛不到）"
             % (r["id"], r["region_zh"], slug2zh.get(r["region_slug"])))

    # ④ 计数（这四行数字就是 TECH_DESIGN §13.2 那张表）
    n_alias = sum(len(d["aliases"]) for d in dishes)
    n_fact = sum(len(d["facts"]) for d in dishes)
    n_src = sum(len(d["sources"]) for d in dishes)
    n_dfs = sum(len(f["sources"]) for d in dishes for f in d["facts"])
    want(n_alias == 108, u"④ 别名应为 108 条，实为 %d" % n_alias)
    want(n_fact == 90, u"④ 事实应为 90 条，实为 %d" % n_fact)
    want(n_src == 33, u"④ 出处应为 33 条，实为 %d" % n_src)
    want(n_dfs == 101, u"④ 事实→出处应为 101 条，实为 %d" % n_dfs)

    # ⑤ 引用完整性：正文里的 [[id]] 与 facts[].sources 都必须在本菜 sources 里
    bad_ref = []
    for d in dishes:
        have = set(s["id"] for s in d["sources"])
        for key in ("origin", "story", "technique"):
            for sid in re.findall(r"\[\[([A-Za-z0-9_-]+)\]\]", d["blocks"][key]["zh"]):
                if sid not in have:
                    bad_ref.append("%s/blocks.%s/zh -> %s" % (d["id"], key, sid))
            for sid in re.findall(r"\[\[([A-Za-z0-9_-]+)\]\]", d["blocks"][key]["en"]):
                if sid not in have:
                    bad_ref.append("%s/blocks.%s/en -> %s" % (d["id"], key, sid))
        for fi, f in enumerate(d["facts"], 1):
            for sid in f["sources"]:
                if sid not in have:
                    bad_ref.append("%s/facts[%d] -> %s" % (d["id"], fi, sid))
    want(not bad_ref, u"⑤ 有引不到的出处：%s" % "；".join(bad_ref[:5]))

    # ⑥ [[ 与 ]] 必须成对（跟 Day 12 的 check-content.py 同一件事）
    for d in dishes:
        for key in ("origin", "story", "technique"):
            for lang in ("zh", "en"):
                t = d["blocks"][key][lang]
                want(t.count("[[") == t.count("]]"),
                     u"⑥ %s/blocks.%s/%s 的 [[ ]] 不成对" % (d["id"], key, lang))

    # ⑦ 同一道菜内别名不能重复（这是 dish_aliases 的主键，重复会插不进去）
    for d in dishes:
        if len(set(d["aliases"])) != len(d["aliases"]):
            fails.append(u"⑦ %s 的 aliases 里有重复项" % d["id"])

    # ⑧ 每道菜至少 5 条事实、1 条出处（否则不满足"每张核心表 ≥5 行"的验收）
    for d in dishes:
        want(len(d["facts"]) >= 5, u"⑧ %s 的事实少于 5 条" % d["id"])
        want(len(d["sources"]) >= 1, u"⑧ %s 一条出处都没有" % d["id"])

    # ⑨ 图片：5 道有、7 道没有；有图的六个字段必须齐全
    with_img = [r for r in dish_rows if r["image_thumb_url"]]
    want(len(with_img) == 5, u"⑨ 有图的应为 5 道，实为 %d" % len(with_img))
    for r in with_img:
        for k in ("image_thumb_url", "image_thumb_width", "image_thumb_height",
                  "image_hero_url", "image_hero_width", "image_hero_height"):
            want(r[k] is not None, u"⑨ %s 的 %s 是空的" % (r["id"], k))

    # ⑩ 列宽（不能超，否则执行时报 value too long）
    limits = [("id", 64), ("name_zh", 32), ("name_en", 64), ("region_slug", 32),
              ("region_zh", 32), ("region_en", 64), ("tagline_zh", 255),
              ("tagline_en", 255), ("search_text", 255)]
    for r in dish_rows:
        for k, lim in limits:
            if len(r[k]) > lim:
                fails.append(u"⑩ %s 的 %s 长 %d，超过 %d" % (r["id"], k, len(r[k]), lim))
    for d in dishes:
        for a in d["aliases"]:
            want(len(a) <= 64, u"⑩ %s 别名「%s」长 %d > 64" % (d["id"], a, len(a)))
            want(len(normalize(a)) <= 64, u"⑩ %s 别名归一化后超过 64 字符：%s" % (d["id"], a))
        for s in d["sources"]:
            want(len(s["title"]) <= 255, u"⑩ %s 出处标题超 255：%s" % (d["id"], s["id"]))
            want(len(s["url"]) <= 512, u"⑩ %s 出处网址超 512：%s" % (d["id"], s["id"]))
            want(re.match(r"^\d{4}-\d{2}-\d{2}$", s["accessed"]) is not None,
                 u"⑩ %s/%s 的 accessed「%s」不是 YYYY-MM-DD" % (d["id"], s["id"], s["accessed"]))
        want(d["status"] in ("published", "draft"),
             u"⑩ %s 的 status 非法：%s" % (d["id"], d["status"]))

    # ⑪ 正文里不能有"行尾空白"或"连续两个空行"——
    #    ★ 这条不是洁癖：生成执行版时会做 rstrip + 压空行，
    #      一旦原文有这两种情况，执行版的正文就和 dishes.json 不一样了。
    for d in dishes:
        for key in ("origin", "story", "technique"):
            for lang in ("zh", "en"):
                t = d["blocks"][key][lang]
                for ln in t.split("\n"):
                    want(ln == ln.rstrip(), u"⑪ %s/%s/%s 有一行以空白结尾" % (d["id"], key, lang))
                want("\n\n\n" not in t, u"⑪ %s/%s/%s 有连续两个空行" % (d["id"], key, lang))
                want("\r" not in t and "\t" not in t,
                     u"⑪ %s/%s/%s 里混进了 \\r 或 \\t" % (d["id"], key, lang))

    # ⑫ 归一化规则不能把内容"吃掉"到没法用（搜自己名字至少要搜得到）
    for r in dish_rows:
        want(normalize(r["name_zh"]) in r["search_text"],
             u"⑫ %s 的 search_text 里搜不到自己的中文名" % r["id"])

    # ⑬ 别名归一化后不能变成空串
    for d in dishes:
        for a in d["aliases"]:
            want(normalize(a) != "", u"⑬ %s 的别名「%s」归一化后成了空串" % (d["id"], a))

    # ⑭ search_text 的组成顺序（id|中文名|英文名|中文地名|英文地名）
    for r in dish_rows:
        parts = r["search_text"].split("|")
        want(len(parts) == 5, u"⑭ %s 的 search_text 不是 5 段" % r["id"])

    if fails:
        print(u"自检未通过（%d 项），已中止，未产出 %s：" % (len(fails), DST))
        for f in fails[:20]:
            print(u"  ✗ " + f)
        raise SystemExit(2)

    notes.append(u"⑨ 有图 5 道 / 无图 7 道")
    return notes


# ---------------------------------------------------------------- 生成 SQL

def build_sql(dishes, regions, dish_rows, groups):
    """生成 db/seed.sql 的全文。"""
    L = []
    add = L.append

    n_dishes = len(dish_rows)
    n_alias = sum(len(d["aliases"]) for d in dishes)
    n_fact = sum(len(d["facts"]) for d in dishes)
    n_src = sum(len(d["sources"]) for d in dishes)
    n_dfs = sum(len(f["sources"]) for d in dishes for f in d["facts"])
    n_stmt = 6 + 1 + n_dishes * 5 + 1

    add(u"-- =============================================================================")
    add(u"--  寻味 / Xunwei —— 种子数据  seed.sql")
    add(u"--  ---------------------------------------------------------------------------")
    add(u"--  依据：data/dishes.json（唯一的真源）+ js/app.js 的 REGIONS")
    add(u"--  目标库：腾讯云 CloudBase「PostgreSQL 数据库」（本环境是 PG 模式）")
    add(u"--  生成方式：**本文件是生成的，不要手改** —— 改 dishes.json 后重跑：")
    add(u"--      python db/tools/make-seed.py")
    add(u"--  生成日：2026-10-02（Day 16 板块③）")
    add(u"--")
    add(u"--  【内容规模】")
    add(u"--    regions %d 行 ／ dishes %d 行 ／ dish_aliases %d 行 ／ dish_facts %d 行" %
        (len(regions), n_dishes, n_alias, n_fact))
    add(u"--    dish_sources %d 行 ／ dish_fact_sources %d 行" % (n_src, n_dfs))
    add(u"--    共 %d 条 SQL 语句 = 6 删除 + %d 插入 + 1 自查" % (n_stmt, n_stmt - 7))
    add(u"--")
    add(u"--  【可重复执行】")
    add(u"--    开头先把 6 张表按**与外键相反的顺序**删空（子表先删），再重新插入。")
    add(u"--    ★ 为什么不用 TRUNCATE：DELETE 是标准 SQL、顺序一眼能看懂；")
    add(u"--      TRUNCATE 这里用不上（数据量小），而且要 RESTART IDENTITY 才等价，更绕。")
    add(u"--    ★ 为什么删的时候还要管顺序：dishes 的外键是 ON DELETE CASCADE，")
    add(u"--      真删 dishes 会连坐；但我们写成显式倒序删，图的是「每一步都看得见」。")
    add(u"--    跑两遍、三遍都不报错，且第二遍之后行数一模一样。")
    add(u"--")
    add(u"--  【两个「算出来的列」】")
    add(u"--    dishes.search_text  = 归一化后的 id|中文名|英文名|中文地名|英文地名")
    add(u"--    dish_aliases.alias_norm = 归一化后的别名")
    add(u"--    归一化规则 = 转小写 + 去掉空白与 · ・ - _ / （） () 「」 【】")
    add(u"--    ★ 这条规则和前端 js/app.js 的 normalize() 是**同一条**（本脚本里只有一份）。")
    add(u"--      两者必须始终一致，否则会出现「页面上搜得到、接口搜不到」（契约 §3.2 告警）。")
    add(u"--")
    add(u"--  【执行顺序】")
    add(u"--    regions → dishes → dish_aliases / dish_facts / dish_sources → dish_fact_sources")
    add(u"--    顺序不能乱：外键要求被引用的行先存在。文件里已按此排好，整段执行即可。")
    add(u"--")
    add(u"--  【控制台执行请用另一份文件】")
    add(u"--    本文件是「给人读的」：注释里带英文分号（说明文字里的分号），")
    add(u"--    直接粘进云开发控制台的 SQL 编辑器可能会被按分号切错。")
    add(u"--    控制台请用 db/seed.exec.sql（零注释版，由 make-exec-sql.py 生成）。")
    add(u"--")
    add(u"--  【已核对过的一件事】")
    add(u"--    正文里有 %d 个字符串字面量含英文分号（英文学术性行文里的分号），"
        u"合计 %d 处。" % (SEMI_STRINGS, SEMI_COUNT))
    add(u"--    执行版会把这些分号写成 chr(59) 拼接 —— 存进库里仍是普通分号，一个字没改。")
    add(u"--    原因见 TECH_DESIGN.md §13.14。")
    add(u"-- =============================================================================")
    add(u"")

    # ---------------- 0. 先删
    add(u"-- -----------------------------------------------------------------------------")
    add(u"--  0 / 7   先删空（顺序 = 建表顺序的倒序，子表先删）")
    add(u"-- -----------------------------------------------------------------------------")
    add(u"DELETE FROM public.dish_fact_sources;")
    add(u"DELETE FROM public.dish_sources;")
    add(u"DELETE FROM public.dish_facts;")
    add(u"DELETE FROM public.dish_aliases;")
    add(u"DELETE FROM public.dishes;")
    add(u"DELETE FROM public.regions;")
    add(u"")

    # ---------------- 1. regions
    add(u"-- -----------------------------------------------------------------------------")
    add(u"--  1 / 7   regions —— 省级行政区字典（%d 行）" % len(regions))
    add(u"--          count（该省收录几道）不在这里，用 JOIN dishes 现算。")
    add(u"--          group_order 1-8 = 七大地理分区 + 港澳台；sort_order = 区内顺序。")
    add(u"-- -----------------------------------------------------------------------------")
    add(u"INSERT INTO public.regions")
    add(u"  (slug, name_zh, name_en, group_id, group_name_zh, group_name_en, group_order, sort_order)")
    add(u"VALUES")
    for i, r in enumerate(regions):
        tail = u"," if i < len(regions) - 1 else u";"
        add(u"  (%s, %s, %s, %s, %s, %s, %d, %d)%s"
            % (sql_lit(r["slug"]), sql_lit(r["name_zh"]), sql_lit(r["name_en"]),
               sql_lit(r["group_id"]), sql_lit(r["group_name_zh"]), sql_lit(r["group_name_en"]),
               r["group_order"], r["sort_order"], tail))
    add(u"")

    # ---------------- 2. dishes
    add(u"-- -----------------------------------------------------------------------------")
    add(u"--  2 / 7   dishes —— 菜品主表（%d 行）" % n_dishes)
    add(u"--          每道菜一条 INSERT，字段名逐个标在行尾 —— 因为列太多（31 列）且正文很长，")
    add(u"--          合在一起会没人看得懂。blocks 三段正文里的 [[sourceId]] 标记**原样保留**。")
    add(u"--          created_at / updated_at 不写，走表定义的 DEFAULT now()。")
    add(u"-- -----------------------------------------------------------------------------")
    for i, (d, r) in enumerate(zip(dishes, dish_rows)):
        add(u"")
        add(u"-- %d/%d  %s  %s（%s → %s）" %
            (i + 1, n_dishes, r["id"], r["name_zh"], r["region_zh"], r["region_slug"]))
        add(u"INSERT INTO public.dishes")
        add(u"  (id, status, name_zh, name_en, region_slug, region_zh, region_en,")
        add(u"   tagline_zh, tagline_en,")
        add(u"   block_origin_zh, block_origin_en, block_story_zh, block_story_en,")
        add(u"   block_technique_zh, block_technique_en,")
        add(u"   note_zh, note_en,")
        add(u"   image_thumb_url, image_thumb_width, image_thumb_height,")
        add(u"   image_hero_url, image_hero_width, image_hero_height,")
        add(u"   image_alt_zh, image_alt_en,")
        add(u"   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,")
        add(u"   search_text, sort_order)")
        add(u"VALUES (")
        add(u"    %s,   -- id（★永不可改：改了 #/dish/%s 这类旧链接全断）" % (sql_lit(r["id"]), r["id"]))
        add(u"    %s,   -- status" % sql_lit(r["status"]))
        add(u"    %s,   -- name_zh" % sql_lit(r["name_zh"]))
        add(u"    %s,   -- name_en" % sql_lit(r["name_en"]))
        add(u"    %s,   -- region_slug ★外键 → regions.slug" % sql_lit(r["region_slug"]))
        add(u"    %s,   -- region_zh（展示用的细地名，比省级更具体）" % sql_lit(r["region_zh"]))
        add(u"    %s,   -- region_en" % sql_lit(r["region_en"]))
        add(u"    %s,   -- tagline_zh" % sql_lit(r["tagline_zh"]))
        add(u"    %s,   -- tagline_en" % sql_lit(r["tagline_en"]))
        for col in ("block_origin_zh", "block_origin_en", "block_story_zh", "block_story_en",
                    "block_technique_zh", "block_technique_en"):
            add(u"    -- %s" % col)
            add(u"    %s," % sql_lit(r[col]))
        add(u"    %s, %s,   -- note_zh / note_en（仅 draft 用，本期 %d 道全没用）"
            % (sql_lit(r["note_zh"]), sql_lit(r["note_en"]), n_dishes))
        add(u"    %s, %s, %s,   -- image_thumb_url / width / height"
            % (sql_lit(r["image_thumb_url"]), sql_lit(r["image_thumb_width"]),
               sql_lit(r["image_thumb_height"])))
        add(u"    %s, %s, %s,   -- image_hero_url / width / height"
            % (sql_lit(r["image_hero_url"]), sql_lit(r["image_hero_width"]),
               sql_lit(r["image_hero_height"])))
        add(u"    %s, %s,   -- image_alt_zh / image_alt_en" % (sql_lit(r["image_alt_zh"]), sql_lit(r["image_alt_en"])))
        add(u"    %s, %s,   -- credit author / license"
            % (sql_lit(r["image_credit_author"]), sql_lit(r["image_credit_license"])))
        add(u"    %s," % sql_lit(r["image_credit_license_url"]))
        add(u"    %s,   -- credit page" % sql_lit(r["image_credit_page"]))
        add(u"    %s,   -- search_text（派生列，不进接口响应）" % sql_lit(r["search_text"]))
        add(u"    %d   -- sort_order（= dishes.json 数组顺序）" % r["sort_order"])
        add(u"  );")

    # ---------------- 3. aliases
    add(u"")
    add(u"-- -----------------------------------------------------------------------------")
    add(u"--  3 / 7   dish_aliases —— 别名（%d 行）" % n_alias)
    add(u"--          主键是 (dish_id, alias)，天然挡掉「同一道菜重复录同一别名」。")
    add(u"--          alias_norm 是派生列（归一化后），供搜索用；sort_order 从 0 开始 = 数组下标。")
    add(u"-- -----------------------------------------------------------------------------")
    for i, d in enumerate(dishes):
        add(u"")
        add(u"-- %d/%d  %s  %s：%d 条别名" % (i + 1, n_dishes, d["id"], d["name"]["zh"], len(d["aliases"])))
        add(u"INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES")
        for j, a in enumerate(d["aliases"]):
            tail = u"," if j < len(d["aliases"]) - 1 else u";"
            add(u"  (%s, %s, %s, %d)%s"
                % (sql_lit(d["id"]), sql_lit(a), sql_lit(normalize(a)), j, tail))

    # ---------------- 4. facts
    add(u"")
    add(u"-- -----------------------------------------------------------------------------")
    add(u"--  4 / 7   dish_facts —— 关键事实（%d 行）" % n_fact)
    add(u"--          主键 (dish_id, seq)，seq 从 1 开始 = facts 数组下标 + 1（不另加自增 id，")
    add(u"--          这样种子是确定性的）。每条事实挂几个出处，看下一张表。")
    add(u"-- -----------------------------------------------------------------------------")
    for i, d in enumerate(dishes):
        add(u"")
        add(u"-- %d/%d  %s  %s：%d 条事实" % (i + 1, n_dishes, d["id"], d["name"]["zh"], len(d["facts"])))
        add(u"INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES")
        for j, f in enumerate(d["facts"]):
            tail = u"," if j < len(d["facts"]) - 1 else u";"
            add(u"  (%s, %d," % (sql_lit(d["id"]), j + 1))
            add(u"   %s," % sql_lit(f["zh"]))
            add(u"   %s)%s" % (sql_lit(f["en"]), tail))

    # ---------------- 5. sources
    add(u"")
    add(u"-- -----------------------------------------------------------------------------")
    add(u"--  5 / 7   dish_sources —— 出处（%d 行）" % n_src)
    add(u"--          ★ source_id 只在「一道菜之内」唯一：ihchina 出现在 5 道菜里、指向 5 个网址，")
    add(u"--            所以主键必须是 (dish_id, source_id) 复合键。")
    add(u"--          accessed 只到天（DATE），来源页面只写了访问日期，不假装有时分秒。")
    add(u"-- -----------------------------------------------------------------------------")
    for i, d in enumerate(dishes):
        add(u"")
        add(u"-- %d/%d  %s  %s：%d 条出处" % (i + 1, n_dishes, d["id"], d["name"]["zh"], len(d["sources"])))
        add(u"INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES")
        for j, s in enumerate(d["sources"]):
            tail = u"," if j < len(d["sources"]) - 1 else u";"
            add(u"  (%s, %s," % (sql_lit(d["id"]), sql_lit(s["id"])))
            add(u"   %s," % sql_lit(s["title"]))
            add(u"   %s," % sql_lit(s["url"]))
            add(u"   %s, %d)%s" % (sql_lit(s["accessed"]), j + 1, tail))

    # ---------------- 6. dish_fact_sources
    add(u"")
    add(u"-- -----------------------------------------------------------------------------")
    add(u"--  6 / 7   dish_fact_sources —— 事实 ↔ 出处（%d 行，多对多）" % n_dfs)
    add(u"--          ★★ 两个外键都带 dish_id，所以「螺蛳粉的事实引用兰州牛肉面的出处」在库层插不进去。")
    add(u"--          sort_order 决定正文里 [1][2] 角标的编号顺序。")
    add(u"-- -----------------------------------------------------------------------------")
    for i, d in enumerate(dishes):
        pairs = [(fi + 1, sid, si + 1)
                 for fi, f in enumerate(d["facts"])
                 for si, sid in enumerate(f["sources"])]
        add(u"")
        add(u"-- %d/%d  %s  %s：%d 条「事实→出处」" % (i + 1, n_dishes, d["id"], d["name"]["zh"], len(pairs)))
        add(u"INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES")
        for j, (fseq, sid, sord) in enumerate(pairs):
            tail = u"," if j < len(pairs) - 1 else u";"
            add(u"  (%s, %d, %s, %d)%s" % (sql_lit(d["id"]), fseq, sql_lit(sid), sord, tail))

    # ---------------- 7. 自查
    add(u"")
    add(u"-- -----------------------------------------------------------------------------")
    add(u"--  7 / 7   灌完自查（一条语句，六个数字一次出来）")
    add(u"--          为什么写成 UNION ALL 一条：控制台的结果面板只显示**最后一条**语句的结果，")
    add(u"--          写成六条 SELECT 的话，前面五条会被自己盖掉、看不见。")
    add(u"--          rows_now 与 rows_want 必须一一相等；不等就是这一步没灌对。")
    add(u"-- -----------------------------------------------------------------------------")
    add(u"SELECT 'regions' AS tbl, count(*) AS rows_now, %d AS rows_want FROM public.regions" % len(regions))
    add(u"UNION ALL SELECT 'dishes', count(*), %d FROM public.dishes" % n_dishes)
    add(u"UNION ALL SELECT 'dish_aliases', count(*), %d FROM public.dish_aliases" % n_alias)
    add(u"UNION ALL SELECT 'dish_facts', count(*), %d FROM public.dish_facts" % n_fact)
    add(u"UNION ALL SELECT 'dish_sources', count(*), %d FROM public.dish_sources" % n_src)
    add(u"UNION ALL SELECT 'dish_fact_sources', count(*), %d FROM public.dish_fact_sources" % n_dfs)
    add(u"ORDER BY 1;")
    add(u"")

    return "\n".join(L) + "\n", n_stmt


# ---------------------------------------------------------------- 主流程

SEMI_STRINGS = 0          # 含英文分号的字符串**个数**（build 前由 count 填）
SEMI_COUNT = 0            # 这些字符串里英文分号的**总处数**（一个串可能有好几处）


def main():
    global SEMI_STRINGS, SEMI_COUNT

    groups, raw = read_js_tables()
    doc = read_dishes()
    dishes = doc["dishes"]

    regions = build_regions(groups, raw)
    dish_rows = build_dish_rows(dishes, regions)
    notes = self_check(dishes, regions, dish_rows, groups)

    # 统计"含英文分号的字面量"个数（执行版会把它们改写成 chr(59) 拼接）
    texts = []
    for d in dishes:
        texts.extend([d["name"]["zh"], d["name"]["en"], d["tagline"]["zh"], d["tagline"]["en"]])
        for k in ("origin", "story", "technique"):
            texts.append(d["blocks"][k]["zh"])
            texts.append(d["blocks"][k]["en"])
        texts.extend([f["zh"] for f in d["facts"]])
        texts.extend([f["en"] for f in d["facts"]])
        texts.extend([s["title"] for s in d["sources"]])
        texts.extend([s["url"] for s in d["sources"]])
        texts.extend(d["aliases"])
    SEMI_STRINGS = sum(1 for t in texts if ";" in t)
    SEMI_COUNT = sum(t.count(";") for t in texts)

    sql, n_stmt = build_sql(dishes, regions, dish_rows, groups)

    # 生成前后都必须能读回来（防止写出非法 UTF-8 或漏行）
    with io.open(DST, "w", encoding="utf-8", newline="\n") as f:
        f.write(sql)
    back = io.open(DST, encoding="utf-8").read()
    if back != sql:
        raise SystemExit(u"！回读与写入内容不一致")

    print(u"源     : %s" % DISHES)
    print(u"源     : %s（REGIONS / REGION_GROUPS）" % APP_JS)
    print(u"产物   : %s" % DST)
    print(u"")
    print(u"  regions            %3d 行" % len(regions))
    print(u"  dishes             %3d 行" % len(dish_rows))
    print(u"  dish_aliases       %3d 行" % sum(len(d["aliases"]) for d in dishes))
    print(u"  dish_facts         %3d 行" % sum(len(d["facts"]) for d in dishes))
    print(u"  dish_sources       %3d 行" % sum(len(d["sources"]) for d in dishes))
    print(u"  dish_fact_sources  %3d 行" % sum(len(f["sources"]) for d in dishes for f in d["facts"]))
    print(u"")
    print(u"  语句 %d 条 = 6 删除 + %d 插入 + 1 自查" % (n_stmt, n_stmt - 7))
    print(u"  行数 %d 行 | 含英文分号的字面量 %d 个（共 %d 处，执行版将改写为 chr(59)）"
          % (sql.count("\n"), SEMI_STRINGS, SEMI_COUNT))
    print(u"  单引号字面量共 %d 个（全部按 SQL 规矩转义为两个单引号）" % sql.count("'"))
    print(u"")
    print(u"  14 道自检全部通过 ✅")
    for n in notes:
        print(u"    · " + n)
    print(u"")
    print(u"  下一步：python db/tools/make-exec-sql.py   → 生成控制台用的 db/seed.exec.sql")


if __name__ == "__main__":
    main()
