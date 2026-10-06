# -*- coding: utf-8 -*-
"""
make-exec-sql.py —— 从「给人读的」SQL 生成「可直接粘进控制台执行」的纯 SQL 文件。

【它管两份文件】
    db/schema.sql  →  db/schema.exec.sql      （建表）
    db/seed.sql    →  db/seed.exec.sql        （种子数据）

【为什么需要它】
  CloudBase 的 SQL 编辑器自己提示过一句：「SQL 里避免用注释，否则容易出现错误结果」。
  实测 schema.sql 有 13 行注释里带英文分号（自查用的 SQL 与 DROP 语句），
  而这类编辑器普遍按分号切分语句 —— 那些注释会被当成真语句执行，必然报错。
  所以生成一份剥掉全部注释的执行版。
  （列/表的说明不会丢 —— 它们是用 COMMENT ON 写的，那是真 SQL 语句，不是注释。）

【第二个坑：字符串字面量里的英文分号（Day 16 板块③ 实测新增）】
  schema.sql 的 68 个字符串字面量里，含英文分号的是 **0 个**，所以"按分号切"没问题。
  但 seed.sql 不一样：12 道菜的英文正文里有 **68 个字符串字面量含英文分号**
  （学术性行文里的分号，合计 88 处），它们全都在字符串字面量里。
  按分号切会把一句话劈成两半，必然语法错误。
  解法：执行版把这些分号写成 **拼接 chr(59)**：

      'shops; in recent years'   →   'shops' || chr(59) || ' in recent years'

  ★ 内容一个字都没改：入库后仍是普通分号。只是"文件里不再出现裸露的分号"。
  ★ 这一改写是**可逆的**，脚本自己会验：把 `' || chr(59) || '` 换回分号，
     必须与剥注释后的原文逐字符相等（自检 ⑥）。

【用法】任意目录下执行：
    python db/tools/make-exec-sql.py            # 两份都做
    python db/tools/make-exec-sql.py schema     # 只做建表
    python db/tools/make-exec-sql.py seed       # 只做种子
"""

import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))          # db/tools -> db -> 项目根

TARGETS = [
    ("schema", os.path.join(ROOT, "db", "schema.sql"), os.path.join(ROOT, "db", "schema.exec.sql")),
    ("seed",   os.path.join(ROOT, "db", "seed.sql"),   os.path.join(ROOT, "db", "seed.exec.sql")),
]

SEMI_JOIN = "' || chr(59) || '"          # 分号的"拼接写法"，改写与还原都用这一条


# ---------------------------------------------------------------- 基础工具

def scan(text):
    """一次扫描同时做完三件事，返回 (去注释后的文本, 字符串字面量列表, 字符串内分号数)。

    用状态机而不是正则：只有走状态机才知道某个 -- 或 ; 到底在字符串里还是外面。
    """
    out, lits = [], []
    semi_in_str = 0
    buf, in_str = [], False
    i, n = 0, len(text)
    while i < n:
        ch = text[i]

        if in_str:
            buf.append(ch)
            if ch == ";":
                semi_in_str += 1
            elif ch == "'":
                if i + 1 < n and text[i + 1] == "'":       # '' 是转义的单引号
                    buf.append("'")
                    i += 2
                    continue
                in_str = False
                lits.append("".join(buf))
                buf = []
            out.append(ch)
            i += 1
            continue

        if ch == "'":
            in_str = True
            buf = [ch]
            out.append(ch)
            i += 1
            continue

        if ch == "-" and i + 1 < n and text[i + 1] == "-":
            while i < n and text[i] not in "\r\n":         # 跳到行尾，保留换行
                i += 1
            continue

        if ch == "/" and i + 1 < n and text[i + 1] == "*":
            j = text.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue

        out.append(ch)
        i += 1

    if in_str:
        raise SystemExit("！源文件里有没闭合的单引号，先修源文件")
    return "".join(out), lits, semi_in_str


