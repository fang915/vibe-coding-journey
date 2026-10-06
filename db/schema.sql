-- =============================================================================
--  寻味 / Xunwei —— 数据库表结构  schema.sql
--  ---------------------------------------------------------------------------
--  依据：api-contract.md（接口契约）+ TECH_DESIGN.md §13（数据模型设计）
--  目标库：腾讯云 CloudBase「PostgreSQL 数据库」（本环境是 PG 模式）
--  方言：PostgreSQL（不是 MySQL —— 见下面「和 MySQL 的差异」）
--  生成日：2026-10-02（Day 16 板块②）
--
--  【为什么是 PostgreSQL 而不是 MySQL】
--    云开发环境的**运行模式在创建时由数据库类型决定，创建后不可切换**。
--    本环境是 PG 模式，所以只能建 PostgreSQL 关系型库。
--    （原来的 MySQL 版脚本已按此改写，表结构、列、约束一个都没少。）
--
--  【怎么用】
--    云开发控制台 → 左侧「SQL 型数据库」→「SQL 编辑器」→ 确认上方 schema 是 public
--    → 整段粘贴执行。
--    （另一条路：数据库设置 → 账号管理 建账号密码 → 点「数据库管理」进 DMC → SQL 窗口。
--      两条路的 SQL 完全一样；DMC 是数据库管理工具，不建议当业务入口。）
--
--  【可重复执行】
--    建表和建索引都带 IF NOT EXISTS：重复执行不报错、也不清已存数据。
--    COMMENT ON 是覆盖式语句，重复执行无害。
--    ⚠️ IF NOT EXISTS 只能"补建缺失的表"，**不会**修改已存在表的列定义。
--       以后要改列定义，得先删表重建（见文件末尾「彻底重建」那段）。
--
--  【执行顺序】
--    regions → dishes → (别名/事实/出处) → dish_fact_sources
--    顺序不能乱：外键要求被引用的表先存在。（文件里已按此顺序排好，整段执行即可。）
--    官方推荐的完整顺序是：建表 → 启用 RLS → 授权 → 建策略。
--    本期**只做第一步**，后三步涉及权限模型，留到 Day 17 定（见文件末尾说明）。
--
--  【和 MySQL 的差异（对照着看，别看错）】
--    | MySQL                        | PostgreSQL                              |
--    |------------------------------|-----------------------------------------|
--    | ENGINE=InnoDB / CHARSET=…    | 无（库级就是 UTF8，不用写）               |
--    | 列里内联 COMMENT '…'          | 独立语句 COMMENT ON COLUMN …             |
--    | 表尾 COMMENT='…'              | 独立语句 COMMENT ON TABLE …              |
--    | ENUM('a','b')                | TEXT + CHECK (x IN ('a','b'))            |
--    | TINYINT / SMALLINT UNSIGNED  | SMALLINT / INTEGER + CHECK (x > 0)       |
--    | KEY idx_x (…) 内联            | 独立语句 CREATE INDEX IF NOT EXISTS       |
--    | UNIQUE KEY uk_x (…)          | CONSTRAINT uk_x UNIQUE (…)               |
--    | ON UPDATE CURRENT_TIMESTAMP  | 无等价写法（要触发器），本期不加          |
--    | SET NAMES utf8mb4            | 无（客户端编码默认 UTF8）                 |
--    | SHOW TABLES                  | 查 information_schema.tables             |
--
--  【列宽说明】
--    PG 里 VARCHAR(n) 与 TEXT 性能相同，保留 VARCHAR(n) 不是为了性能，
--    而是让"这个字段最长多少"写在库里、顺便当一道校验。正文类字段一律 TEXT。
-- =============================================================================


