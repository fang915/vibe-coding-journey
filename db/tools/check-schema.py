#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
静态校验 db/schema.sql —— 在把它交给数据库执行之前，先把能查的都查了。

为什么需要它：
    本机没有 MySQL / PostgreSQL，不能真的跑一遍。所以用 SQL 解析器
    （sqlglot，装在隔离的 venv 里）离线解析这份 DDL，把"语法错"和
    "结构错"在交出去之前挡掉，而不是让用户粘进控制台撞运气。

怎么跑（任何目录都行，路径按脚本自身位置推导）：
    "<venv>/Scripts/python.exe" "D:\\桌面文件\\vibe coding实战\\db\\tools\\check-schema.py"
    没装 sqlglot 的话： "<venv>/Scripts/python.exe" -m pip install sqlglot

它检查 9 件事：
    ① 文件是合法 UTF-8（中文项目最容易被写坏的地方）
    ② 整份 SQL 能被 PostgreSQL 语法解析（真语法错会在这里抛）
    ③ 有没有"解析器看不懂、只好原样跳过"的语句（有就说清，不假装验过）
    ④ 6 张表、每张的列数、总列数
    ⑤ 每张表都有主键；同表内没有重名列
    ⑥ 外键条数、指向哪张表，且被引用的表确实存在、本地列也真的存在
    ⑦ 每一列都有 COMMENT（不是装饰：字段含义只写在库里，代码里看不到）
    ⑧ 可空列有多少（用来对"7 道菜没有图"这件事）
    ⑨ 有没有 MySQL 方言的残留（本环境是 PostgreSQL，残留必是错的）

两个坑（都真踩过）：
    · 外键写在**表级**，不在列定义里 —— 只遍历 ColumnDef 会数出 0 条外键。
    · 解析器把显式写的 `NULL` 也塞进同一个约束类，读 AST 会把可空列误判成 NOT NULL。
      改为看**回生成的 SQL 文本**里有没有 NOT NULL，最可靠。

退出码：0 = 全部通过；1 = 有问题（上面逐条列出）
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(os.path.dirname(HERE), "schema.sql")

EXPECTED_TABLES = {
    "regions": 8,
    "dishes": 33,
    "dish_aliases": 4,
    "dish_facts": 4,
    "dish_sources": 6,
    "dish_fact_sources": 4,
}
EXPECTED_FK = 6
EXPECTED_NULLABLE = 14          # dishes 的 2 个 note_ + 12 个 image_ 列
EXPECTED_COMMENTED_TABLES = 6

MYSQL_LEFTOVERS = [
    (r"\bENGINE\s*=", "ENGINE=…（MySQL 表选项）"),
    (r"\bCHARSET\s*=", "CHARSET=…（MySQL 表选项）"),
    (r"\bCOLLATE\s*=\s*utf8mb4", "COLLATE=utf8mb4…（MySQL 排序规则）"),
    (r"\bENUM\s*\(", "ENUM(…)（MySQL 列类型，PG 要用 TEXT + CHECK）"),
    (r"\bUNSIGNED\b", "UNSIGNED（PG 没有无符号类型）"),
    (r"ON\s+UPDATE\s+CURRENT_TIMESTAMP", "ON UPDATE CURRENT_TIMESTAMP（MySQL 专有）"),
    (r"\bTINYINT\b", "TINYINT（PG 用 SMALLINT）"),
    (r"\bSET\s+NAMES\b", "SET NAMES（MySQL 专有）"),
    (r"^\s*SHOW\s+TABLES", "SHOW TABLES（MySQL 专有）"),
    (r"\bKEY\s+\w+\s*\(", "内联 KEY idx_…（PG 要独立的 CREATE INDEX）"),
    (r"\bAUTO_INCREMENT\b", "AUTO_INCREMENT（PG 用 GENERATED … AS IDENTITY）"),
]

fail = []


def check(label, ok, detail=""):
    print("  %s %s%s" % ("✅" if ok else "❌", label, ("  ← " + detail) if detail else ""))
    if not ok:
        fail.append(label)


print("校验目标:", PATH)

# ─────────────────────────────────────────────────────────────────────────────
# ① 编码
# ─────────────────────────────────────────────────────────────────────────────
print("\n① 编码")
raw = open(PATH, "rb").read()
try:
    text = raw.decode("utf-8")
    ok_utf8 = True
except UnicodeDecodeError as e:
    text = raw.decode("utf-8", "replace")
    ok_utf8 = False
    print("    解码失败位置：", e)