def tidy(text):
    """去行尾空白、压缩连续空行、去掉首尾空行。"""
    lines = [ln.rstrip() for ln in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    res, blank = [], False
    for ln in lines:
        if ln == "":
            if not blank:
                res.append("")
            blank = True
        else:
            res.append(ln)
            blank = False
    while res and res[0] == "":
        res.pop(0)
    while res and res[-1] == "":
        res.pop()
    return "\n".join(res) + "\n"


def squash(text):
    """压掉所有空白，用来做"剥注释前后内容一致"的逐字符比对。"""
    return "".join(text.split())


def rewrite_semis(text):
    """把字符串字面量里的英文分号写成 `' || chr(59) || '` 拼接。

    只动字面量内部；数字面量外的分号（真正的语句结尾）一个都不碰。
    返回 (改写后的文本, 被改写的字面量个数)。
    """
    out, i, n, cnt = [], 0, len(text), 0
    while i < n:
        if text[i] != "'":
            out.append(text[i])
            i += 1
            continue
        # 收集一个单引号字面量（含首尾引号，内部 '' 视为转义）
        j, body = i + 1, []
        while j < n:
            if text[j] == "'":
                if j + 1 < n and text[j + 1] == "'":
                    body.append("''")
                    j += 2
                    continue
                break
            body.append(text[j])
            j += 1
        raw = "".join(body)
        if ";" in raw:
            out.append("'" + raw.replace(";", SEMI_JOIN) + "'")
            cnt += 1
        else:
            out.append("'" + raw + "'")
        i = j + 1
    return "".join(out), cnt


def count_statements(text):
    """只数字符串外的分号，末尾无分号也算一条。"""
    n_stmt, in_str, i, n = 0, False, 0, len(text)
    buf = []
    while i < n:
        ch = text[i]
        if in_str:
            if ch == "'":
                if i + 1 < n and text[i + 1] == "'":
                    i += 2
                    continue
                in_str = False
        elif ch == "'":
            in_str = True
        elif ch == ";":
            if "".join(buf).strip():
                n_stmt += 1
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    if in_str:
        raise SystemExit("！执行版里有没闭合的单引号")
    if "".join(buf).strip():
        n_stmt += 1
    return n_stmt


def count_semi_in_comments(text):
    n = 0
    for ln in text.split("\n"):
        s = ln.find("--")
        if s >= 0 and ";" in ln[s:]:
            n += 1
    return n


def verify_with_sqlglot(exec_text, label):
    """有 sqlglot 就用 PG 解析器真解析一遍（没装则跳过，不影响生成）。"""
    try:
        import sqlglot
    except ImportError:
        return False, "PG 解析器未安装，跳过深度校验（python -m pip install sqlglot 后可开启）"
    try:
        stmts = [s for s in sqlglot.parse(exec_text, read="postgres") if s is not None]
    except Exception as e:
        return False, u"❌ PG 解析失败：%s: %s" % (type(e).__name__, str(e)[:200])

    from collections import Counter
    kinds = Counter(type(s).__name__ for s in stmts)
    top = "、".join("%s %d" % (k, v) for k, v in kinds.most_common(5))
    return True, u"PG 解析通过：%d 条语句（%s）" % (len(stmts), top)


# ---------------------------------------------------------------- 单份处理

def process(label, src_path, dst_path):
    if not os.path.exists(src_path):
        raise SystemExit("！找不到源文件：%s" % src_path)

    try:
        src = open(src_path, "rb").read().decode("utf-8")
    except UnicodeDecodeError as e:
        raise SystemExit("！%s 不是合法 UTF-8：%s" % (src_path, e))

    src_lines = src.replace("\r\n", "\n").split("\n")
    if src_lines and src_lines[-1] == "":
        src_lines.pop()

    stripped, lits, semi_in_str = scan(src)
    exec_text = tidy(stripped)

    # ---- 自检 ①：剥注释后，除空格外逐字符一致（内容不可能被改动） ----
    if squash(stripped) != squash(exec_text):
        raise SystemExit("！剥注释后的内容与执行版不一致（tidy 出错）")

    # ---- 自检 ②：执行版里不含任何注释标记 ----
    if "--" in exec_text or "/*" in exec_text:
        raise SystemExit("！执行版里仍有注释残留")

    # ---- 自检 ③：源文件里"含 -- 或 /* 的字符串字面量"必须原样出现在执行版里 ----
    tricky = [s for s in lits if "--" in s or "/*" in s]
    for s in tricky:
        if s not in exec_text:
            raise SystemExit("！这个字面量被误削了：%s" % s)

    # ---- 改写：字面量里的英文分号 → ' || chr(59) || ' ----
    exec_final, n_rewritten = rewrite_semis(exec_text)

    # ---- 自检 ⑥：这一改写必须可逆（换回去 = 剥注释后的原文） ----
    if exec_final.replace(SEMI_JOIN, ";") != exec_text:
        raise SystemExit("！分号改写不可逆 —— 内容被改动了，已中止")

    # ---- 自检 ⑦：改完之后，任何字符串字面量里都不该再有分号 ----
    _, lits2, semi_left = scan(exec_final)
    if semi_left != 0:
        raise SystemExit("！执行版里仍有 %d 个分号在字符串内，切分还是会出错" % semi_left)
    if any(";" in s for s in lits2):
        raise SystemExit("！执行版里仍有无处不在的分号字面量")

    # ---- 自检 ④：语句条数（按分号切，只统计字符串外的分号）----
    n_stmt = count_statements(exec_final)
    if n_stmt != count_statements(exec_text):
        raise SystemExit("！改写前后语句条数不一致")

    # ---- 自检 ⑤：有 sqlglot 就用真正的 PG 解析器再核一遍 ----
    dialect_ok, dialect_note = verify_with_sqlglot(exec_final, label)

    with io.open(dst_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(exec_final)

    print("=" * 72)
    print("  %s" % label)
    print("=" * 72)
    print("  源文件 : %s" % src_path)
    print("  执行版 : %s" % dst_path)
    print()
    print(u"  ① 剥注释前后内容一致（除空白）............ ✅")
    print(u"  ② 执行版注释残留 0 处.................... ✅")
    print(u"  ③ 含 -- 的字符串字面量 %d 个，全部保住..... ✅" % len(tricky))
    print(u"  ④ 语句数 %d 条" % n_stmt)
    print(u"  ⑤ %s" % dialect_note)
    print(u"  ⑥ 分号改写可逆.......................... ✅")
    print(u"  ⑦ 字面量内残留分号 0 个.................. ✅（改写 %d 个）" % n_rewritten)
    print()
    print(u"  行数 %d 行（源 %d 行，剥掉 %d 行注释说明）"
          % (exec_final.count("\n"), len(src_lines), len(src_lines) - exec_final.count("\n")))
    print(u"  源文件注释里带英文分号的行：%d 行 ← 这就是必须剥注释的原因"
          % count_semi_in_comments(src))
    print(u"  源文件字符串字面量里含英文分号：%d 个（共 %d 处）← 这就是必须改写分号的原因"
          % (sum(1 for s in lits if ";" in s), semi_in_str))
    print()
    return n_stmt


def main():
    pick = sys.argv[1] if len(sys.argv) > 1 else "all"
    targets = [t for t in TARGETS if pick in ("all", t[0])]
    if not targets:
        raise SystemExit(u"！不认识参数「%s」，只接受 all / schema / seed" % pick)
    for label, src, dst in targets:
        process(label, src, dst)


if __name__ == "__main__":
    main()