-- -----------------------------------------------------------------------------
--  1 / 6   regions —— 省级行政区字典（34 行，一行一个省）
--         没有外键依赖，必须最先建。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regions (
  slug          VARCHAR(32) NOT NULL,
  name_zh       VARCHAR(32) NOT NULL,
  name_en       VARCHAR(64) NOT NULL,
  group_id      VARCHAR(16) NOT NULL,
  group_name_zh VARCHAR(16) NOT NULL,
  group_name_en VARCHAR(32) NOT NULL,
  group_order   SMALLINT    NOT NULL CONSTRAINT ck_regions_group_order CHECK (group_order BETWEEN 1 AND 8),
  sort_order    SMALLINT    NOT NULL CONSTRAINT ck_regions_sort_order CHECK (sort_order > 0),
  CONSTRAINT pk_regions          PRIMARY KEY (slug),
  CONSTRAINT uk_regions_name_zh  UNIQUE (name_zh)
);

CREATE INDEX IF NOT EXISTS idx_regions_order ON public.regions (group_order, sort_order);

COMMENT ON TABLE  public.regions               IS '省级行政区字典（34 行）。count（该省收录几道）不存，用 JOIN dishes 现算';
COMMENT ON COLUMN public.regions.slug          IS '省级英文短名（主键）。地址栏用它：#/region/guangxi。陕西只能用 shaanxi（纯拼音会和山西 shanxi 撞车）';
COMMENT ON COLUMN public.regions.name_zh       IS '中文名，如「广西」。接口响应里这个字段叫 key';
COMMENT ON COLUMN public.regions.name_en       IS '英文名，如 Guangxi';
COMMENT ON COLUMN public.regions.group_id      IS '地理分区 id：north/northeast/east/central/south/southwest/northwest/hmt';
COMMENT ON COLUMN public.regions.group_name_zh IS '分区中文名，如「华南」';
COMMENT ON COLUMN public.regions.group_name_en IS '分区英文名，如 South China';
COMMENT ON COLUMN public.regions.group_order   IS '分区显示顺序，1-8。响应里的 groups[] 按它排序';
COMMENT ON COLUMN public.regions.sort_order    IS '区内显示顺序，从 1 开始（目录页的排列顺序）';