check("UTF-8 合法", ok_utf8)
print("    行数 %d ｜ 字节 %d" % (text.count("\n") + 1, len(raw)))
if not ok_utf8:
    sys.exit(1)

try:
    import sqlglot
    from sqlglot import exp
except ImportError:
    print('\n✗ 缺 sqlglot。先跑："<venv>/Scripts/python.exe" -m pip install sqlglot')
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# ② 解析
# ─────────────────────────────────────────────────────────────────────────────
print("\n② PostgreSQL 语法解析")
SemiCls = getattr(exp, "Semicolon", None)
try:
    stmts = [s for s in sqlglot.parse(text, read="postgres")
             if s is not None and not (SemiCls is not None and isinstance(s, SemiCls))]
except Exception as e:
    print("    ❌ %s: %s" % (type(e).__name__, e))
    sys.exit(1)
check("整份文件解析通过", True, "%d 条语句" % len(stmts))

# ③ 有没有被"降级"成原样透传的语句
CommandCls = getattr(exp, "Command", None)
unverified = [s for s in stmts if CommandCls is not None and isinstance(s, CommandCls)]
print("\n③ 未验证语句")
check("没有被跳过的语句", not unverified,
      "" if not unverified else "解析器看不懂这 %d 条：%s"
      % (len(unverified), [str(s)[:40] for s in unverified]))

# ─────────────────────────────────────────────────────────────────────────────
# ④⑤⑥ 结构
# ─────────────────────────────────────────────────────────────────────────────
tables, indexes = {}, []
col_comments, table_comments = {}, set()

for s in stmts:
    if isinstance(s, exp.Create) and s.kind == "TABLE":
        name = s.this.this.name
        cons = list(s.args.get("constraints") or [])
        cons += [e for e in s.this.expressions if not isinstance(e, exp.ColumnDef)]
        tables[name] = {
            "cols": [e for e in s.this.expressions if isinstance(e, exp.ColumnDef)],
            "cons": cons,
        }
    elif isinstance(s, exp.Create) and s.kind == "INDEX":
        indexes.append(s)
    elif isinstance(s, exp.Comment):
        kind = s.args.get("kind")
        if kind == "COLUMN":
            # ⚠️ s.this.args["table"] 返回的是 Identifier 对象，不是字符串。
            #    直接拿去当字典键，永远匹配不上表名 —— 必须先 str() 或取 .name。
            col_comments[(str(s.this.args.get("table")), s.this.name)] = str(s.args.get("expression"))
        elif kind == "TABLE":
            table_comments.add(s.this.name)

print("\n④ 表与列（期望 %d 张 / 共 %d 列）"
      % (len(EXPECTED_TABLES), sum(EXPECTED_TABLES.values())))
got_tables = sorted(tables)
check("表名与数量一致", got_tables == sorted(EXPECTED_TABLES), "实际：" + ", ".join(got_tables))

total_cols = 0
for t in sorted(EXPECTED_TABLES):
    if t not in tables:
        continue
    cols = tables[t]["cols"]
    total_cols += len(cols)
    names = [c.this.name for c in cols]
    dup = sorted({n for n in names if names.count(n) > 1})
    print("    %-18s %2d 列（期望 %2d）%s"
          % (t, len(cols), EXPECTED_TABLES[t], "  重名：" + str(dup) if dup else ""))
    if len(cols) != EXPECTED_TABLES[t] or dup:
        fail.append("表 %s 的列数/重名" % t)
check("总列数 = %d" % sum(EXPECTED_TABLES.values()),
      total_cols == sum(EXPECTED_TABLES.values()), "实际 %d" % total_cols)

print("\n⑤ 主键")


def has_pk(cons):
    for c in cons:
        if isinstance(c, exp.PrimaryKey):
            return True
        if isinstance(c, exp.Constraint) and any(isinstance(x, exp.PrimaryKey) for x in c.expressions):
            return True
    return False


for t in sorted(tables):
    check("%s 有主键" % t, has_pk(tables[t]["cons"]))


def fk_of(node):
    """外键可能直接写，也可能裹在 CONSTRAINT 名字里。"""
    if isinstance(node, exp.ForeignKey):
        return node
    if isinstance(node, exp.Constraint):
        for x in node.expressions:
            if isinstance(x, exp.ForeignKey):
                return x
    return None


