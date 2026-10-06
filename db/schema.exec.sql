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