-- -----------------------------------------------------------------------------
--  2 / 6   dishes —— 菜品主表（12 行）
--         ★ region_slug 是唯一的外键出口，指向 regions.slug。
--           一个地区多道菜、一道菜只属一个地区（一对多）。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dishes (
  id                      VARCHAR(64)  NOT NULL,
  status                  TEXT         NOT NULL DEFAULT 'published'
                            CONSTRAINT ck_dishes_status CHECK (status IN ('published','draft')),
  name_zh                 VARCHAR(32)  NOT NULL,
  name_en                 VARCHAR(64)  NOT NULL,
  region_slug             VARCHAR(32)  NOT NULL,
  region_zh               VARCHAR(32)  NOT NULL,
  region_en               VARCHAR(64)  NOT NULL,
  tagline_zh              VARCHAR(255) NOT NULL,
  tagline_en              VARCHAR(255) NOT NULL,
  block_origin_zh         TEXT         NOT NULL,
  block_origin_en         TEXT         NOT NULL,
  block_story_zh          TEXT         NOT NULL,
  block_story_en          TEXT         NOT NULL,
  block_technique_zh      TEXT         NOT NULL,
  block_technique_en      TEXT         NOT NULL,
  note_zh                 TEXT         NULL,
  note_en                 TEXT         NULL,
  image_thumb_url         VARCHAR(512) NULL,
  image_thumb_width       INTEGER      NULL CONSTRAINT ck_dishes_thumb_w  CHECK (image_thumb_width  > 0),
  image_thumb_height      INTEGER      NULL CONSTRAINT ck_dishes_thumb_h  CHECK (image_thumb_height > 0),
  image_hero_url          VARCHAR(512) NULL,
  image_hero_width        INTEGER      NULL CONSTRAINT ck_dishes_hero_w   CHECK (image_hero_width   > 0),
  image_hero_height       INTEGER      NULL CONSTRAINT ck_dishes_hero_h   CHECK (image_hero_height  > 0),
  image_alt_zh            VARCHAR(255) NULL,
  image_alt_en            VARCHAR(255) NULL,
  image_credit_author     VARCHAR(64)  NULL,
  image_credit_license    VARCHAR(32)  NULL,
  image_credit_license_url VARCHAR(255) NULL,
  image_credit_page       VARCHAR(512) NULL,
  search_text             VARCHAR(255) NOT NULL,
  sort_order              SMALLINT     NOT NULL CONSTRAINT ck_dishes_sort_order CHECK (sort_order > 0),
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT pk_dishes PRIMARY KEY (id),
  CONSTRAINT fk_dishes_region_region_slug
    FOREIGN KEY (region_slug) REFERENCES public.regions (slug)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_dishes_region      ON public.dishes (region_slug);
CREATE INDEX IF NOT EXISTS idx_dishes_status_sort ON public.dishes (status, sort_order);

COMMENT ON TABLE  public.dishes                  IS '菜品主表。列表页读摘要列，卡片页再取 blocks/facts/sources';
COMMENT ON COLUMN public.dishes.id               IS 'ASCII 短名（主键），卡片页地址 #/dish/{id}。★永不可改——改了旧链接全断';
COMMENT ON COLUMN public.dishes.status           IS 'published=已核实可展示；draft=内容整理中（前端一个字都不展示）。PG 无 ENUM 列类型，用 CHECK 在库层挡住非法值';
COMMENT ON COLUMN public.dishes.name_zh          IS '菜名中文，如「螺蛳粉」（实测最长 6 字符）';
COMMENT ON COLUMN public.dishes.name_en          IS '菜名英文，如 Liuzhou Luosifen (Snail Rice Noodles)（实测最长 42）';
COMMENT ON COLUMN public.dishes.region_slug      IS '★外键 → regions.slug。地区筛选靠它等值匹配，不再用字符串前缀';
COMMENT ON COLUMN public.dishes.region_zh        IS '展示用细地名（省名打头），如「广西柳州」。比 region_slug 更具体，两者分工不同';
COMMENT ON COLUMN public.dishes.region_en        IS '细地名英文，如 Liuzhou, Guangxi';
COMMENT ON COLUMN public.dishes.tagline_zh       IS '一句话卖点（实测最长 38 字符）';
COMMENT ON COLUMN public.dishes.tagline_en       IS '一句话卖点英文（实测最长 158 字符）';
COMMENT ON COLUMN public.dishes.block_origin_zh  IS '起源段中文。★★含 [[sourceId]] 出处标记，存取都必须原样保留，不得剥掉/转义';
COMMENT ON COLUMN public.dishes.block_origin_en  IS '起源段英文，同上';
COMMENT ON COLUMN public.dishes.block_story_zh   IS '故事段中文，含 [[sourceId]] 标记';
COMMENT ON COLUMN public.dishes.block_story_en   IS '故事段英文（实测最长 2312 字符，是全文最长的一列，故用 TEXT）';
COMMENT ON COLUMN public.dishes.block_technique_zh IS '做法段中文，含 [[sourceId]] 标记';
COMMENT ON COLUMN public.dishes.block_technique_en IS '做法段英文';
COMMENT ON COLUMN public.dishes.note_zh          IS '补充说明中文。仅 status=draft 时展示（本期 12 道都没用到）';
COMMENT ON COLUMN public.dishes.note_en          IS '补充说明英文，同上';
COMMENT ON COLUMN public.dishes.image_thumb_url  IS '列表缩略图地址（维基缩略图，带尺寸参数；实测最长 199）。7 道无图，允许 NULL';
COMMENT ON COLUMN public.dishes.image_thumb_width  IS '缩略图宽，如 330。CHECK 在 NULL 上不生效，所以"无图"和"宽为 0"是两回事';
COMMENT ON COLUMN public.dishes.image_thumb_height IS '缩略图高，如 222';
COMMENT ON COLUMN public.dishes.image_hero_url   IS '卡片大图地址（实测最长 200）';
COMMENT ON COLUMN public.dishes.image_hero_width   IS '大图宽，如 1280';
COMMENT ON COLUMN public.dishes.image_hero_height  IS '大图高，如 862';
COMMENT ON COLUMN public.dishes.image_alt_zh     IS '大图替代文字中文（无障碍必需，实测最长 28）';
COMMENT ON COLUMN public.dishes.image_alt_en     IS '大图替代文字英文（实测最长 128）';
COMMENT ON COLUMN public.dishes.image_credit_author IS '图片作者，如 N509FZ。CC BY-SA 4.0 要求署名，不是装饰';
COMMENT ON COLUMN public.dishes.image_credit_license IS '许可证名，如 CC BY-SA 4.0';
COMMENT ON COLUMN public.dishes.image_credit_license_url IS '许可证地址';
COMMENT ON COLUMN public.dishes.image_credit_page IS '图片原始页面地址（实测最长 107）';
COMMENT ON COLUMN public.dishes.search_text      IS '★派生列：归一化后的检索串（id+中英名+中英细地名）。供 /api/dishes?q= 用，不进接口响应';
COMMENT ON COLUMN public.dishes.sort_order       IS '列表默认顺序 = data/dishes.json 里的数组顺序';
COMMENT ON COLUMN public.dishes.created_at       IS '入库时间。PG 无 MySQL 的 ON UPDATE CURRENT_TIMESTAMP，本期无写入场景，故不加触发器';
COMMENT ON COLUMN public.dishes.updated_at       IS '最后修改时间。同上：本期靠写入方显式赋值，不自动更新';


-- -----------------------------------------------------------------------------
--  3 / 6   dish_aliases —— 别名（108 行）
--         搜索用：错别字、方言名、英文别名都放这里。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dish_aliases (
  dish_id    VARCHAR(64) NOT NULL,
  alias      VARCHAR(64) NOT NULL,
  alias_norm VARCHAR(64) NOT NULL,
  sort_order SMALLINT    NOT NULL CONSTRAINT ck_aliases_sort_order CHECK (sort_order >= 0),
  CONSTRAINT pk_dish_aliases PRIMARY KEY (dish_id, alias),
  CONSTRAINT fk_aliases_dish
    FOREIGN KEY (dish_id) REFERENCES public.dishes (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_alias_norm ON public.dish_aliases (alias_norm);

COMMENT ON TABLE  public.dish_aliases            IS '菜品别名。主键用复合键，天然挡掉"同一道菜重复录入同一别名"';
COMMENT ON COLUMN public.dish_aliases.dish_id    IS '外键 → dishes.id，删菜时级联删';
COMMENT ON COLUMN public.dish_aliases.alias      IS '别名原文，如「螺狮粉」「snail noodles」（实测最长 32 字符）';
COMMENT ON COLUMN public.dish_aliases.alias_norm IS '★派生列：归一化后的别名（转小写、去空格与 · ・ - _ / （） ( ) 「」 【】），供搜索用';
COMMENT ON COLUMN public.dish_aliases.sort_order IS '显示顺序，对应 aliases 数组下标（从 0 开始）';


-- -----------------------------------------------------------------------------
--  4 / 6   dish_facts —— 关键事实清单（90 行）
--         ★ 主键 (dish_id, seq) 用的是自然业务键，不另加自增 id：
--           seq 就是 facts 数组的下标+1，这样种子数据是确定性的。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dish_facts (
  dish_id VARCHAR(64) NOT NULL,
  seq     SMALLINT    NOT NULL CONSTRAINT ck_facts_seq CHECK (seq > 0),
  text_zh TEXT        NOT NULL,
  text_en TEXT        NOT NULL,
  CONSTRAINT pk_dish_facts PRIMARY KEY (dish_id, seq),
  CONSTRAINT fk_facts_dish
    FOREIGN KEY (dish_id) REFERENCES public.dishes (id) ON DELETE CASCADE
);

COMMENT ON TABLE  public.dish_facts          IS '关键事实。每条事实通过 dish_fact_sources 挂 1..N 个出处';
COMMENT ON COLUMN public.dish_facts.dish_id  IS '外键 → dishes.id，删菜时级联删';
COMMENT ON COLUMN public.dish_facts.seq      IS '显示序号，从 1 开始（= facts 数组下标+1）';
COMMENT ON COLUMN public.dish_facts.text_zh  IS '事实中文（实测最长 158 字符）';
COMMENT ON COLUMN public.dish_facts.text_en  IS '事实英文（实测最长 503 字符，恰好卡在 VARCHAR(512) 边界，故用 TEXT 不冒险）';


-- -----------------------------------------------------------------------------
--  5 / 6   dish_sources —— 出处（33 行）
--         ★★ 主键必须是 (dish_id, source_id) 复合键，不能只用 source_id：
--            「ihchina」这个 id 出现在 5 道菜里、指向 5 个不同的网址
--            （每道菜的非遗项目页不同）。source_id 只在"一道菜之内"唯一。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dish_sources (
  dish_id    VARCHAR(64)  NOT NULL,
  source_id  VARCHAR(64)  NOT NULL,
  title      VARCHAR(255) NOT NULL,
  url        VARCHAR(512) NOT NULL,
  accessed   DATE         NOT NULL,
  sort_order SMALLINT     NOT NULL CONSTRAINT ck_sources_sort_order CHECK (sort_order > 0),
  CONSTRAINT pk_dish_sources PRIMARY KEY (dish_id, source_id),
  CONSTRAINT fk_sources_dish
    FOREIGN KEY (dish_id) REFERENCES public.dishes (id) ON DELETE CASCADE
);

COMMENT ON TABLE  public.dish_sources            IS '出处。正文 [[id]] 与 facts[].sources 都指向这里的 source_id';
COMMENT ON COLUMN public.dish_sources.dish_id    IS '外键 → dishes.id，删菜时级联删';
COMMENT ON COLUMN public.dish_sources.source_id  IS '菜内局部 id，如 ihchina / xinhua（实测最长 18 字符）。跨菜可重复，指向不同网址';
COMMENT ON COLUMN public.dish_sources.title      IS '来源标题（实测最长 79 字符）';
COMMENT ON COLUMN public.dish_sources.url        IS '来源网址（实测最长 90 字符）';
COMMENT ON COLUMN public.dish_sources.accessed   IS '访问日期。只精确到天（DATE，不是 TIMESTAMPTZ），不假装有时分秒';
COMMENT ON COLUMN public.dish_sources.sort_order IS '出处列表显示顺序';


-- -----------------------------------------------------------------------------
--  6 / 6   dish_fact_sources —— 事实 ↔ 出处（101 行，多对多）
--         ★★ 这张表挂两个复合外键，两条都带 dish_id，于是
--            「螺蛳粉的第 3 条事实引用了兰州牛肉面的出处」在库层面插不进去。
--            数据一致性由外键保证，不靠人自觉。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dish_fact_sources (
  dish_id    VARCHAR(64) NOT NULL,
  fact_seq   SMALLINT    NOT NULL,
  source_id  VARCHAR(64) NOT NULL,
  sort_order SMALLINT    NOT NULL CONSTRAINT ck_dfs_sort_order CHECK (sort_order > 0),
  CONSTRAINT pk_dish_fact_sources PRIMARY KEY (dish_id, fact_seq, source_id),
  CONSTRAINT fk_dfs_facts
    FOREIGN KEY (dish_id, fact_seq) REFERENCES public.dish_facts (dish_id, seq) ON DELETE CASCADE,
  CONSTRAINT fk_dfs_sources
    FOREIGN KEY (dish_id, source_id) REFERENCES public.dish_sources (dish_id, source_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dfs_source ON public.dish_fact_sources (dish_id, source_id);

COMMENT ON TABLE  public.dish_fact_sources            IS '事实与出处的多对多关系表（一条事实可引多条出处）';
COMMENT ON COLUMN public.dish_fact_sources.dish_id    IS '既属哪道菜，同时是两个外键的组成部分';
COMMENT ON COLUMN public.dish_fact_sources.fact_seq   IS '指向 dish_facts.seq';
COMMENT ON COLUMN public.dish_fact_sources.source_id  IS '指向 dish_sources.source_id（同一道菜内）';
COMMENT ON COLUMN public.dish_fact_sources.sort_order IS '角标顺序，决定正文里 [1][2] 的编号';


-- =============================================================================
--  执行完怎么自查（不用等 seed）
--
--  ① 6 张表都在：
--     SELECT table_name FROM information_schema.tables
--      WHERE table_schema = 'public' ORDER BY table_name;
--
--  ② 6 条外键都建上了（应返回 6 行）：
--     SELECT c.conname AS 约束名,
--            c.conrelid::regclass  AS 表,
--            c.confrelid::regclass AS 引用
--       FROM pg_constraint c
--       JOIN pg_class t     ON t.oid = c.conrelid
--       JOIN pg_namespace n ON n.oid = t.relnamespace
--      WHERE c.contype = 'f' AND n.nspname = 'public'
--      ORDER BY 1;
--     预期 6 条：
--       fk_dishes_region_region_slug → regions
--       fk_aliases_dish / fk_facts_dish / fk_sources_dish → dishes
--       fk_dfs_facts → dish_facts ／ fk_dfs_sources → dish_sources
--
--  ③ 列数和注释都齐（应返回 59 行，且 comment 列不为空）：
--     SELECT c.table_name, count(*) AS 列数
--       FROM information_schema.columns c
--      WHERE c.table_schema = 'public'
--      GROUP BY c.table_name ORDER BY c.table_name;
--     预期：regions 8 / dishes 33 / dish_aliases 4 / dish_facts 4 /
--           dish_sources 6 / dish_fact_sources 4 = 59 列
--     SELECT count(*) AS 有注释的列数 FROM pg_description d
--       JOIN pg_class t     ON t.oid = d.objoid
--       JOIN pg_namespace n ON n.oid = t.relnamespace
--      WHERE d.objsubid > 0 AND n.nspname = 'public';   -- 预期 59
--
--  ★ 想让"重复执行不报错"当场可见：把本文件**再执行一遍**，应零报错、表还在。
-- =============================================================================


-- =============================================================================
--  【第 17 天再定】权限与 RLS（今天不动，先留个位置）
--
--  PG 模式的安全模型是三件事叠加：GRANT（表级，能做什么）+ RLS（行级，能看哪些行）
--  + 三类角色（anon / authenticated / service_role）。
--  云函数读库走的是 service_role（API Key），它**绕过 RLS**。
--
--  本期数据是"谁都该能读"的公开内容，且浏览器不直连数据库（走云函数），
--  所以今天不启用 RLS。等 Day 17 写接口时再决定要不要加一层兜底，例如：
--
--    -- 只读表 + 允许匿名读，但不允许任何写
--    -- ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
--    -- GRANT SELECT ON public.dishes, public.regions, …  TO anon, authenticated;
--    -- CREATE POLICY dishes_read_all ON public.dishes FOR SELECT TO anon, authenticated USING (true);
--
--  ⚠️ 启用 RLS 后若一条策略都不建，除 service_role 外**全部拒绝**（默认拒绝），
--     接口会 403。所以"启用 RLS"和"建策略"必须成对做，不能只做一半。
-- =============================================================================

-- =============================================================================
--  彻底重建用（★默认注释掉，手滑执行会删光数据）
--  需要改列定义时，去掉注释执行，然后重跑 schema.sql + seed.sql。
--  删除顺序与建表顺序相反（先删子表，再删父表）：
--    DROP TABLE IF EXISTS public.dish_fact_sources;
--    DROP TABLE IF EXISTS public.dish_sources;
--    DROP TABLE IF EXISTS public.dish_facts;
--    DROP TABLE IF EXISTS public.dish_aliases;
--    DROP TABLE IF EXISTS public.dishes;
--    DROP TABLE IF EXISTS public.regions;
-- =============================================================================