print("\n⑥ 外键（期望 %d 条）" % EXPECTED_FK)
fks = []
for t in sorted(tables):
    for c in tables[t]["cons"]:
        fk = fk_of(c)
        if fk is None:
            continue
        # ⚠️ reference.this 常被包一层 Schema（表 + 列一起），要往里剥一层，
        #    否则 str() 出来是 "dishes (id)"，当表名用必然对不上。
        target = fk.args.get("reference").this
        while isinstance(target, exp.Schema):
            target = target.this
        target_tbl = str(target).split(".")[-1]              # public.regions → regions
        local_cols = [str(x) for x in fk.expressions]
        fks.append((t, target_tbl, local_cols))
        exists = target_tbl in tables
        print("    %-18s → %-18s %s%s"
              % (t, target_tbl, local_cols, "" if exists else "   ❌ 目标表不存在"))
        if not exists:
            fail.append("%s 的外键指向不存在的表 %s" % (t, target_tbl))
check("外键 = %d 条" % EXPECTED_FK, len(fks) == EXPECTED_FK, "实际 %d" % len(fks))

for t, _, local_cols in fks:
    local_names = [c.this.name for c in tables[t]["cols"]]
    miss = [c for c in local_cols if c not in local_names]
    check("%s 的外键列 %s 存在" % (t, local_cols), not miss,
          "缺：" + str(miss) if miss else "")

print("\n    索引 %d 条：%s" % (len(indexes), ", ".join(str(i.this.this) for i in indexes)))

# ─────────────────────────────────────────────────────────────────────────────
# ⑦⑧ 注释与可空
# ─────────────────────────────────────────────────────────────────────────────
print("\n⑦ 注释（每一列都要有）")
missing_comments = []
for t in sorted(tables):
    for c in tables[t]["cols"]:
        if (t, c.this.name) not in col_comments:
            missing_comments.append("%s.%s" % (t, c.this.name))
check("%d 列的注释齐" % sum(EXPECTED_TABLES.values()), not missing_comments,
      "" if not missing_comments else "缺 %d 个：%s" % (len(missing_comments), missing_comments[:8]))
check("%d 张表都有表注释" % EXPECTED_COMMENTED_TABLES,
      len(table_comments) == EXPECTED_COMMENTED_TABLES,
      "实际 %d：%s" % (len(table_comments), sorted(table_comments)))

print("\n⑧ 可空列")
nullable = []
for t in sorted(tables):
    for c in tables[t]["cols"]:
        # ⚠️ 判可空别读 AST：解析器会把显式写的 NULL 也归进同一类约束里。
        #    改成看"回生成的 SQL 文本里有没有 NOT NULL"，最可靠。
        if "NOT NULL" not in c.sql(dialect="postgres").upper():
            nullable.append("%s.%s" % (t, c.this.name))
check("可空列 = %d 个（= 7 道无图的菜）" % EXPECTED_NULLABLE,
      len(nullable) == EXPECTED_NULLABLE, "实际 %d：%s" % (len(nullable), nullable))

# ─────────────────────────────────────────────────────────────────────────────
# ⑨ MySQL 残留
# ─────────────────────────────────────────────────────────────────────────────
print("\n⑨ MySQL 方言残留（本环境是 PostgreSQL）")
# ⚠️ 必须先剥掉两类内容再扫，否则全是假警报：
#    ① `--` 注释：文件开头的说明里就有一张 "MySQL vs PostgreSQL" 对照表，
#       其中写着 ENGINE= / ENUM( / UNSIGNED 等字样；
#    ② `'…'` 字符串字面量：库里的字段注释正文也会提到这些词
#       （例："PG 无 MySQL 的 ON UPDATE CURRENT_TIMESTAMP"）。
#    两者都用**等长空格**替换（不是删除），这样偏移量不变、行号才对得上。
def blank(m):
    return " " * (m.end() - m.start())


code_only = re.sub(r"--[^\n]*", blank, text)
code_only = re.sub(r"'(?:[^']|'')*'", blank, code_only)
residue = []
for pat, desc in MYSQL_LEFTOVERS:
    for m in re.finditer(pat, code_only, re.M | re.I):
        residue.append("第 %d 行：%s" % (code_only[: m.start()].count("\n") + 1, desc))
check("无残留", not residue,
      "" if not residue else "%d 处 → %s" % (len(residue), residue[:5]))

# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 70)
if fail:
    print("❌ 有 %d 项没过：" % len(fail))
    for f in fail:
        print("   -", f)
    sys.exit(1)
print("✅ 全部通过。可以粘进控制台的 SQL 编辑器执行了。")
