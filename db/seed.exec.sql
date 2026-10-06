DELETE FROM public.dish_fact_sources;
DELETE FROM public.dish_sources;
DELETE FROM public.dish_facts;
DELETE FROM public.dish_aliases;
DELETE FROM public.dishes;
DELETE FROM public.regions;

INSERT INTO public.regions
  (slug, name_zh, name_en, group_id, group_name_zh, group_name_en, group_order, sort_order)
VALUES
  ('beijing', '北京', 'Beijing', 'north', '华北', 'North China', 1, 1),
  ('tianjin', '天津', 'Tianjin', 'north', '华北', 'North China', 1, 2),
  ('hebei', '河北', 'Hebei', 'north', '华北', 'North China', 1, 3),
  ('shanxi', '山西', 'Shanxi', 'north', '华北', 'North China', 1, 4),
  ('neimenggu', '内蒙古', 'Inner Mongolia', 'north', '华北', 'North China', 1, 5),
  ('liaoning', '辽宁', 'Liaoning', 'northeast', '东北', 'Northeast China', 2, 1),
  ('jilin', '吉林', 'Jilin', 'northeast', '东北', 'Northeast China', 2, 2),
  ('heilongjiang', '黑龙江', 'Heilongjiang', 'northeast', '东北', 'Northeast China', 2, 3),
  ('shanghai', '上海', 'Shanghai', 'east', '华东', 'East China', 3, 1),
  ('jiangsu', '江苏', 'Jiangsu', 'east', '华东', 'East China', 3, 2),
  ('zhejiang', '浙江', 'Zhejiang', 'east', '华东', 'East China', 3, 3),
  ('anhui', '安徽', 'Anhui', 'east', '华东', 'East China', 3, 4),
  ('fujian', '福建', 'Fujian', 'east', '华东', 'East China', 3, 5),
  ('jiangxi', '江西', 'Jiangxi', 'east', '华东', 'East China', 3, 6),
  ('shandong', '山东', 'Shandong', 'east', '华东', 'East China', 3, 7),
  ('henan', '河南', 'Henan', 'central', '华中', 'Central China', 4, 1),
  ('hubei', '湖北', 'Hubei', 'central', '华中', 'Central China', 4, 2),
  ('hunan', '湖南', 'Hunan', 'central', '华中', 'Central China', 4, 3),
  ('guangdong', '广东', 'Guangdong', 'south', '华南', 'South China', 5, 1),
  ('guangxi', '广西', 'Guangxi', 'south', '华南', 'South China', 5, 2),
  ('hainan', '海南', 'Hainan', 'south', '华南', 'South China', 5, 3),
  ('chongqing', '重庆', 'Chongqing', 'southwest', '西南', 'Southwest China', 6, 1),
  ('sichuan', '四川', 'Sichuan', 'southwest', '西南', 'Southwest China', 6, 2),
  ('guizhou', '贵州', 'Guizhou', 'southwest', '西南', 'Southwest China', 6, 3),
  ('yunnan', '云南', 'Yunnan', 'southwest', '西南', 'Southwest China', 6, 4),
  ('xizang', '西藏', 'Tibet', 'southwest', '西南', 'Southwest China', 6, 5),
  ('shaanxi', '陕西', 'Shaanxi', 'northwest', '西北', 'Northwest China', 7, 1),
  ('gansu', '甘肃', 'Gansu', 'northwest', '西北', 'Northwest China', 7, 2),
  ('qinghai', '青海', 'Qinghai', 'northwest', '西北', 'Northwest China', 7, 3),
  ('ningxia', '宁夏', 'Ningxia', 'northwest', '西北', 'Northwest China', 7, 4),
  ('xinjiang', '新疆', 'Xinjiang', 'northwest', '西北', 'Northwest China', 7, 5),
  ('hong-kong', '中国香港', 'Hong Kong, China', 'hmt', '港澳台', 'Hong Kong, Macao & Taiwan', 8, 1),
  ('macao', '中国澳门', 'Macao, China', 'hmt', '港澳台', 'Hong Kong, Macao & Taiwan', 8, 2),
  ('taiwan', '中国台湾', 'Taiwan, China', 'hmt', '港澳台', 'Hong Kong, Macao & Taiwan', 8, 3);

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'luosifen',
    'published',
    '螺蛳粉',
    'Liuzhou Luosifen (Snail Rice Noodles)',
    'guangxi',
    '广西柳州',
    'Liuzhou, Guangxi',
    '一碗闻着「臭」、吃着香的米粉，来自柳江边的夜市。',
    'A rice-noodle bowl that smells strong and tastes unforgettable — born in the night markets by the Liujiang River.',

    '螺蛳粉出自广西柳州。柳州位于广西中北部，史称「龙城」——当地多山多梯田，红土肥沃、雨量充沛，既盛产稻谷，也盛产生活在石缝与山泉间的石螺（本地俗称「螺蛳」）[[ihchina]]。明清以来，当地人就把螺蛳和米粉这两样东西放在一起做[[ihchina]]；到清末民初，这门手艺基本成形，并在柳州民间的私营餐饮店铺里流传开来[[ihchina]]。

真正让螺蛳粉「出圈」的是夜市：20 世纪七八十年代，柳州夜市逐渐繁荣，食客吃米粉时会要求加一勺鲜辣的螺蛳汤，摊主们久而久之开始直接用螺蛳汤煮米粉，今天的螺蛳粉由此定型[[xinhua]]。

2021 年，柳州螺蛳粉制作技艺被列入第五批国家级非物质文化遗产代表性项目名录（编号 Ⅷ-277）[[ihchina]]。',

    'Luosifen comes from Liuzhou, in north-central Guangxi — a city historically known as "Dragon City". Its hills, terraced fields and wet climate suit both rice growing and the stone snails (locally called luosi) that live in rock crevices and mountain springs [[ihchina]]. Since the Ming and Qing dynasties local cooks have combined snails with rice noodles' || chr(59) || ' the craft took shape around the end of the Qing dynasty and the early Republic and spread among private eateries in Liuzhou [[ihchina]].

What made it famous was the night market: through the 1970s and 1980s Liuzhous night markets grew busy, diners began asking for a spoonful of spicy snail broth on their noodles, and vendors eventually cooked the noodles directly in snail broth — the dish as we know it today [[xinhua]].

In 2021 the craft was added to Chinas fifth national list of intangible cultural heritage (item no. Ⅷ-277) [[ihchina]].',

    '关于锅里那一勺汤，流传最广的一种说法是这样的：20 世纪七八十年代的柳州夜市，有人吃米粉时随口要求摊主加一勺煮螺蛳的鲜辣汤；这个吃法很快传开，摊主们索性改用螺蛳汤来煮米粉，螺蛳粉就此诞生[[xinhua]]。

柳州人与螺的渊源则要久远得多。柳州所在的柳江流域，先民很早就有「嗦螺」的饮食习惯——碗里那一颗颗螺，其来路可以追到两万多年前的柳江先人[[lzzx]]。

在柳州，几乎每家粉店都有自己的配方。食材怎么处理、汤怎么配比，常年「秘不外传」，靠家族和师徒关系一代一代传下来[[ihchina]]。',

    'The most widely told story about that spoonful of broth goes like this: in the night markets of Liuzhou in the 1970s and 1980s, a diner casually asked the vendor to add a spoonful of spicy snail broth to his rice noodles. The idea spread fast, vendors began cooking the noodles in snail broth altogether, and luosifen was born [[xinhua]].

Liuzhous relationship with snails goes back much further. In the Liujiang river basin where the city sits, people were eating snails long before that — the snails in the bowl trace back to the ancestors who lived along the Liujiang more than 20,000 years ago [[lzzx]].

In Liuzhou almost every noodle shop keeps its own recipe. How ingredients are handled and how the broth is balanced is traditionally kept "in the family", passed down through families and from master to apprentice [[ihchina]].',

    '螺蛳粉的风味常被概括为五个字：酸、辣、鲜、爽、烫[[ihchina]]。

汤是精髓，而做汤的关键是「炒螺」：石螺先「飞水」，再下铁锅干炒出味，与十几种香料猛火爆炒，让螺吸足香气；然后加水没过螺，文火收汁，再同猪筒骨、茴香、紫苏一起熬煮到出味，最后冲入辣椒油，调成螺蛳汤[[ihchina]]。

米粉用隔年糙米与新出油的黏米混合，以山泉水研磨成米浆制成，既保留营养，又韧性爽滑[[ihchina]]。

酸笋是另一个灵魂：选用鲜嫩春笋，经山泉水浸泡 72 天自然发酵（发酵：让食材在微生物作用下自然变化的过程，酸味和气味由此而来），软嫩酸爽[[ihchina]]。很多人闻到的那股「臭」味，就来自酸笋的发酵[[xinhua]]。常见配料还有酸豆角、木耳、花生、腐竹等[[xinhua]]。',

    'The flavour of luosifen is usually summed up in five words: sour, spicy, fresh, crisp and hot [[ihchina]].

The broth is the heart of it, and the key step is dry-frying the snails: the stone snails are first blanched, then dry-fried in an iron wok to draw out their flavour, and stir-fried hard with a dozen or so spices so the meat absorbs the aroma. Water is added to cover the snails and the liquid is reduced over a low flame' || chr(59) || ' the snails are then simmered with pork marrow bones, fennel and perilla until the essence comes out, and finally chili oil is stirred in to finish the snail broth [[ihchina]].

The noodles are made from a mix of aged brown rice and fresh sticky rice, ground with mountain spring water into a batter — nutritious, chewy and smooth [[ihchina]].

Pickled bamboo shoots are the other soul of the dish: tender spring shoots are soaked in mountain spring water and left to ferment naturally for 72 days (fermentation: letting microbes change the food naturally — this is where the sourness and the smell come from), giving a soft, tangy crunch [[ihchina]]. The strong smell many people notice comes from that fermented bamboo shoot [[xinhua]]. Common toppings also include pickled green beans, wood ear mushrooms, peanuts and fried tofu skin [[xinhua]].',
    NULL, NULL,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Luosifen_at_Guangya%2C_Liuzhou_%2820190420141814%29.jpg/330px-Luosifen_at_Guangya%2C_Liuzhou_%2820190420141814%29.jpg', 330, 222,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Luosifen_at_Guangya%2C_Liuzhou_%2820190420141814%29.jpg/1280px-Luosifen_at_Guangya%2C_Liuzhou_%2820190420141814%29.jpg', 1280, 862,
    '一碗柳州螺蛳粉：米粉上铺着酸笋、花生、腐竹与青菜', 'A bowl of Liuzhou luosifen: rice noodles topped with pickled bamboo shoots, peanuts, fried tofu skin and greens',
    'N509FZ', 'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
    'https://commons.wikimedia.org/wiki/File:Luosifen_at_Guangya,_Liuzhou_(20190420141814).jpg',
    'luosifen|螺蛳粉|liuzhouluosifensnailricenoodles|广西柳州|liuzhou,guangxi',
    1
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'lanzhou-beef-noodles',
    'published',
    '兰州牛肉面',
    'Lanzhou Beef Noodles',
    'gansu',
    '甘肃兰州',
    'Lanzhou, Gansu',
    '一碗清汤，九种面型，兰州人管它叫「牛大」。',
    'One clear broth, nine noodle shapes — locals call it niuda, "the big beef bowl".',

    '兰州牛肉面出自甘肃兰州。兰州是黄河唯一穿城而过的省会城市，南岸是农耕文化、北岸是游牧文化，正处在中国地势第一级阶梯与第二级阶梯的交替处——黄土高原产的小麦，加上甘南、青海一带产的牛肉，凑成了这碗面的两样好食材[[ihchina]]。

这碗面已有一百多年历史。据近代地方志记载，技艺由回族厨师马保子始创：1915 年，他挑着担子沿街叫卖自创的「热锅子面」；1919 年，他在兰州东城壕开出了第一家门店[[ihchina]][[gansu]]。2021 年，「传统面食制作技艺（兰州牛肉面制作技艺）」被列入第五批国家级非物质文化遗产代表性项目名录（编号 Ⅷ-160，扩展项目，申报地区甘肃省兰州市，保护单位兰州市文化馆）[[ihchina]]。

在兰州本地，它的名字是「牛肉面」，兰州人亲昵地叫它「牛大」[[gansu]]；「兰州拉面」更多是外地人的叫法[[ctdsb]]。',

    'Lanzhou beef noodles come from Lanzhou in Gansu. Lanzhou is the only provincial capital the Yellow River runs through — farmland on the south bank, herding country on the north — and it sits where Chinas first and second steps of land meet. Wheat from the loess plateau on one side, beef from the Gannan grasslands and Qinghai on the other: that is what gives the bowl its two key ingredients [[ihchina]].

The craft is over a hundred years old. According to modern local gazetteers it was founded by the Hui chef Ma Baozi: in 1915 he sold his own "hot-pot noodles" from a shoulder pole, and in 1919 he opened his first shop at Dongchenghao in Lanzhou [[ihchina]][[gansu]]. In 2021 the traditional noodle-making technique of Lanzhou beef noodles was added to Chinas fifth national list of intangible cultural heritage (item no. Ⅷ-160, an extended item' || chr(59) || ' declaring region Lanzhou City, Gansu' || chr(59) || ' safeguarding body the Lanzhou Mass Art Centre) [[ihchina]].

In Lanzhou itself the dish is simply niurou mian, "beef noodles", or affectionately niuda — "the big beef" [[gansu]]. "Lanzhou lamian" is mostly what people outside Gansu call it [[ctdsb]].',

    '马保子只是开头。真正把「清」做成招牌的是他的儿子马杰三——他在「清」字上下功夫，不断改进技艺，最后得了个「闻香下马，知味停车」的名声[[ihchina]]。到今天，这门技艺已经传了 6 代[[ihchina]]。

在兰州，这碗面还长在日常生活里。当地人讲究赶早去喝「头汤」（一天里第一锅汤，最清最鲜），形容自己离不开它，说的是「三天不来个牛大碗，心里就七上八下」[[gansu]]。

外地人最容易困惑的是招牌：兰州本地几乎不挂「兰州拉面」的牌子[[ctdsb]]。20 世纪 80 年代末起，青海化隆、尖扎、循化一带的人外出开面馆，因为「青海」在外地没什么人认识，就借用了名气更大的「兰州」二字；1988 年，化隆农民韩录带着 7000 元和同乡到厦门，开了青海人在内地的第一家拉面馆[[ctdsb]]。这条路走了近四十年，近年青海省正推动把招牌换成「青海拉面」——按该省拉面产业行业协会的说法，这是品牌自立，不是两地相争[[ctdsb]]。',

    'Ma Baozi was only the beginning. It was his son Ma Jiesan who turned the idea of "clear" into the shops signature: he worked on that single quality, kept refining the craft, and earned the saying "smell the fragrance and dismount, taste the flavour and stop your cart" [[ihchina]]. Today the craft has passed through six generations [[ihchina]].

In Lanzhou the bowl also lives inside daily routine. People make a point of going early for the toutang — the "first broth" of the day, the clearest and freshest. Locals describe their dependence on it with the line: three days without a big bowl of niuda and everything feels off [[gansu]].

What puzzles visitors most is the signage. In Lanzhou itself shops almost never use the name "Lanzhou lamian" [[ctdsb]]. From the late 1980s, people from Hualong, Jianzha and Xunhua in Qinghai went out to open noodle shops' || chr(59) || ' because "Qinghai" meant little to customers elsewhere, they borrowed the far better known name "Lanzhou". In 1988 the Hualong farmer Han Lu took 7,000 yuan and some fellow villagers to Xiamen and opened the first Qinghai-run noodle shop in the interior [[ctdsb]]. That road ran for nearly forty years, and in recent years Qinghai has been encouraging shops to change their signs to "Qinghai lamian" — in the words of the provinces noodle industry association, a bid for its own brand identity rather than a contest between two provinces [[ctdsb]].',

    '面是骨。做面分选料、和面、饧面、溜条、拉面五步[[ihchina]]（饧面：把揉好的面团静置一段时间，让面筋松弛，后面才拉得开）。面团用高筋面粉，按「三遍水、三遍灰，九九八十一遍揉」的技法反复捣揉，还借助一种天然碱水——蓬灰。它由戈壁滩上的野生蓬草烧制而成，能让面条柔滑透亮、富有弹性[[gansu]]。

面型可以自己点：圆的从细如发丝的「毛细」，到细、二细、三细，再到较粗的「二柱子」；扁的有宽如韭叶的「韭叶」，以及更宽的「宽」和「大宽」；还有一种截面呈三角形的「荞麦棱子」[[gansu]]。国家级非遗项目页则把面型概括为 5 种粗细（粗、二细、三细、细、毛细）加 3 种宽度（大宽、宽、韭叶）[[ihchina]]。

汤是魂。选用甘南草原出产的新鲜牦牛肉或黄牛肉，清水洗净、浸泡后熬煮，放入草果、姜片、花椒、肉豆蔻、丁香、胡椒、白芷等十几种调料，小火炖 5 至 7 小时，让牛肉和牛骨的鲜味溶进汤里[[ihchina]]；甘肃省政府网站的说法是二十余种香料、文火慢炖四到七个小时[[gansu]]。

最后一步是浇汤：煮熟的拉面浇上清汤，佐以熟牛肉丁、香菜和蒜苗，调入红亮的辣椒油[[ihchina]]，再配上煮到透明的白萝卜片[[gansu]]——这几样凑齐，就是那句「一清、二白、三红、四绿、五黄」[[ihchina]][[gansu]]。',

    'The noodles are the bones of the dish. Making them takes five steps — choosing the flour, mixing the dough, resting it, working the strips and pulling [[ihchina]] (resting the dough: letting it stand so the gluten relaxes and the strands can be pulled). High-gluten flour is kneaded over and over by the rule "three rounds of water, three rounds of ash, eighty-one kneadings", helped along by a natural alkaline water called penghui, made by burning wild tumbleweed from the Gobi, which leaves the noodles smooth, translucent and springy [[gansu]].

You choose your shape: round noodles run from hair-thin maoxi through xi, erxi and sanxi up to the thicker erzhuizi' || chr(59) || ' flat ones include leek-leaf-wide jiuye, the wider kuan and the widest dakuang' || chr(59) || ' and there is even a triangular-cut shape called qiaomai lengzi [[gansu]]. The national heritage listing sums the range up as five thicknesses (cu, erxi, sanxi, xi, maoxi) plus three widths (dakuang, kuan, jiuye) [[ihchina]].

The broth is the soul. Fresh yak or yellow beef from the Gannan grasslands is washed, soaked, then simmered with a dozen or so spices — black cardamom, ginger, Sichuan pepper, nutmeg, clove, pepper and angelica — over a low flame for five to seven hours until the flavour of beef and bone dissolves into the liquid [[ihchina]]. The Gansu provincial governments account says more than twenty spices and four to seven hours [[gansu]].

The last step is the ladling: cooked noodles are topped with clear broth, diced cooked beef, coriander and garlic sprouts, then bright red chilli oil [[ihchina]], with slices of white radish boiled until translucent [[gansu]] — and that combination is what the well-known phrase describes: "one clear, two white, three red, four green, five yellow" [[ihchina]][[gansu]].',
    NULL, NULL,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/%E5%85%B0%E5%B7%9E%E7%89%9B%E8%82%89%E9%9D%A2.jpg/330px-%E5%85%B0%E5%B7%9E%E7%89%9B%E8%82%89%E9%9D%A2.jpg', 330, 220,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/%E5%85%B0%E5%B7%9E%E7%89%9B%E8%82%89%E9%9D%A2.jpg/1280px-%E5%85%B0%E5%B7%9E%E7%89%9B%E8%82%89%E9%9D%A2.jpg', 1280, 852,
    '一碗兰州牛肉面：清汤、白萝卜片、红辣油与香菜蒜苗', 'A bowl of Lanzhou beef noodles: clear broth, white radish slices, chilli oil and herbs',
    '三猎', 'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
    'https://commons.wikimedia.org/wiki/File:%E5%85%B0%E5%B7%9E%E7%89%9B%E8%82%89%E9%9D%A2.jpg',
    'lanzhoubeefnoodles|兰州牛肉面|lanzhoubeefnoodles|甘肃兰州|lanzhou,gansu',
    2
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'shaxian-snacks',
    'published',
    '沙县小吃',
    'Shaxian Snacks',
    'fujian',
    '福建三明沙县',
    'Shaxian, Sanming, Fujian',
    '中原南迁带来的一手点心，被一个县做成了 8.8 万家店。',
    'A snack repertoire carried south from the Central Plains — grown by a single county into 88,000 shops.',

    '沙县小吃出自福建三明沙县。它是古代中原民众向百越地区移民的过程中，为应付时令节气与民俗节庆活动需要而慢慢形成的一门技艺，因此既继承中原做法，也用南方食材——主要流布在三明市的沙县区、永安县、明溪县、清流县和宁化县，以沙县最为集中[[ihchina]]。沙县地处福建中部，历史上是南北与东西交流的重要通道，中原民众南迁、东南沿海与内陆的客货交通都在这里交汇；正因为要方便往来的商贾与游人，才长出了「经济实惠、品种繁多、方便快捷」这三个特征[[ihchina]]。

在名录上它有两个身份。省级层面叫「沙县小吃制作工艺」，2007 年 8 月 28 日由福建省人民政府公布列入第二批省级非物质文化遗产名录，保护单位为三明市沙县小吃同业公会[[fjwlt]]；2021 年，它以「小吃制作技艺（沙县小吃制作技艺）」列入第五批国家级非物质文化遗产代表性项目名录（项目序号 1522，编号 Ⅷ-276，类别传统技艺，新增项目，申报地区福建省三明市，保护单位沙县小吃同业公会）[[ihchina]]。

据《八闽通志》记载，沙县小吃兴于唐宋、盛于明清，在当代得到进一步发展[[ihchina]]。',

    'Shaxian snacks come from Shaxian in Sanming, Fujian. The craft took shape as people from the Central Plains migrated into the Baiyue lands and needed food for the farming calendar and for festivals, so it inherits Central Plains technique while using southern ingredients' || chr(59) || ' it is found mainly across the Sanming districts of Shaxian, Yongan, Mingxi, Qingliu and Ninghua, most densely in Shaxian itself [[ihchina]]. Shaxian sits in the middle of Fujian, historically a corridor between north and south and between the coast and the interior, where the southward migration of Central Plains people and the movement of goods to and from the coast both passed through. Serving travelling merchants and visitors is precisely what produced its three defining traits: affordable, varied and quick [[ihchina]].

It holds two heritage listings. At provincial level it appears as "Shaxian snack-making craft", proclaimed by the Fujian provincial government on 28 August 2007 in the provinces second batch of intangible cultural heritage, with the Shaxian Snack Trade Association as safeguarding body [[fjwlt]]. In 2021 it entered Chinas fifth national list of intangible cultural heritage as "snack-making technique (Shaxian snack-making technique)" — item no. 1522, code Ⅷ-276, category traditional craftsmanship, a newly added item, declared by Sanming City, Fujian, safeguarded by the Shaxian Snack Trade Association [[ihchina]].

The Fujian gazetteer Bamin Tongzhi records that Shaxian snacks rose in the Tang and Song dynasties and flourished in the Ming and Qing [[ihchina]].',

    '沙县在闽中，人多地少，资源并不宽裕。20 世纪 90 年代以来，沙县小吃同业公会在当地政府的支持下，把这门小吃推向了全国；如今沙县小吃从业者多达 6 万余人，店铺共 8.8 万个。近年来它开始拓展海外市场，以工艺独特、取材时令、注重健康、力争还原本味等特点受到好评[[ihchina]]。这门技艺以血缘传承、业缘传承的方式延续至今，也带出了一批名店、名厨[[ihchina]]。

门里还有讲究。沙县小吃大体分为两大流派：一派以城关为代表，受福州、厦门等沿海城市风味小吃影响，制作精细，口味清、鲜、淡、甜，代表品种有扁肉、烧麦、肉包、花椒饼、鱼丸、豆腐丸、烫嘴豆腐、烤豆干等，调味靠鲜香豆豉油，独具特色；另一派以夏茂一带为代表，原料以米、薯、芋为主，制作原始纯朴，原汁原味，口味咸、辣、酸，如米冻、喜粿、米冻皮、豆腐包、金钱蛋、芋包、浆糍、芋丝饼、牛肉系列食品等。此外，南霞泥鳅粉干、南阳蛋索、郑湖板鸭等也有一定知名度[[fjysg]]。',

    'Shaxian sits in central Fujian with little land for its population. Since the 1990s the Shaxian Snack Trade Association, backed by the local government, has pushed these snacks out across the country' || chr(59) || ' today the trade employs more than 60,000 people and runs 88,000 shops. In recent years it has begun moving overseas, winning praise for its distinctive craft, seasonal ingredients, healthy emphasis and effort to keep flavours close to the original [[ihchina]]. The technique has survived through kinship and through trade apprenticeship, producing a set of well-known shops and chefs [[ihchina]].

There are schools within the tradition. Shaxian snacks divide broadly into two lineages. One is represented by Chenguan, influenced by the coastal snacks of Fuzhou and Xiamen: finely made, with a clear, fresh, light and sweet profile — bianrou (wonton-like dumplings), shaomai, meat buns, Sichuan-pepper cakes, fish balls, tofu balls, scalding-hot tofu and grilled dried tofu, seasoned distinctively with savoury fermented black-bean oil. The other is represented by the Xiamao area, built on rice, potato and taro: plainer and more original, salty, spicy and sour — rice jelly, xiguo rice cakes, rice-jelly sheets, stuffed tofu, coin eggs, taro dumplings, jiangci rice cakes, shredded-taro cakes and a range of beef dishes. Nanxia loach rice noodles, Nanyang egg twists and Zhenghu pressed duck also have a following [[fjysg]].',

    '底子是本地食材：沙县小吃的食材多数取自本地，以竹荪、香芋、茶树菇等植物性原料为主，鸡、鸭、牛、羊等动物性原料为辅；主要佐料包括沙县纯辣酱、豆豉油、茂溪冬酒、花生酱等[[ihchina]]。

技法上，它把游、泡、捶、磨、踅、揉、晒、包、酿等制作工艺，与蒸、煮、烤、煎、烙、炖等烹饪方式相结合，用的工具也还是老一套——木槌、木墩、木楻、竹苈、舂臼、舂槌、饭甑、笊篱、烤炉、蒸笼、汤锅、灶、烙粑锅[[ihchina]]。这样做出来的是沙县扁肉、包心豆腐丸、沙县喜粿、米冻皮、板鸭等 110 余个小吃品种，其中可提前备好、或在数分钟内就能做好的快餐食品占沙县小吃总量的 90% 以上[[ihchina]]。

品种总数两处口径不同，一并列出：国家级项目页记「110 余个」，福建省数字文化馆的介绍则是「据不完全统计，目前沙县小吃有 240 多个品种」[[ihchina]][[fjysg]]。',

    'The base is local. Most ingredients come from Shaxian itself, dominated by plant materials such as bamboo fungus, taro and tea-tree mushrooms, with chicken, duck, beef and mutton as supporting animal ingredients' || chr(59) || ' the main seasonings are Shaxian pure chilli sauce, fermented black-bean oil, Maoxi winter wine and peanut sauce [[ihchina]].

As for method, the craft combines you, pao, chui, mo, xue, rou, shai, bao and niang — parching, soaking, pounding, grinding, rolling, kneading, sun-drying, wrapping and stuffing — with steaming, boiling, roasting, frying, griddling and stewing, using tools that remain traditional: wooden mallets and blocks, a wooden rice steamer, bamboo mats, mortars and pestles, rice steamers, strainers, roasting ovens, steaming baskets, soup pots, stoves and griddle pans [[ihchina]]. The result is more than 110 snack varieties, among them Shaxian bianrou, stuffed tofu balls, xiguo rice cakes, rice-jelly sheets and pressed duck — and fast foods that can be prepared in advance or finished within minutes account for over 90 percent of the total [[ihchina]].

Two figures circulate for the number of varieties, so both are given here: the national heritage project page says "more than 110", while the Fujian Digital Culture Centre notes that "according to incomplete statistics, Shaxian snacks now number more than 240 varieties" [[ihchina]][[fjysg]].',
    NULL, NULL,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Shaxian_County_snacks_-_wonton.jpg/330px-Shaxian_County_snacks_-_wonton.jpg', 330, 247,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Shaxian_County_snacks_-_wonton.jpg/1280px-Shaxian_County_snacks_-_wonton.jpg', 1280, 960,
    '沙县小吃的招牌之一：一碗扁肉（馄饨），皮薄馅嫩，汤清味鲜', 'One of the Shaxian snack staples: a bowl of bianrou wontons with thin wrappers in a clear broth',
    '我乃野云鹤', 'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
    'https://commons.wikimedia.org/wiki/File:Shaxian_County_snacks_-_wonton.jpg',
    'shaxiansnacks|沙县小吃|shaxiansnacks|福建三明沙县|shaxian,sanming,fujian',
    3
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'mengzi-rice-noodles',
    'published',
    '蒙自过桥米线',
    'Mengzi Crossing-the-Bridge Rice Noodles',
    'yunnan',
    '云南蒙自',
    'Mengzi, Yunnan',
    '汤上封着一层鸡油，看着不冒气，却能烫熟生肉片；米线只过一半，所以叫「过桥」。',
    'A film of chicken oil keeps the broth looking calm while it cooks raw meat slices — and the noodles cross only halfway, which is what gives the dish its name.',

    '过桥米线出自云南红河州蒙自市。米线在南方产稻区是古老食物：云南最早的地方志《万历云南通志》里记有「食有米缆、蓬饵、蒜脍」，「米缆」就是米线的早期称谓；《滇南志略》则说「明中叶蒙自已有碓房七十二户，昼夜舂米为线」。明正德六年（1511）设新安守御千户所，江南军民进入蒙自，带来了「米缆」的制作技术，蒙自米线从此有了规模化生产[[dfz]]。据国家级非遗项目页记载，这门技艺始于明代——大量内地军民戍边蒙自，带来不同的饮食习俗，最终演绎成了风味特别的「蒙自过桥米线」[[ihchina]]。

2014 年，「蒙自过桥米线制作技艺」列入第四批国家级非物质文化遗产代表性项目名录（项目序号 1349，编号 Ⅷ-235，类别传统技艺，新增项目，申报地区云南省蒙自市，保护单位蒙自市文化馆）[[ihchina]]。',

    'Mengzi crossing-the-bridge rice noodles come from Mengzi in Yunnans Honghe prefecture. Rice noodles are an old food across the rice-growing south: Yunnans earliest gazetteer, the Wanli Yunnan Tongzhi, records "rice noodles, rice cakes and minced fish among the foods", where "rice cable" is the early name for rice noodles' || chr(59) || ' the Diannan Zhilue adds that "by the middle of the Ming dynasty Mengzi already had seventy-two husking workshops, pounding rice into noodles day and night". In 1511 a garrison was established at Xinan, bringing soldiers and civilians from the lower Yangtze into Mengzi along with the technique for making those "rice cables", and Mengzis noodle production scaled up from there [[dfz]]. The national heritage project page records that the craft began in the Ming dynasty: as large numbers of soldiers and civilians from the interior garrisoned Mengzi they brought their own food customs, and out of that mixture came the distinctive Mengzi crossing-the-bridge rice noodles [[ihchina]].

In 2014 the craft was added to Chinas fourth national list of intangible cultural heritage — item no. 1349, code Ⅷ-235, category traditional craftsmanship, a newly added item, declared by Mengzi City, Yunnan, with the Mengzi Mass Art Centre as safeguarding body [[ihchina]].',

    '关于名字，蒙自有一则被写进县志的传说。清代有位秀才在蒙自南湖小岛上苦读，妻子怜惜他的身体，送米线过去；汤上覆着一层厚厚的鸡油，久放不凉，生肉片入汤即熟，而送饭的路上要经过一座石拱桥，人们就把这碗吃食叫作「过桥米线」。秀才后来赴京赶考高中，又留下「过桥一碗香，十全食美时」的说法[[ihchina]]。1995 年版《蒙自县志》把这个故事和年份一并写进了志书，称其「源于明末清初」，至 1989 年已有三百余年历史[[dfz]]。

这碗米线后来跟着路走。清光绪时期，蒙自、建水出现专营食馆，如建水的宝兴楼；清至民国滇越铁路通车、蒙自开埠通商之后，过桥米线随商旅传到昆明、个旧、河口，「德鑫园」「仁和园」等店把它带进了昆明，成为云南名吃，《续蒙自县志》记「汤米线、生片烫食，城乡盛行，为滇南名食」[[dfz]]。抗战时期西南联大暂迁蒙自，闻一多、朱自清等人常食米线，它在《蒙自杂记》等文人记载中扬名[[dfz]]。

今天它既是地方名片，也是一条产业。2009 年，蒙自获封「中国过桥米线之乡」，过桥米线获评「中华名小吃」，并取得国家地理标志证明商标；2018 年，王丽珠被文化和旅游部认定为该项目的国家级代表性传承人；2022 年，蒙自被世界中餐业联合会评选为「国际（过桥米线）美食名城」[[dfz]]。据人民网报道，蒙自过桥米线的品牌授权店已达 1052 家，其中 8 家开在海外[[people]]。',

    'For the name, Mengzi has a legend that made it into the county gazetteer. In the Qing dynasty a scholar was studying hard on a small island in Mengzis South Lake, and his wife, worried about his health, brought him rice noodles' || chr(59) || ' the broth was sealed under a thick layer of chicken oil so it stayed hot, and raw meat slices cooked the moment they went in. Because her route crossed a stone arch bridge, people called the dish "crossing-the-bridge rice noodles". The scholar later passed the imperial examination in the capital, and the saying arose that "one bowl across the bridge, perfect at the tenth taste" [[ihchina]]. The 1995 edition of the Mengzi County Gazetteer wrote both the story and the dating into the record, saying the dish "originates in the late Ming and early Qing" and by 1989 was over three hundred years old [[dfz]].

The noodles then travelled with the roads. In the Guangxu period specialist eateries appeared in Mengzi and Jianshui, such as Baoxinglou in Jianshui' || chr(59) || ' after the Yunnan-Vietnam railway opened and Mengzi became a treaty port in the late Qing and Republican era, the dish spread with merchants to Kunming, Gejiu and Hekou, and shops such as Dexinyuan and Renheyuan carried it into Kunming, where it became a celebrated Yunnan speciality — the Continued Mengzi County Gazetteer records that "soup rice noodles with scalded raw slices were popular in town and countryside alike, a famous dish of southern Yunnan" [[dfz]]. During the war, when the National Southwestern Associated University moved temporarily to Mengzi, Wen Yiduo and Zhu Ziqing ate the noodles regularly, and it became known through literati writings such as Mengzi Notes [[dfz]].

Today it is both a regional emblem and an industry. In 2009 Mengzi was named "home of Chinas crossing-the-bridge rice noodles", the dish was rated a "famous Chinese snack" and received a national geographical indication trademark' || chr(59) || ' in 2018 Wang Lizhu was recognised by the Ministry of Culture and Tourism as the national-level representative inheritor of the craft' || chr(59) || ' and in 2022 Mengzi was named an "international (crossing-the-bridge rice noodle) food city" by the World Federation of Chinese Catering Industry [[dfz]]. According to Peoples Daily, the dish now has 1,052 licensed brand shops, eight of them overseas [[people]].',

    '国家级非遗项目页把这道吃食的技艺拆成三道工序：米线榨制、汤料制作、佐菜配料[[ihchina]]。

米线先来。经过配米、磨浆、发酵、合成、初蒸、压榨、煮熟、漂洗等工艺流程榨出米线，成品纤细劲道，直径在 2 毫米之内，烹煮不易断碎；蒙自盛产的优质大米和古城大井的「甜水」，是榨制米线的必要原料[[ihchina]]。县志记的汤法更具体：以壮鸡、肥鸭、鲜猪排骨、筒子骨为料，加水煨五六小时，先用猛火去浮沫，后用微火慢炖，汤呈乳白，再以鸡油封汤，久热不凉[[dfz]]。

配料分生熟两类。生菜如鹌鹑蛋、猪脊肉片、菊花、姜末；熟菜有鸡肉、豆腐皮、豌豆坨、韭菜等[[ihchina]]。吃法也定得明白：用口径足有 30 厘米的土陶大海碗盛着滚烫的秘制高汤，与多碟生熟配菜一并上桌，放料按先生后熟的顺序，一边搅动一边以汤煮菜，再把另一碗中的米线适量过入汤碗，使米线一头入汤、一头留在原碗里——这就是「过桥」的喻义[[ihchina]]。',

    'The national heritage project page breaks the craft into three stages: extracting the noodles, making the broth and preparing the garnishes [[ihchina]].

The noodles come first. They are pressed out through a sequence of matching the rice, grinding the slurry, fermenting, combining, pre-steaming, pressing, boiling and rinsing' || chr(59) || ' the finished strands are fine and springy, under two millimetres across, and do not break up on cooking. Mengzis high-quality rice, and the "sweet water" from the old citys great well, are the essential raw materials [[ihchina]]. The gazetteers account of the broth is more specific: strong chicken, fat duck, fresh pork ribs and marrow bones are simmered with water for five or six hours — first over a fierce flame to skim off the scum, then over a low flame until the broth turns milky, sealed with chicken oil so it stays hot [[dfz]].

The garnishes split into raw and cooked. Raw ones include quail eggs, slices of pork loin, chrysanthemum petals and minced ginger' || chr(59) || ' cooked ones include chicken, tofu skin, pea paste and chives [[ihchina]]. The eating method is equally prescribed: a large earthenware bowl 30 centimetres across holds the scalding secret-recipe broth and comes to the table with several plates of raw and cooked garnishes' || chr(59) || ' ingredients go in raw first and cooked afterwards, stirred so the broth cooks them, and then noodles from a second bowl are drawn across into the soup so that one end sits in the broth and the other stays in the original bowl — which is exactly what "crossing the bridge" means [[ihchina]].',
    NULL, NULL,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Crossing_the_Bridge_Rice_Noodles_in_Mengzi_%2820200126132350%29.jpg/330px-Crossing_the_Bridge_Rice_Noodles_in_Mengzi_%2820200126132350%29.jpg', 330, 220,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Crossing_the_Bridge_Rice_Noodles_in_Mengzi_%2820200126132350%29.jpg/1280px-Crossing_the_Bridge_Rice_Noodles_in_Mengzi_%2820200126132350%29.jpg', 1280, 853,
    '蒙自本地一碗过桥米线：大碗热汤上飘着菊花瓣，配菜分碟摆放', 'A bowl of crossing-the-bridge rice noodles in Mengzi: hot broth topped with chrysanthemum petals, side plates arranged around it',
    'N509FZ', 'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
    'https://commons.wikimedia.org/wiki/File:Crossing_the_Bridge_Rice_Noodles_in_Mengzi_(20200126132350).jpg',
    'mengziricenoodles|蒙自过桥米线|mengzicrossingthebridgericenoodles|云南蒙自|mengzi,yunnan',
    4
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'goubuli-baozi',
    'published',
    '狗不理包子',
    'Goubuli Baozi',
    'tianjin',
    '天津',
    'Tianjin',
    '每个不少于 15 个褶，形似白菊待放——天津「三绝」之首。',
    'Fifteen pleats or more per bun, shaped like a white chrysanthemum about to open — the first of Tianjins "three wonders".',

    '狗不理包子出自天津。据国家级非遗项目页记载，它为天津名优食品「三绝」之首，系用水馅半发面制作，状若凝脂，形似菊花，口感鲜香不腻，在大江南北独树一帜；在制馅、和面、揉肥、擀皮、捏包、上灶等各方面均有自己独特的操作方法[[ihchina]]。中国日报网转引的介绍则把它记作始创于公元 1858 年（清朝咸丰年间），是中华老字号之一[[chinadaily]]。

在国家级名录里，它属于「传统面食制作技艺」这条大项下的扩展项目。2011 年（第三批），「天津『狗不理』包子制作技艺」以扩展项目身份列入国家级非物质文化遗产代表性项目名录（项目序号 943，编号 Ⅷ-160，类别传统技艺，申报地区天津市和平区，保护单位狗不理集团股份有限公司）[[ihchina]]。商务部流通发展司 2011 年 8 月 30 日的通报把它列为第三批名录中涉及「中华老字号」企业的项目之一，该行序号 96、编号 Ⅷ-160[[mofcom]]。

一个值得留意的细节：Ⅷ-160 这个编号后来也被「兰州牛肉面制作技艺」（第五批扩展项目）沿用——两者是同一个母项「传统面食制作技艺」下的不同扩展项，本项目页同样标为序号 943、编号 Ⅷ-160[[ihchina]]。',

    'Goubuli baozi comes from Tianjin. The national heritage project page records it as the first of Tianjins "three wonders" among famous local foods: made with a juicy filling and half-leavened dough, described as "like congealed cream" in appearance and chrysanthemum-like in shape, savoury without being greasy and unlike anything else in the country, with its own distinctive methods at every stage — filling, dough, resting, rolling, pleating and steaming [[ihchina]]. An account republished by China Daily dates its founding to 1858, in the Xianfeng reign of the Qing dynasty, and calls it one of Chinas time-honoured brands [[chinadaily]].

On the national list it is an extended item under the parent project "traditional noodle-making technique". In 2011, in the third batch, the Tianjin Goubuli baozi technique was added to Chinas national list of intangible cultural heritage as such an extended item — item no. 943, code Ⅷ-160, category traditional craftsmanship, declared by Heping District, Tianjin, with the Goubuli Group as safeguarding body [[ihchina]]. A bulletin from the Ministry of Commerces circulation development department on 30 August 2011 listed it among the third-batch entries belonging to "China Time-honoured Brand" enterprises, at row 96 under code Ⅷ-160 [[mofcom]].

One detail worth noting: that code, Ⅷ-160, was later also used for the Lanzhou beef-noodle technique in the fifth batch. Both are extended items under the same parent project, "traditional noodle-making technique", and this project page likewise carries item no. 943 and code Ⅷ-160 [[ihchina]].',

    '传说在清同治八年（1869），靠运河码头侯家后的刘记蒸食铺招了个徒弟，姓高名贵友——他就是后来狗不理包子的创始人。高贵友学徒期满后辞职出号，清光绪八年（1882）自己投资经营包子铺，取名「德聚号」。他对包子做了改革，使包子不但好吃，而且外观漂亮，形状要求为「菊花项、抓髻扣」——把包子与漂亮的花连在一起，物质享受和精神满足一并给了顾客[[ihchina]]。

吃的人一多，就得等候。有的顾客问这问那，高贵友语言不佳，有时答不上来；相熟的顾客知道他的乳名，就笑着说他「狗子不理人」。这话被当时天后宫的一位道士听见，便建议他：「人家说你狗子不理人——狗不理，你不如把德聚号改成狗不理，又新又奇，准能招揽顾客。」高贵友接受建议，挂起了「狗不理」的牌子[[ihchina]]。

一百五十余年来，这门技艺被认定为「中国驰名商标」「中华老字号」，还获得「国际名品中华美食奖」，并在国内外烹饪大赛中屡获殊荣[[ihchina]]。关于起点年份，两处口径不同：非遗项目页记 1869 年学徒、1882 年开店，中国日报网转引的介绍则记「始创于公元 1858 年（清朝咸丰年间）」[[ihchina]][[chinadaily]]。',

    'The story goes that in 1869, in the eighth year of the Tongzhi reign, a steamed-food shop run by the Liu family at Houjiahou by the canal wharf took on an apprentice named Gao Guiyou — the man who would found Goubuli baozi. When his apprenticeship ended he left and, in 1882, in the eighth year of the Guangxu reign, set up his own bun shop under the name Dejuhao. He reformed the buns so that they were not only good to eat but good to look at, in the shape described as "chrysanthemum crown, hair-bun knot" — linking the bun to a beautiful flower and giving customers physical pleasure and spiritual satisfaction at once [[ihchina]].

As the buns drew crowds, waiting became normal. Some customers asked this and that, and Gao Guiyou, no great talker, could not always answer' || chr(59) || ' regulars who knew his childhood name joked that "Gouzi ignores people" — gouzi meaning "puppy". A Daoist priest from the nearby Tianhou Temple overheard and advised him: "People say Gouzi ignores people — goubuli. Why not change Dejuhao to Goubuli? It is new and strange, and it will certainly draw customers." Gao Guiyou took the advice and hung up the Goubuli sign [[ihchina]].

For more than 150 years the technique has been recognised as a "China Well-known Trademark" and a "China Time-honoured Brand", has won the "International Famous Brand Chinese Cuisine Award", and has repeatedly taken prizes in cooking competitions at home and abroad [[ihchina]]. The two accounts differ on when it began: the heritage project page records an apprenticeship in 1869 and a shop in 1882, while the account republished by China Daily says it was "founded in 1858, in the Xianfeng reign of the Qing dynasty" [[ihchina]][[chinadaily]].',

    '皮和馅都按自己的规矩来。狗不理用的是水馅半发面：和面时水温要根据季节变化，一般情况下用温水，采用「一拱肥」的方法，揉好后放一会儿，发酵后即用。死面在这里起「骨头」的作用，发面起「肉」的作用——这种面的优点是不透油、有咬劲、面皮光泽度好、软硬兼备[[ihchina]]。

包子讲究形。擀皮时要求达到薄厚均匀、圆、大小适当；每个包子装馅 3 钱左右；捏包时要求褶花均匀、整齐、美观，形似白菊待放[[ihchina]]，中国日报网给出的数量标准是「每个包子都不少于 15 个褶」[[chinadaily]]。最后一道关键环节是上灶，掌握火候要恰到好处[[ihchina]]。

品种上，它以鲜肉包为主，兼有三鲜包、海鲜包、酱肉包、素包子等 6 大类、98 个品种；刚出笼的包子鲜而不腻、清香适口[[chinadaily]]。',

    'Skin and filling each follow their own rules. Goubuli uses a juicy filling with half-leavened dough: the water temperature changes with the season, generally warm water, using the "single-arch leaven" method — knead, then leave the dough briefly and use it once it has risen. Here the unyeasted dough acts as "bone" and the leavened dough as "flesh", and the result is a dough that does not let oil through, has bite, gives the skin a good sheen and manages to be both soft and firm [[ihchina]].

Shape matters too. The skins must be rolled evenly thin and thick, round and suitably sized' || chr(59) || ' each bun takes about three qian of filling' || chr(59) || ' and the pleating must be even, neat and handsome, like a white chrysanthemum about to open [[ihchina]] — with the count given by China Daily as "no fewer than fifteen pleats per bun" [[chinadaily]]. The last critical step is the steaming, where the heat must be judged exactly [[ihchina]].

As for range, fresh-pork buns dominate, alongside a mixed three-fresh bun, seafood, braised-pork and vegetarian versions — six broad categories and 98 varieties. Straight from the steamer the buns are fresh without being greasy, clean and agreeable in flavour [[chinadaily]].',
    NULL, NULL,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/%E5%A4%A9%E6%B4%A5%E7%8B%97%E4%B8%8D%E7%90%86%E5%8C%85%E5%AD%90.JPG/330px-%E5%A4%A9%E6%B4%A5%E7%8B%97%E4%B8%8D%E7%90%86%E5%8C%85%E5%AD%90.JPG', 330, 186,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/%E5%A4%A9%E6%B4%A5%E7%8B%97%E4%B8%8D%E7%90%86%E5%8C%85%E5%AD%90.JPG/1280px-%E5%A4%A9%E6%B4%A5%E7%8B%97%E4%B8%8D%E7%90%86%E5%8C%85%E5%AD%90.JPG', 1280, 720,
    '刚出笼的狗不理包子：皮白、褶花均匀，收口形似白菊', 'Freshly steamed Goubuli baozi: white wrappers with evenly pleated tops shaped like a chrysanthemum',
    'Techyan', 'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
    'https://commons.wikimedia.org/wiki/File:%E5%A4%A9%E6%B4%A5%E7%8B%97%E4%B8%8D%E7%90%86%E5%8C%85%E5%AD%90.JPG',
    'goubulibaozi|狗不理包子|goubulibaozi|天津|tianjin',
    5
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'beijing-roast-duck',
    'published',
    '北京烤鸭',
    'Beijing Roast Duck (Peking Duck)',
    'beijing',
    '北京',
    'Beijing',
    '一只鸭子，两种火：明火的挂炉，暗火的焖炉。',
    'One bird, two fires — the open flame of the hanging oven and the banked heat of the closed one.',

    '北京烤鸭出自北京。它古称「烧鸭子」「炉烧鸭」「南炉鸭」等，据元代《饮膳正要》记载，当时宫廷里已经有烧鸭子；清代《帝京岁时纪胜》《都门杂记》也记载，宫廷御膳房每逢中秋佳节，除桂花月饼之外还要备「南炉鸭」供帝王享用，清高宗（乾隆）对此尤为喜爱[[ihchina-quanjude]]。

北京的烤鸭店以便宜坊、全聚德为主：便宜坊创始于明代永乐十四年（1416），全聚德创始于清代同治三年（1864），两家都有很长的历史[[ihchina-quanjude]]。

2008 年，烤鸭技艺被列入第二批国家级非物质文化遗产代表性项目名录（编号 Ⅷ-167），其中包含「全聚德挂炉烤鸭技艺」与「便宜坊焖炉烤鸭技艺」两个子项[[ihchina-quanjude]]。',

    'Beijing roast duck comes from Beijing. It was historically known as "shaoyazi", "lushaoya" or "nanluya"' || chr(59) || ' the Yuan-dynasty dietary text Yinshan Zhengyao records that roast duck was already served at court [[ihchina-quanjude]]. Qing-era sources note that at Mid-Autumn the imperial kitchen prepared "southern oven duck" alongside osmanthus mooncakes for the emperor, and the Qianlong Emperor was especially fond of it [[ihchina-quanjude]].

Beijings roast-duck restaurants have long been led by Bianyifang, founded in 1416 (the 14th year of Yongle in the Ming dynasty), and Quanjude, founded in 1864 (the 3rd year of Tongzhi in the Qing dynasty) [[ihchina-quanjude]].

In 2008 the craft was added to Chinas second batch of national intangible cultural heritage (item no. Ⅷ-167), covering two sub-items: Quanjudes hanging-oven technique and Bianyifangs closed-oven technique [[ihchina-quanjude]].',

    '全聚德的创办人叫杨全仁。他雇佣山东名厨，把从宫廷御膳房流传出来的挂炉烤鸭技术用在自家店里，生意日渐兴隆，「全聚德」也由此成为北京烤鸭的代表之一[[ihchina-quanjude]]。

便宜坊走的是另一条路。它以焖炉立足，明代名臣杨继盛曾为它题写匾额；乾隆皇帝以及许多清代臣僚、文人雅士都曾光顾[[ihchina-bianyifang]]。数百年来，到便宜坊吃焖炉烤鸭的人始终不断，既有政府领导人、社会知名人士，也有慕名而来的外国元首[[ihchina-bianyifang]]。',

    'Quanjudes founder was Yang Quanren. He hired celebrated chefs from Shandong and applied the hanging-oven technique that had come out of the imperial kitchen to his own restaurant' || chr(59) || ' business grew steadily and Quanjude became one of the defining names in Beijing roast duck [[ihchina-quanjude]].

Bianyifang took a different path, built on the closed oven. The Ming official Yang Jisheng wrote a plaque for it, and the Qianlong Emperor, along with many Qing officials and literati, dined there [[ihchina-bianyifang]]. For centuries visitors kept coming — government leaders, public figures and foreign heads of state among them [[ihchina-bianyifang]].',

    '北京烤鸭有挂炉（明火）、焖炉（暗火）、缸炉、叉烧等不同做法。挂炉以果木为燃料，把鸭坯挂在特制的烤炉中明火烤制[[ihchina-quanjude]]；便宜坊的焖炉烤鸭则「鸭子不见明火」，成品呈枣红色，外皮油亮酥脆、肉质洁白细嫩[[ihchina-bianyifang]]。

全聚德挂炉烤鸭的整套工艺流程由宰烫、制坯、烤制、片鸭 4 道工序、31 个环节组成[[ihchina-quanjude]]。焖炉那边也有自己的讲究，被称为「三绝」：焖炉特制技艺绝、选鸭制坯技艺绝、烤制片鸭技艺绝[[ihchina-bianyifang]]。

吃法同样有一整套规矩：用筷子夹起片好的鸭肉，蘸少许甜面酱，配上葱丝或黄瓜条，卷在荷叶饼里吃；也可以把鸭肉蘸上甜面酱、同葱丝一起夹进芝麻烧饼[[ihchina-quanjude]]。',

    'Beijing roast duck is made in several ways: the hanging oven (open flame), the closed oven (banked heat), the jar oven and spit-roasting. The hanging oven burns fruitwood and roasts the duck over an open fire inside a purpose-built oven [[ihchina-quanjude]]' || chr(59) || ' Bianyifangs closed-oven duck sees "no open flame at all", coming out jujube-red with a glossy crisp skin and white, tender meat [[ihchina-bianyifang]].

Quanjudes technique is organised into four stages — scalding, preparing the bird, roasting and carving — broken down into 31 steps [[ihchina-quanjude]]. The closed-oven school has its own "three excellences": the custom-built oven, the selection and preparation of the duck, and the roasting and carving [[ihchina-bianyifang]].

Eating it has its own ritual: pick up a slice of duck with chopsticks, dip it in a little sweet bean sauce, add shredded spring onion or cucumber, and roll it in a lotus-leaf pancake' || chr(59) || ' or dip the duck and tuck it into a sesame bun with the spring onion [[ihchina-quanjude]].',
    NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL,
    NULL,
    NULL,
    'beijingroastduck|北京烤鸭|beijingroastduckpekingduck|北京|beijing',
    6
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'hejian-donkey-burger',
    'published',
    '驴肉火烧',
    'Hejian Donkey-Meat Huoshao (Donkey Burger)',
    'hebei',
    '河北河间',
    'Hejian, Hebei',
    '「天上龙肉，地上驴肉」——一句话，捧了这枚小火烧三百年。',
    '"Dragon meat in heaven, donkey meat on earth" — a saying that has praised this little bun for three hundred years.',

    '驴肉火烧是华北地区极为流行的传统小吃，起源于河北省保定市、沧州市河间市一带，广泛流传于冀中平原，其中「河间驴肉火烧」在民间已有 300 年以上的制作历史[[hebnews]]。

它的做法说起来简单：把面食「火烧」烤出来，把驴肉卤（酱）好，再把驴肉、焖子等夹进火烧里[[hebnews]]。

2012 年，「河间驴肉火烧制作技艺」被列入河北省第四批省级非物质文化遗产代表性项目名录[[hebnews]]。',

    'Donkey-meat huoshao is one of the most popular traditional snacks in north China. It originated around Baoding and Hejian in Hebei and spread across the central Hebei plain' || chr(59) || ' the Hejian version has been made by hand for more than 300 years [[hebnews]].

The method is easy to describe: bake the wheat "huoshao" bun, braise (or soy-sauce simmer) the donkey meat, then tuck the meat and the local menzi jelly into the split bun [[hebnews]].

In 2012 the technique was added to the fourth batch of Hebei Provinces intangible cultural heritage list [[hebnews]].',

    '河间一带自古水草丰美，出产的驴肉格外鲜美，加上祖传的烹制手艺，煮出来的驴肉色泽红润、鲜嫩可口[[peopleapp]]。

民间流传着好几个版本的来历。一说唐代李世民登基前到过河间，有书生「杀驴煮秫」招待他，他吃后连连称赞，河间驴肉因而留名；另一说乾隆下江南路过河间，农家把精心煮制的驴肉加进层次松软的火烧里，乾隆吃后大喜，还留下一首诗[[peopleapp]]。这些说法都属于民间传说，如今人们更看重的，是这套手艺本身[[peopleapp]]。',

    'The Hejian area has always been well watered and grassy, and its donkeys were said to yield especially fine meat' || chr(59) || ' with the family cooking skills passed down alongside, the braised meat comes out reddish and tender [[peopleapp]].

Several origin stories circulate. One says that before he took the throne, the Tang emperor Taizong passed through Hejian and a scholar served him donkey cooked with millet, praising which left the local donkey meat famous. Another says the Qianlong Emperor, travelling south, was served donkey meat tucked into a soft layered bun and was so pleased he composed a poem about it [[peopleapp]]. Both are folk legends' || chr(59) || ' what people value today is the craft itself [[peopleapp]].',

    '火烧的制作要领被概括为「四绝」——色如金、酥如雪、形如书、薄如纸[[hejian-gov]]。

河间市人民政府门户网站对这四绝的解释是：一绝「色如金」，通过烙与烤让火烧表皮呈金黄色，面皮酥而不糊；二绝「酥如雪」，咬下去酥脆至极的碎屑像雪花一样纷纷洒落；三绝「薄如纸」，火烧烤熟后可以捯开，家族秘传的案板工艺让它的长度可达约 2 米，薄可透字、遇火即燃；四绝「形如书」，火烧层数多达 25 至 30 层，横切面就像一本厚厚的书[[hejian-gov]]。

夹在火烧里的驴肉也有讲究：要用陈年老汤，加 20 多种佐料大锅炖制[[peopleapp]]。还有一样不能少的配角——「焖子」，用烹制驴肉的汤加驴油和淀粉调成，味道与驴肉同源但更浓，民间有「驴肉火烧好不好吃，关键在香焖而不在肉」的说法[[peopleapp]]。河间驴肉火烧用凉肉夹饼，拌以尖椒为辅料，再加入香焖[[peopleapp]]。',

    'The bun is summed up in four "excellences": colour like gold, crispness like snow, shape like a book, thinness like paper [[hejian-gov]].

The Hejian municipal governments own explanation runs like this. Colour like gold: pan-frying and oven-baking give the surface a golden hue, crisp without scorching. Crispness like snow: bite in and the shattering flakes scatter like snowflakes. Thinness like paper: after baking the bun can be pulled open, and the family-secret board technique lets it stretch to about two metres — thin enough to read through, and it will catch light from a flame. Shape like a book: the bun has 25 to 30 layers, so a cross-section looks like a thick book [[hejian-gov]].

The meat has its own rules: an aged master stock and more than twenty seasonings, simmered in a large pot [[peopleapp]]. And there is one supporting player that cannot be left out — menzi, a set jelly made from the donkey stock with donkey fat and starch. It shares the meats flavour but concentrates it' || chr(59) || ' locals say the quality of a donkey huoshao depends on the menzi rather than the meat [[peopleapp]]. Hejian-style huoshao is served with cool meat rather than hot, with green chilli and menzi added [[peopleapp]].',
    NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL,
    NULL,
    NULL,
    'hejiandonkeyburger|驴肉火烧|hejiandonkeymeathuoshaodonkeyburger|河北河间|hejian,hebei',
    7
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'shanxi-knife-cut-noodles',
    'published',
    '刀削面',
    'Shanxi Knife-Cut Noodles',
    'shanxi',
    '山西',
    'Shanxi',
    '一手托面，一手飞刀，柳叶一样的面片落进沸水里。',
    'One hand holds the dough, one hand flies with the blade — willow-leaf noodles drop into the boiling water.',

    '山西传统面食历史悠久、品种繁多，其中以龙须拉面和刀削面最具代表性[[ihchina-mianshi]]。

刀削面又称「飞刀削面」，相传始于元代[[ihchina-mianshi]]。2008 年，「传统面食制作技艺（龙须拉面和刀削面制作技艺）」被列入第二批国家级非物质文化遗产代表性项目名录，编号 Ⅷ-160，申报地区为山西省[[ihchina-mianshi]]。

山西素有「中国面食之乡」的美称，而山西各地的刀削面中，又以大同刀削面最为出名[[dt-gov]]。2018 年，中国饭店协会授予大同「中国刀削面之乡」荣誉称号[[dt-gov]]。',

    'Shanxi has a long history of wheaten foods and an unusual variety of them' || chr(59) || ' dragon-whisker hand-pulled noodles and knife-cut noodles are the two most representative [[ihchina-mianshi]].

Knife-cut noodles are also called "flying-knife noodles" and are traditionally said to date from the Yuan dynasty [[ihchina-mianshi]]. In 2008 the technique was added to Chinas second batch of national intangible cultural heritage (item no. Ⅷ-160), declared by Shanxi Province [[ihchina-mianshi]].

Shanxi is known as "Chinas home of wheaten food", and among its regional versions the Datong style is the most famous [[dt-gov]]. In 2018 the China Hotel Association awarded Datong the title "Home of Chinese Knife-Cut Noodles" [[dt-gov]].',

    '关于刀削面的来历，民间有一个流传很广的传说。元代统治者没收了民间的金属器具，规定十户人家合用一把厨刀，用完还要交回保管[[yunzhou-gov]]。

一天中午，一位老婆婆和好面，让老汉去取刀，刀却被别人先取走了。老汉回家时被一块薄铁皮绊了一下，顺手捡起来揣在怀里。进门一看锅已经烧开，全家人等着刀切面，老汉急中生智，取出那块铁皮说「就用这个切」。老婆婆嫌铁皮又薄又软，说这怎么切得动面条；老汉一急，说「切不动就砍」——一刀下去，面片落进锅里，煮出来竟格外好吃，刀削面就这样传开了[[yunzhou-gov]]。

这是民间传说，不是信史，但它解释了「削」这个动作的由来[[yunzhou-gov]]。',

    'A widely told folk tale explains where the dish came from. Under Yuan-dynasty rule, so the story goes, household metalware was confiscated and ten families had to share a single kitchen knife, returned to the authorities after use [[yunzhou-gov]].

One midday an old woman mixed the dough and sent her husband to fetch the knife — but someone had already taken it. On his way home he tripped over a piece of thin sheet metal and pocketed it. Back at the house the pot was already boiling and the family was waiting for a knife. In desperation he produced the metal sheet and said, "Well cut it with this." His wife protested that something so thin and soft could never cut noodles. Exasperated, he answered, "Then Ill hack it." One strike sent a sheet of dough into the pot — and it turned out delicious. That, the tale says, is how knife-cut noodles began [[yunzhou-gov]].

It is a legend, not documented history, but it explains where the "cut" in the name comes from [[yunzhou-gov]].',

    '制作刀削面时，先把面揉成尺余长的筒状，而后站在烧开的锅前，一手托面，一手持特制的削刀由上往下一条条将面削进锅里[[ihchina-mianshi]]。

削出的面条呈三棱形，宽厚长度相同，状似柳叶[[ihchina-mianshi]]。刀削面以细、薄、长著称，有筋骨、口感好、柔软光滑，也易于消化[[ihchina-mianshi]]。

刀削面与炸酱面、伊府面、热干面、担担面同称为「五大面食名品」[[ihchina-mianshi]]；不过云州区人民政府网站的表述里，与它并列的是北京的打卤面而不是炸酱面[[yunzhou-gov]]。大同本地还发展出了勾刀削面等技法，当地并出台了《大同刀削面烹饪工艺规范》等行业标准[[shanxi-gov]]。',

    'To make knife-cut noodles the dough is first kneaded into a roll about a chi (roughly 33 cm) long. The cook stands at the boiling pot, one hand supporting the dough and the other holding a purpose-made blade, slicing strip after strip down into the water [[ihchina-mianshi]].

The strips come out triangular in cross-section, uniform in width and length, shaped like willow leaves [[ihchina-mianshi]]. Knife-cut noodles are known for being fine, thin and long — springy and smooth, and easy to digest [[ihchina-mianshi]].

Knife-cut noodles are counted among Chinas "five famous wheaten dishes" together with zhajiang noodles, yifu noodles, hot-dry noodles and dandan noodles [[ihchina-mianshi]] — though the Yunzhou District governments account pairs it instead with Beijings dalurou noodles [[yunzhou-gov]]. Datong has also developed its own variants such as the hooked-blade cut, and the city has issued trade standards for the cooking technique [[shanxi-gov]].',
    NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL,
    NULL,
    NULL,
    'shanxiknifecutnoodles|刀削面|shanxiknifecutnoodles|山西|shanxi',
    8
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'chagan-idee',
    'published',
    '察干伊德',
    'Tsagaan Idee (Mongolian Dairy Foods)',
    'neimenggu',
    '内蒙古正蓝旗',
    'Zhenglan Banner, Inner Mongolia',
    '草原把鲜奶变成三十多种「白色的食品」。',
    'On the grassland, fresh milk becomes more than thirty kinds of "white food".',

    '「察干伊德」，汉语直译是「白色的食品」，由天然纯奶制成，品种繁多、味道鲜美、营养丰富，是蒙古族食品中的上品[[ihchina-chagan]]。

这门技艺目前主要流布于内蒙古锡林郭勒盟南部的正蓝旗、正镶白旗、镶黄旗地区，尤以正蓝旗最具代表性[[ihchina-chagan]]。

2014 年，「奶制品制作技艺（察干伊德）」被列入第四批国家级非物质文化遗产代表性项目名录，编号 Ⅷ-226，申报地区为内蒙古自治区正蓝旗，保护单位是正蓝旗文体旅游广电事业发展中心[[ihchina-chagan]]。',

    '"Tsagaan idee" translates literally as "white food". Made from pure natural milk, it comes in many varieties, tastes good and is highly nutritious — it is regarded as the finest category of Mongolian food [[ihchina-chagan]].

The craft is found mainly in Zhenglan Banner, Zhengxiangbai Banner and Xianghuang Banner in southern Xilin Gol League, Inner Mongolia, with Zhenglan Banner the most representative [[ihchina-chagan]].

In 2014 the technique was added to Chinas fourth batch of national intangible cultural heritage (item no. Ⅷ-226), declared by Zhenglan Banner in Inner Mongolia and safeguarded by the banners culture, tourism, radio and television development centre [[ihchina-chagan]].',

    '早在元、清时期，正蓝旗就是皇家御用奶食品的供应基地[[ihchina-chagan]]。13 世纪，元世祖忽必烈设立「畜群局」，专门为元宫廷提供和制作肉与察干伊德[[ihchina-chagan]]。元代诗人萨都剌的诗句「牛羊散漫落日下，野草生香乳酪甜」，描绘的就是当时的奶食品文化[[ihchina-chagan]]。

后来相关技艺流入民间，正蓝旗继承了元代以来宫廷察干伊德的制作技艺，并不断传承发展至今[[ihchina-chagan]]。今天，这一技艺主要在牧民家庭里通过口传心授和生活实践世代相传[[ihchina-chagan]]。

对蒙古族而言，白色的食物是高贵吉祥之物：无论居家餐饮、宴宾待客，还是敬奉祖先神灵，察干伊德都是不可缺少的存在[[ihchina-chagan]]。',

    'As early as the Yuan and Qing dynasties, Zhenglan Banner supplied dairy foods to the imperial household [[ihchina-chagan]]. In the 13th century Kublai Khan established a "herds bureau" to provide the Yuan court with meat and tsagaan idee [[ihchina-chagan]]. The Yuan poet Sadula wrote of "cattle and sheep scattered under the setting sun, wild grass fragrant and milk curd sweet" — a line describing the dairy culture of the time [[ihchina-chagan]].

The technique later passed into ordinary life, and Zhenglan Banner carried the court tradition forward to the present day [[ihchina-chagan]]. Today it is transmitted in herding households through word of mouth, demonstration and daily practice [[ihchina-chagan]].

For Mongolians white food is noble and auspicious: whether at the family table, welcoming guests, or making offerings to ancestors and spirits, tsagaan idee is indispensable [[ihchina-chagan]].',

    '察干伊德的产品有鲜奶干、过滤察干伊德、奶酪等 30 多种，相关饮品也有 10 余种[[ihchina-chagan]]。

基本工艺是把鲜奶通过发酵转化、分离、温火炼制等手段，以不同的工艺和程序加工出各种不同的察干伊德[[ihchina-chagan]]。分离出的乳清可以制成奶酒，从而实现鲜奶的全部利用[[ihchina-chagan]]。

这门手艺的核心要素，是在一定时间和特定环境下利用微生物转化，打造出另一种质感的美食，并使营养得到升华[[ihchina-chagan]]。技艺以牛奶、羊奶等为主要原料，原料来自天然放牧的牲畜，并采用手工搅拌和自然发酵的方式精细处理[[ihchina-chagan]]。',

    'The products include dried fresh milk curd, filtered tsagaan idee and cheese — more than thirty kinds in all, plus over ten related drinks [[ihchina-chagan]].

The basic process puts fresh milk through fermentation, separation and gentle heating, using different sequences to produce different types of tsagaan idee [[ihchina-chagan]]. The whey that separates out can be made into milk wine, so nothing is wasted [[ihchina-chagan]].

The heart of the craft is using microbial transformation — under controlled timing and conditions — to create a food with a different texture and elevated nutrition [[ihchina-chagan]]. The main raw materials are cows and sheeps milk from free-grazing animals, handled carefully with hand-stirring and natural fermentation [[ihchina-chagan]].',
    NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL,
    NULL,
    NULL,
    'chaganidee|察干伊德|tsagaanideemongoliandairyfoods|内蒙古正蓝旗|zhenglanbanner,innermongolia',
    9
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'chicken-stewed-with-mushrooms',
    'published',
    '小鸡炖蘑菇',
    'Chicken Stewed with Mushrooms',
    'liaoning',
    '辽宁',
    'Liaoning',
    '辽菜里最家常的一口锅：慢火，细做。',
    'The homeliest pot in Liaoning cooking — a low flame and a lot of patience.',

    '小鸡炖蘑菇是辽宁的家常名菜，2024 年入选辽宁省商务厅公示的「美市美食」辽宁地标美食名单——公示的名单里，本溪的「本溪笨鸡炖蘑菇」位列其中[[ln-swtw]]。

它依托的是辽菜这套烹饪体系。辽菜是辽宁菜系的简称，利用辽宁产的绿色食品原料和特有的烹饪工艺，结合辽宁地区的民族特点、区域特点、饮食习俗和烹饪技法创建而成，以宫廷菜、王府菜、市井菜、民俗菜、民族菜和海鲜菜为基本框架[[ihchina-liaocai]]。

2014 年，「辽菜传统烹饪技艺」被列入第四批国家级非物质文化遗产代表性项目名录，编号 Ⅷ-227，申报地区为辽宁省沈阳市[[ihchina-liaocai]]。',

    'Chicken stewed with mushrooms is a homely Liaoning classic' || chr(59) || ' in 2024 it appeared on a list of Liaoning geographical-indication foods published for public comment by the provincial Department of Commerce, where "Benxi free-range chicken stewed with mushrooms" is named under Benxi [[ln-swtw]].

The dish rests on the wider Liaoning cooking system. "Liao cuisine" uses Liaonings own green produce and distinctive techniques, shaped by the regions ethnic mix, geography and eating customs' || chr(59) || ' it is built around court dishes, princely-house dishes, street food, folk dishes, ethnic dishes and seafood [[ihchina-liaocai]].

In 2014 the traditional cooking technique of Liao cuisine was added to Chinas fourth batch of national intangible cultural heritage (item no. Ⅷ-227), declared by Shenyang, Liaoning [[ihchina-liaocai]].',

    '辽菜的底子是慢慢攒出来的。这门技艺从辽金时期就已有了相当水平[[ihchina-liaocai]]。

辽宁是清王朝的发祥地，老一代传承人梁忠、王占山、颜庆鸿等人，把鲁菜传统技艺的精华与满、蒙、朝、汉各民族的菜式特点结合起来，再运用辽宁本地的原材料，结合东北的气候山水优势，逐步形成了辽菜流派[[ihchina-liaocai]]。

他们的弟子又把辽菜带到民间，在辽宁各地创办了多家饭店企业，构成了辽菜的市场体系。近年来通过恢复和保护，辽菜的师徒传承得以良性发展[[ihchina-liaocai]]。',

    'Liao cuisine was built up gradually, reaching a considerable standard as early as the Liao and Jin dynasties [[ihchina-liaocai]].

Liaoning was the birthplace of the Qing dynasty. An earlier generation of inheritors — Liang Zhong, Wang Zhanshan and Yan Qinghong among them — combined the best of Shandong cooking with the characteristics of Manchu, Mongolian, Korean and Han dishes, applied Liaonings own ingredients and worked with the regions climate and landscape to form what became the Liao school [[ihchina-liaocai]].

Their students then carried it into ordinary life, opening restaurants across Liaoning and building the cuisines commercial base. Restoration and protection work in recent years has allowed master-to-apprentice transmission to develop well [[ihchina-liaocai]].',

    '辽菜品种丰富，特别注重地方特产原料的使用，代表名店有沈阳鹿鸣春饭店和大连群英楼[[ihchina-liaocai]]。

它擅长扒、熘、烧、炸、烩、烤等 30 余种技法，尤以「扒」著称——扒菜里的「大翻勺」是辽菜的独门绝技，扒三白等菜肴出勺后整齐划一、不变样[[ihchina-liaocai]]。

操作上主张慢火细做、讲究调味，具有「一菜多味、咸甜分明、酥烂香脆、色艳味浓、紧汁抱芡、富于营养」的特点。总体的特征是讲究火候、醇厚香浓、原汁原味、朴素实惠，菜肴烹制嫩而不生、透而不老、烂而不柴、外脆内嫩、外酥内烂，以鲜味为核心，兼容酸、甜、苦、辣、咸[[ihchina-liaocai]]。',

    'Liao cuisine is rich in variety and pays particular attention to local ingredients' || chr(59) || ' the landmark restaurants are Shenyangs Lumingchun and Dalians Qunyinglou [[ihchina-liaocai]].

It excels at more than thirty techniques — braising, quick-frying, simmering, deep-frying, stewing and roasting among them — and is best known for pa, a braising method. The "big wok flip" used in pa dishes is a Liao speciality: dishes such as pa san bai come out of the wok uniform and unbroken [[ihchina-liaocai]].

The approach favours low heat, careful work and attention to seasoning, giving dishes that are multi-layered in flavour, distinctly savoury or sweet, tender yet crisp, richly coloured and generously sauced. Overall the cuisine is about heat control, deep savour, original flavours and honest value' || chr(59) || ' dishes are tender without being raw, thoroughly cooked without going mushy, crisp outside and soft within — savoury at the core and accommodating of sour, sweet, bitter, spicy and salty [[ihchina-liaocai]].',
    NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL,
    NULL,
    NULL,
    'chickenstewedwithmushrooms|小鸡炖蘑菇|chickenstewedwithmushrooms|辽宁|liaoning',
    10
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'guo-bao-rou',
    'published',
    '锅包肉',
    'Guo Bao Rou (Harbin Sweet-and-Sour Pork)',
    'heilongjiang',
    '黑龙江哈尔滨',
    'Harbin, Heilongjiang',
    '为了外国客人的一口酸甜，改出了一座城市的味觉名片。',
    'A sweet-and-sour adjustment made for foreign guests became a citys signature flavour.',

    '锅包肉原名「锅爆肉」，出自哈尔滨的道台府。清朝末期中东铁路通车后，哈尔滨迅速成为国际商埠，俄国人、犹太人、波兰人等各种面孔涌入，也带来了喜爱甜酸的饮食偏好[[xinhua-guobaorou]]。

因应频繁的俄式外交宴请，道台府的厨师郑兴文在鲁菜「焦炒肉片」的基础上加入糖与醋，把咸鲜改成酸甜，创制出了「锅爆肉」[[xinhua-guobaorou]]。

关于改名的说法是：外国人发不准「爆」这个音，久而久之读成了「包」，「锅爆肉」也就成了今天的「锅包肉」[[hljszw]]。',

    'Guo bao rou was originally called guo bao rou with a different second character, meaning "explosion", and it came out of Harbins Daotai-fu — the office of the circuit intendant. After the Chinese Eastern Railway opened in the late Qing, Harbin quickly became an international trading port' || chr(59) || ' Russians, Jews, Poles and others arrived, bringing with them a taste for sweet-and-sour food [[xinhua-guobaorou]].

To suit the frequent Russian diplomatic banquets, the offices chef Zheng Xingwen took the Shandong dish "stir-fried pork slices" and added sugar and vinegar, turning its savoury profile sweet-and-sour [[xinhua-guobaorou]].

The name change is explained this way: foreign diners could not pronounce the second character correctly and it drifted into the character for "wrap", so the dish became known as guo bao rou [[hljszw]].',

    '1907 年，郑兴文来到哈尔滨。因为滨江关道经常接待外国客人，他就琢磨怎么让外国人也喜欢这道菜，想起自己在北京经营真味居时，那些驻华使馆的官员喜爱甜酸食品，于是决定试着改口，加入糖醋[[hljszw]]。

把铁锅烧热、急火快炒、把汁淋到锅里浸透到肉里，这道菜起初被起名叫「锅爆肉」。请俄国人品尝，他们连连叫好[[hljszw]]。

1911 年 4 月 3 日，清政府在奉天（今沈阳）召开有十二个国家出席的万国鼠疫研究会——这是中国第一次召开国际科研大会。大会给伍连德颁发了「鼠疫斗士」匾牌，也给郑兴文颁发了「滨江膳祖」匾牌[[hljszw]]。',

    'Zheng Xingwen arrived in Harbin in 1907. Because the Harbin circuit office frequently hosted foreign guests, he set about making the dish appeal to them, recalling that embassy officials had favoured sweet-and-sour food when he ran a restaurant in Beijing — so he adjusted the seasoning and added sugar and vinegar [[hljszw]].

He heated the iron wok, cooked fast over high heat and poured the sauce in so it soaked into the meat. The dish was at first called "guo bao rou" with the character meaning "explosion". Russian guests pronounced it delicious [[hljszw]].

On 3 April 1911 the Qing government convened the International Plague Conference in Fengtian — present-day Shenyang — with twelve countries attending' || chr(59) || ' it was Chinas first international scientific congress. The conference awarded Wu Lien-teh a plaque as a "plague fighter", and awarded Zheng Xingwen the title "ancestor of Harbin cuisine" [[hljszw]].',

    '锅包肉在 1911 年那次大会上还经过一次改良。郑兴文注意到代表们虽然喜欢这道菜，但每一桌都有剩余——原来这种火候菜存放时间一长就容易发艮，人们就不爱吃了。于是他把「烹汁」改为「熘汁」，又增加了蕃茄酱让颜色更鲜艳，并强调二次油炸：一次炸使肉里嫩、捞出能保留水分不致干硬；再炸使其外焦[[hljszw]]。他还提醒别用蛋清抓糊，以免松软影响脆度[[hljszw]]。

一般菜肴讲究色、香、味、型，这道菜还要再加一个「声」——咀嚼时应该发出类似吃苞米花的那种声音，这是酥脆的标志[[hljszw]]。

1922 年，郑家在道里西十道街南侧经营老厨家饭店，经长子郑义林建议，去掉了锅包肉中的水果配料——老厨家是中餐饭店，不宜做颇像西餐的菜；同时恢复了添加姜丝、葱丝、香菜梗的做法，但保留了甜酸口[[hljszw]]。',

    'The dish was refined again at the 1911 conference. Zheng Xingwen noticed that although delegates liked it, plates kept coming back with leftovers — a dish cooked to order toughens if it sits, and people stop enjoying it. So he switched from a "cooked-in sauce" to a "dressed sauce", added tomato paste for a brighter colour, and insisted on double frying: the first fry keeps the inside tender and holds in moisture so it does not dry out, the second gives a crisp exterior [[hljszw]]. He also warned against using egg white in the batter, which would soften it and cost the crunch [[hljszw]].

Most dishes are judged on colour, aroma, taste and appearance' || chr(59) || ' this one adds a fifth — sound. Biting into it should produce a noise like eating popcorn, and that is the mark of proper crispness [[hljszw]].

In 1922, when the Zheng family ran the Laochujia restaurant on the south side of Xishidao Street in Daoli, the eldest son Zheng Yilin suggested dropping the fruit from the recipe — Laochujia was a Chinese restaurant and should not serve something so close to a Western dish. Shredded ginger, spring onion and coriander stem were restored instead, while the sweet-and-sour profile was kept [[hljszw]].',
    NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL,
    NULL,
    NULL,
    'guobaorou|锅包肉|guobaorouharbinsweetandsourpork|黑龙江哈尔滨|harbin,heilongjiang',
    11
  );

INSERT INTO public.dishes
  (id, status, name_zh, name_en, region_slug, region_zh, region_en,
   tagline_zh, tagline_en,
   block_origin_zh, block_origin_en, block_story_zh, block_story_en,
   block_technique_zh, block_technique_en,
   note_zh, note_en,
   image_thumb_url, image_thumb_width, image_thumb_height,
   image_hero_url, image_hero_width, image_hero_height,
   image_alt_zh, image_alt_en,
   image_credit_author, image_credit_license, image_credit_license_url, image_credit_page,
   search_text, sort_order)
VALUES (
    'korean-ethnic-paocai',
    'published',
    '朝鲜族泡菜',
    'Korean Ethnic Paocai (Kimchi)',
    'jilin',
    '吉林延边',
    'Yanbian, Jilin',
    '一缸泡菜要准备整整一年：春天腌鱼酱，初秋备辣椒。',
    'A jar of paocai takes a whole year of preparation — fish sauce in spring, chillies in early autumn.',

    '朝鲜族泡菜是以白菜、萝卜等蔬菜为主要原料，经过一系列加工发酵流程制作传统发酵食品的传统手工技艺[[ihchina-paocai]]。

在东北地区，特别是吉林省延边州等朝鲜族世居地区，泡菜是朝鲜族人们一日三餐不可缺少的佐餐副食，这也是当地成为这一技艺主要流布地区的原因[[ihchina-paocai]]。

2014 年，「泡菜制作技艺（朝鲜族泡菜制作技艺）」被列入第四批国家级非物质文化遗产代表性项目名录，编号 Ⅷ-228，申报地区为吉林省延吉市[[ihchina-paocai]]。',

    'Korean ethnic paocai is a traditional handicraft in which cabbage, radish and other vegetables are turned into a fermented food through a sequence of processing steps [[ihchina-paocai]].

In the northeast, and especially in Korean communities such as Yanbian Prefecture in Jilin, paocai is an indispensable side dish at all three daily meals — which is why the region became the crafts main home [[ihchina-paocai]].

In 2014 the technique was added to Chinas fourth batch of national intangible cultural heritage (item no. Ⅷ-228), declared by Yanji City in Jilin [[ihchina-paocai]].',

    '朝鲜族泡菜的历史很悠久，最初的历史记录可以追溯到《三国志·魏志》[[ihchina-paocai]]。古代的泡菜用咸盐或醋腌制；16 世纪中叶辣椒传入以后，现代传承的泡菜制作技艺才初见雏形[[ihchina-paocai]]。

腌制泡菜是家庭妇女必学必会的手艺，这也是当下这一技艺得以传承的群众基础[[ihchina-paocai]]。

对朝鲜族民众来说，腌制泡菜还是一种冬季文化：一家腌菜，邻里会纷纷来帮忙，女性分担腌制，男性收拾地窖，一起分享成果。这种协作体现了人们的社区归属感，使邻里之间相处和睦，家庭美德和社会公德得以弘扬[[ihchina-paocai]]。',

    'Paocai has a long history: the earliest written record goes back to the Record of Wei in the Records of the Three Kingdoms [[ihchina-paocai]]. Ancient versions were preserved with salt or vinegar' || chr(59) || ' only after chillies arrived in the mid-16th century did the technique as it is passed down today begin to take shape [[ihchina-paocai]].

Making paocai was a skill every woman in the household was expected to master, and that is the popular base on which the craft survives [[ihchina-paocai]].

For Korean communities, paocai-making is also a winter culture: when one household makes a batch, neighbours come to help — women share the curing, men sort out the cellar, and the results are shared. That cooperation builds a sense of community, keeps neighbourly relations harmonious and reinforces both family and civic virtues [[ihchina-paocai]].',

    '从广义上讲，朝鲜族泡菜包括泡菜、小咸菜、酱腌咸菜，其中最常见的是以白菜为主料腌制的咸菜[[ihchina-paocai]]。

制作技艺的工序包括初渍、调制作料、涂抹作料、窖藏发酵等[[ihchina-paocai]]。用辣椒、大蒜、生姜等调味品腌制，使原来只有咸味或酸味的泡菜，具有辣、咸、甜、酸等多种味道，营养也更加丰富[[ihchina-paocai]]。

这门技艺以制作辣白菜为主。过冬泡菜虽然在初冬才制作，但需要经过一整年的准备：春天就要开始腌制鱼酱，初秋的时候准备辣椒粉与大蒜，各种蔬菜也要经过半年才能收获，因而需要长期的准备、因时而作[[ihchina-paocai]]。腌制技艺的特点体现在善于选料、多次腌渍、使用陈盐等方面，制作出的泡菜咸淡适度、清脆爽口，色泽鲜艳、保鲜性好[[ihchina-paocai]]。',

    'In the broad sense Korean ethnic paocai covers pickled vegetables, small salted side dishes and soy-sauce pickles, the most common being cabbage [[ihchina-paocai]].

The steps run through initial brining, preparing the seasoning mix, coating the vegetables with it, and cellaring them to ferment [[ihchina-paocai]]. Seasoned with chilli, garlic and ginger, what was once simply salty or sour gains a range of flavours — spicy, salty, sweet and sour — and better nutrition [[ihchina-paocai]].

The craft centres on making spicy cabbage. Although winter paocai is made in early winter, it takes a whole year of preparation: fish sauce is started in spring, chilli powder and garlic are readied in early autumn, and the vegetables themselves need half a year to grow — so the work follows the seasons [[ihchina-paocai]]. The technique is characterised by careful selection of ingredients, repeated brining and the use of aged salt' || chr(59) || ' the result is well-balanced, crisp and refreshing, brightly coloured and long-lasting [[ihchina-paocai]].',
    NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL,
    NULL,
    NULL,
    'koreanethnicpaocai|朝鲜族泡菜|koreanethnicpaocaikimchi|吉林延边|yanbian,jilin',
    12
  );

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('luosifen', '柳州螺蛳粉', '柳州螺蛳粉', 0),
  ('luosifen', '螺狮粉', '螺狮粉', 1),
  ('luosifen', '螺絲粉', '螺絲粉', 2),
  ('luosifen', '螺蛳粉制作技艺', '螺蛳粉制作技艺', 3),
  ('luosifen', 'luosifen', 'luosifen', 4),
  ('luosifen', 'luo si fen', 'luosifen', 5),
  ('luosifen', 'liusifen', 'liusifen', 6),
  ('luosifen', 'liuzhou luosifen', 'liuzhouluosifen', 7),
  ('luosifen', 'snail rice noodles', 'snailricenoodles', 8),
  ('luosifen', 'snail noodles', 'snailnoodles', 9);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('lanzhou-beef-noodles', '兰州拉面', '兰州拉面', 0),
  ('lanzhou-beef-noodles', '兰州牛肉拉面', '兰州牛肉拉面', 1),
  ('lanzhou-beef-noodles', '牛肉面', '牛肉面', 2),
  ('lanzhou-beef-noodles', '牛大', '牛大', 3),
  ('lanzhou-beef-noodles', '牛大碗', '牛大碗', 4),
  ('lanzhou-beef-noodles', 'lanzhou beef noodles', 'lanzhoubeefnoodles', 5),
  ('lanzhou-beef-noodles', 'lanzhou noodles', 'lanzhounoodles', 6),
  ('lanzhou-beef-noodles', 'lanzhou beef lamian', 'lanzhoubeeflamian', 7),
  ('lanzhou-beef-noodles', 'lanzhou lamian', 'lanzhoulamian', 8),
  ('lanzhou-beef-noodles', 'beef noodles', 'beefnoodles', 9),
  ('lanzhou-beef-noodles', 'niuda', 'niuda', 10);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('shaxian-snacks', '沙县小吃制作技艺', '沙县小吃制作技艺', 0),
  ('shaxian-snacks', '沙县', '沙县', 1),
  ('shaxian-snacks', '福建小吃', '福建小吃', 2),
  ('shaxian-snacks', '扁肉', '扁肉', 3),
  ('shaxian-snacks', '拌面', '拌面', 4),
  ('shaxian-snacks', 'shaxian snacks', 'shaxiansnacks', 5),
  ('shaxian-snacks', 'shaxian delicacies', 'shaxiandelicacies', 6),
  ('shaxian-snacks', 'shaxian xiaochi', 'shaxianxiaochi', 7),
  ('shaxian-snacks', 'fujian snacks', 'fujiansnacks', 8);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('mengzi-rice-noodles', '过桥米线', '过桥米线', 0),
  ('mengzi-rice-noodles', '云南过桥米线', '云南过桥米线', 1),
  ('mengzi-rice-noodles', '云南米线', '云南米线', 2),
  ('mengzi-rice-noodles', '蒙自米线', '蒙自米线', 3),
  ('mengzi-rice-noodles', 'crossing the bridge rice noodles', 'crossingthebridgericenoodles', 4),
  ('mengzi-rice-noodles', 'crossing-the-bridge noodles', 'crossingthebridgenoodles', 5),
  ('mengzi-rice-noodles', 'guoqiao mixian', 'guoqiaomixian', 6),
  ('mengzi-rice-noodles', 'mengzi rice noodles', 'mengziricenoodles', 7),
  ('mengzi-rice-noodles', 'yunnan rice noodles', 'yunnanricenoodles', 8);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('goubuli-baozi', '狗不理', '狗不理', 0),
  ('goubuli-baozi', '天津狗不理包子', '天津狗不理包子', 1),
  ('goubuli-baozi', '狗不理包子制作技艺', '狗不理包子制作技艺', 2),
  ('goubuli-baozi', '天津包子', '天津包子', 3),
  ('goubuli-baozi', 'goubuli', 'goubuli', 4),
  ('goubuli-baozi', 'goubuli baozi', 'goubulibaozi', 5),
  ('goubuli-baozi', 'tianjin baozi', 'tianjinbaozi', 6);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('beijing-roast-duck', '烤鸭', '烤鸭', 0),
  ('beijing-roast-duck', '北京烤鸭', '北京烤鸭', 1),
  ('beijing-roast-duck', '全聚德烤鸭', '全聚德烤鸭', 2),
  ('beijing-roast-duck', '便宜坊烤鸭', '便宜坊烤鸭', 3),
  ('beijing-roast-duck', '挂炉烤鸭', '挂炉烤鸭', 4),
  ('beijing-roast-duck', '焖炉烤鸭', '焖炉烤鸭', 5),
  ('beijing-roast-duck', '北京填鸭', '北京填鸭', 6),
  ('beijing-roast-duck', 'beijing roast duck', 'beijingroastduck', 7),
  ('beijing-roast-duck', 'peking duck', 'pekingduck', 8),
  ('beijing-roast-duck', 'roast duck', 'roastduck', 9);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('hejian-donkey-burger', '驴肉火烧', '驴肉火烧', 0),
  ('hejian-donkey-burger', '河间驴肉火烧', '河间驴肉火烧', 1),
  ('hejian-donkey-burger', '驴火', '驴火', 2),
  ('hejian-donkey-burger', '保定驴肉火烧', '保定驴肉火烧', 3),
  ('hejian-donkey-burger', '大火烧夹驴肉', '大火烧夹驴肉', 4),
  ('hejian-donkey-burger', 'donkey burger', 'donkeyburger', 5),
  ('hejian-donkey-burger', 'donkey meat sandwich', 'donkeymeatsandwich', 6),
  ('hejian-donkey-burger', 'hejian donkey burger', 'hejiandonkeyburger', 7),
  ('hejian-donkey-burger', 'lvrou huoshao', 'lvrouhuoshao', 8);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('shanxi-knife-cut-noodles', '刀削面', '刀削面', 0),
  ('shanxi-knife-cut-noodles', '山西刀削面', '山西刀削面', 1),
  ('shanxi-knife-cut-noodles', '大同刀削面', '大同刀削面', 2),
  ('shanxi-knife-cut-noodles', '飞刀削面', '飞刀削面', 3),
  ('shanxi-knife-cut-noodles', '削面', '削面', 4),
  ('shanxi-knife-cut-noodles', 'knife-cut noodles', 'knifecutnoodles', 5),
  ('shanxi-knife-cut-noodles', 'shaved noodles', 'shavednoodles', 6),
  ('shanxi-knife-cut-noodles', 'dao xiao mian', 'daoxiaomian', 7),
  ('shanxi-knife-cut-noodles', 'shanxi noodles', 'shanxinoodles', 8);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('chagan-idee', '察干伊德', '察干伊德', 0),
  ('chagan-idee', '查干伊德', '查干伊德', 1),
  ('chagan-idee', '奶制品制作技艺', '奶制品制作技艺', 2),
  ('chagan-idee', '蒙古族奶食', '蒙古族奶食', 3),
  ('chagan-idee', '奶豆腐', '奶豆腐', 4),
  ('chagan-idee', '奶酪', '奶酪', 5),
  ('chagan-idee', 'tsagaan idee', 'tsagaanidee', 6),
  ('chagan-idee', 'mongolian dairy', 'mongoliandairy', 7),
  ('chagan-idee', 'dairy foods', 'dairyfoods', 8);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('chicken-stewed-with-mushrooms', '小鸡炖蘑菇', '小鸡炖蘑菇', 0),
  ('chicken-stewed-with-mushrooms', '小鸡炖榛蘑', '小鸡炖榛蘑', 1),
  ('chicken-stewed-with-mushrooms', '笨鸡炖蘑菇', '笨鸡炖蘑菇', 2),
  ('chicken-stewed-with-mushrooms', '蘑菇炖小鸡', '蘑菇炖小鸡', 3),
  ('chicken-stewed-with-mushrooms', '本溪笨鸡炖蘑菇', '本溪笨鸡炖蘑菇', 4),
  ('chicken-stewed-with-mushrooms', 'chicken stewed with mushrooms', 'chickenstewedwithmushrooms', 5),
  ('chicken-stewed-with-mushrooms', 'chicken and mushroom stew', 'chickenandmushroomstew', 6),
  ('chicken-stewed-with-mushrooms', 'xiaojidunmogu', 'xiaojidunmogu', 7);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('guo-bao-rou', '锅包肉', '锅包肉', 0),
  ('guo-bao-rou', '锅爆肉', '锅爆肉', 1),
  ('guo-bao-rou', '老式锅包肉', '老式锅包肉', 2),
  ('guo-bao-rou', '哈尔滨锅包肉', '哈尔滨锅包肉', 3),
  ('guo-bao-rou', '焦炒肉片', '焦炒肉片', 4),
  ('guo-bao-rou', 'guo bao rou', 'guobaorou', 5),
  ('guo-bao-rou', 'guobaorou', 'guobaorou', 6),
  ('guo-bao-rou', 'double cooked pork slices', 'doublecookedporkslices', 7),
  ('guo-bao-rou', 'harbin sweet and sour pork', 'harbinsweetandsourpork', 8);

INSERT INTO public.dish_aliases (dish_id, alias, alias_norm, sort_order) VALUES
  ('korean-ethnic-paocai', '朝鲜族泡菜', '朝鲜族泡菜', 0),
  ('korean-ethnic-paocai', '辣白菜', '辣白菜', 1),
  ('korean-ethnic-paocai', '朝鲜族辣白菜', '朝鲜族辣白菜', 2),
  ('korean-ethnic-paocai', '泡菜', '泡菜', 3),
  ('korean-ethnic-paocai', '泡菜制作技艺', '泡菜制作技艺', 4),
  ('korean-ethnic-paocai', 'kimchi', 'kimchi', 5),
  ('korean-ethnic-paocai', 'korean ethnic paocai', 'koreanethnicpaocai', 6),
  ('korean-ethnic-paocai', 'paocai', 'paocai', 7);

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('luosifen', 1,
   '柳州螺蛳粉制作技艺于 2021 年（第五批）列入国家级非物质文化遗产代表性项目名录，项目编号 Ⅷ-277，类别为传统技艺，申报地区为广西壮族自治区柳州市。',
   'The craft of making Liuzhou luosifen was added to Chinas national list of intangible cultural heritage in 2021 (fifth batch), item no. Ⅷ-277, under the category of traditional craftsmanship' || chr(59) || ' the declaring region is Liuzhou City, Guangxi.'),
  ('luosifen', 2,
   '该项目的保护单位是柳州市群众艺术馆。',
   'The official safeguarding body for the item is the Liuzhou Mass Art Centre.'),
  ('luosifen', 3,
   '早在 2008 年，柳州螺蛳粉手工制作技艺就已入选第二批广西壮族自治区级非物质文化遗产名录。',
   'As early as 2008, the hand-making technique of Liuzhou luosifen had already been listed in the second batch of Guangxi regional intangible cultural heritage.'),
  ('luosifen', 4,
   '螺蛳粉制作技艺在清末民初基本成形，此后在柳州民间的私营餐饮店铺中广为流传。',
   'The technique took shape around the end of the Qing dynasty and the early Republic, then spread widely among private eateries in Liuzhou.'),
  ('luosifen', 5,
   '20 世纪七八十年代，柳州夜市摊主开始用螺蛳汤煮米粉，现代意义上的螺蛳粉由此定型。',
   'In the 1970s and 1980s, night-market vendors in Liuzhou began cooking rice noodles in snail broth — this is when luosifen took its modern form.'),
  ('luosifen', 6,
   '酸笋选用鲜嫩春笋，经山泉水浸泡 72 天自然发酵制成。',
   'The pickled bamboo shoots are made from tender spring shoots, soaked in mountain spring water and fermented naturally for 72 days.'),
  ('luosifen', 7,
   '螺蛳汤以石螺为主料，关键工序是「炒螺」，并与猪筒骨、茴香、紫苏等一同熬煮。',
   'The broth is built on stone snails' || chr(59) || ' the critical step is dry-frying them, after which they are simmered with pork marrow bones, fennel and perilla.'),
  ('luosifen', 8,
   '常见配料包括酸笋、酸豆角、木耳、花生、腐竹等；闻起来的「臭」味来自酸笋的发酵。',
   'Common toppings include pickled bamboo shoots, pickled green beans, wood ear mushrooms, peanuts and fried tofu skin' || chr(59) || ' the strong smell comes from the fermented bamboo shoots.'),
  ('luosifen', 9,
   '2014 年底，第一家袋装螺蛳粉企业在柳州诞生，此后螺蛳粉从街边小吃发展为预包装产业。',
   'At the end of 2014 the first packaged luosifen company appeared in Liuzhou' || chr(59) || ' from there the street snack grew into a packaged-food industry.'),
  ('luosifen', 10,
   '2018 年，「柳州螺蛳粉」获得中国国家地理标志商标。',
   'In 2018 "Liuzhou Luosifen" was granted Chinas national geographical indication trademark.'),
  ('luosifen', 11,
   '据柳州市政协网站专访，2024 年柳州市螺蛳粉全产业链销售收入为 759.6 亿元人民币（初步预测），同比增长 13.4%。',
   'According to an interview published on the Liuzhou CPPCC website, the citys whole luosifen industry chain recorded an estimated 75.96 billion yuan in revenue in 2024, up 13.4% year on year.');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('lanzhou-beef-noodles', 1,
   '2021 年，「传统面食制作技艺（兰州牛肉面制作技艺）」列入第五批国家级非物质文化遗产代表性项目名录，项目序号 943，编号 Ⅷ-160，类别传统技艺，类型为扩展项目，申报地区甘肃省兰州市，保护单位兰州市文化馆。',
   'In 2021 the traditional noodle-making technique of Lanzhou beef noodles was added to Chinas fifth national list of intangible cultural heritage — item no. 943, code Ⅷ-160, category traditional craftsmanship, an extended item, declared by Lanzhou City, Gansu, with the Lanzhou Mass Art Centre as safeguarding body.'),
  ('lanzhou-beef-noodles', 2,
   '兰州牛肉面制作技艺至今已有 100 余年历史；据近代地方志记载，该技艺由回民马保子始创。',
   'The craft of making Lanzhou beef noodles is over a hundred years old' || chr(59) || ' according to modern local gazetteers it was founded by the Hui chef Ma Baozi.'),
  ('lanzhou-beef-noodles', 3,
   '1915 年，马保子沿街叫卖自创的「热锅子面」；1919 年，他在兰州东城壕开设了第一家门店。',
   'In 1915 Ma Baozi sold his own invention, "hot-pot noodles", from a shoulder pole' || chr(59) || ' in 1919 he opened his first shop at Dongchenghao in Lanzhou.'),
  ('lanzhou-beef-noodles', 4,
   '面的制作分选料、和面、饧面、溜条和拉面五步。',
   'Making the noodles has five steps: choosing the flour, mixing the dough, resting it, working the strips and pulling.'),
  ('lanzhou-beef-noodles', 5,
   '按食客需求，面条可分为粗、二细、三细、细、毛细 5 种粗细，以及大宽、宽、韭叶 3 种宽度。',
   'To suit the customer, noodles come in five thicknesses — cu, erxi, sanxi, xi and maoxi — and three widths: dakuang, kuan and jiuye.'),
  ('lanzhou-beef-noodles', 6,
   '汤选用甘南草原出产的新鲜牦牛肉或黄牛肉，放草果、姜片、花椒、肉豆蔻、丁香、胡椒、白芷等十几种调料，小火炖 5 至 7 小时。',
   'The broth uses fresh yak or yellow beef from the Gannan grasslands, simmered with a dozen or so spices including black cardamom, ginger, Sichuan pepper, nutmeg, clove, pepper and angelica over a low flame for five to seven hours.'),
  ('lanzhou-beef-noodles', 7,
   '其制作精髓被概括为「汤清者亮，肉烂者香，面细者长」，汤面特点为「一清、二白、三红、四绿、五黄」。',
   'The craft is summed up as "clear broth that shines, tender beef that smells good, fine noodles that run long", with the bowls signature described as "one clear, two white, three red, four green, five yellow".'),
  ('lanzhou-beef-noodles', 8,
   '制作技艺已传承 6 代；目前仅兰州市就有牛肉面馆 1300 多家，全国现有兰州牛肉面馆（店）4 万多家，直接参与的从业者约 50 万人；40 多个海外国家有牛肉面馆 160 余家。',
   'The craft has passed through six generations' || chr(59) || ' Lanzhou alone has more than 1,300 beef-noodle shops, China has over 40,000, and about 500,000 people work in the trade directly' || chr(59) || ' more than 160 shops operate in over 40 countries overseas.'),
  ('lanzhou-beef-noodles', 9,
   '和面用高筋面粉，遵循「三遍水、三遍灰，九九八十一遍揉」的技法，并借助由戈壁滩野生蓬草烧制的天然碱水「蓬灰」，使面条柔滑透亮、富有弹性。',
   'The dough uses high-gluten flour and the rule "three rounds of water, three rounds of ash, eighty-one kneadings", helped by penghui — a natural alkaline water made by burning wild Gobi tumbleweed — which leaves the noodles smooth, translucent and springy.'),
  ('lanzhou-beef-noodles', 10,
   '兰州本地人称牛肉面为「牛大」，本地餐饮很少直接打「兰州拉面」的招牌；20 世纪 80 年代末起，青海化隆、尖扎等地群众外出开面馆时多借用「兰州拉面」之名，1988 年化隆农民韩录在厦门开了青海人在内地的第一家拉面馆，近年青海正推动其更名为「青海拉面」。',
   'People in Lanzhou call the dish niuda, and local restaurants rarely use the sign "Lanzhou lamian"' || chr(59) || ' from the late 1980s people from Hualong and Jianzha in Qinghai borrowed the Lanzhou name when opening shops elsewhere, with the Hualong farmer Han Lu opening the first Qinghai-run noodle shop in the interior in Xiamen in 1988 — and in recent years Qinghai has been encouraging a change to "Qinghai lamian".'),
  ('lanzhou-beef-noodles', 11,
   '「牛头标」授权门店已达一千五百余家；兰州牛肉面被评为「中华第一面」、「中国十大面条」之一，并入选「首批中国消费名品名单」；近三百四十家专业培训机构建立了拉面技艺教学体系。',
   '"Ox-head mark" licensed shops have reached more than 1,500' || chr(59) || ' Lanzhou beef noodles has been named "Chinas number-one noodle" and one of "Chinas top ten noodles", and was included in the first list of Chinese consumer name-brand products' || chr(59) || ' nearly 340 training institutions teach the pulling technique.');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('shaxian-snacks', 1,
   '2021 年，「小吃制作技艺（沙县小吃制作技艺）」列入第五批国家级非物质文化遗产代表性项目名录，项目序号 1522，编号 Ⅷ-276，类别传统技艺，类型为新增项目，申报地区福建省三明市，保护单位沙县小吃同业公会。',
   'In 2021 the snack-making technique of Shaxian was added to Chinas fifth national list of intangible cultural heritage — item no. 1522, code Ⅷ-276, category traditional craftsmanship, a newly added item, declared by Sanming City, Fujian, with the Shaxian Snack Trade Association as safeguarding body.'),
  ('shaxian-snacks', 2,
   '2007 年 8 月 28 日，福建省人民政府公布第二批省级非物质文化遗产名录，「沙县小吃制作工艺」列入其中，保护单位为三明市沙县小吃同业公会。',
   'On 28 August 2007 the Fujian provincial government proclaimed its second batch of provincial intangible cultural heritage, including the "Shaxian snack-making craft", with the Shaxian Snack Trade Association as safeguarding body.'),
  ('shaxian-snacks', 3,
   '该技艺是古代中原民众向百越地区移民过程中形成的，兼具北方与南方饮食文化特色；主要流布于福建省三明市沙县区、永安县、明溪县、清流县和宁化县，以沙县最为集中。',
   'The craft formed as people from the Central Plains migrated into the Baiyue lands and blends northern and southern food cultures' || chr(59) || ' it is found mainly in Shaxian, Yongan, Mingxi, Qingliu and Ninghua in Sanming, Fujian, and most densely in Shaxian itself.'),
  ('shaxian-snacks', 4,
   '沙县小吃食材多数来自本地，以竹荪、香芋、茶树菇等植物性原料为主，鸡、鸭、牛、羊等动物性原料为辅；主要佐料包括沙县纯辣酱、豆豉油、茂溪冬酒、花生酱等。',
   'Most ingredients are local, dominated by plant materials such as bamboo fungus, taro and tea-tree mushrooms, with chicken, duck, beef and mutton as supporting animal ingredients' || chr(59) || ' the main seasonings include Shaxian pure chilli sauce, fermented black-bean oil, Maoxi winter wine and peanut sauce.'),
  ('shaxian-snacks', 5,
   '该技艺将游、泡、捶、磨、踅、揉、晒、包、酿等制作工艺与蒸、煮、烤、煎、烙、炖等烹饪方式相结合，运用木槌、木墩、木楻、竹苈、舂臼、舂槌、饭甑、笊篱、烤炉、蒸笼、汤锅、灶、烙粑锅等工具。',
   'The craft combines parching, soaking, pounding, grinding, rolling, kneading, sun-drying, wrapping and stuffing with steaming, boiling, roasting, frying, griddling and stewing, using traditional tools: wooden mallets and blocks, a wooden rice steamer, bamboo mats, mortars and pestles, rice steamers, strainers, roasting ovens, steaming baskets, soup pots, stoves and griddle pans.'),
  ('shaxian-snacks', 6,
   '沙县小吃可制作成沙县扁肉、包心豆腐丸、沙县喜粿、米冻皮、板鸭等 110 余个小吃品种；可提前备好或在数分钟内即可做好的快餐食品占沙县小吃总量的 90% 以上。',
   'The tradition yields more than 110 snack varieties including Shaxian bianrou, stuffed tofu balls, xiguo rice cakes, rice-jelly sheets and pressed duck' || chr(59) || ' fast foods that can be prepared in advance or finished within minutes make up over 90 percent of the total.'),
  ('shaxian-snacks', 7,
   '关于品种总数，两处资料口径不同：国家级非遗项目页记载为「110 余个」，福建省数字文化馆的介绍为「据不完全统计，目前沙县小吃有 240 多个品种」。',
   'The two sources give different totals for the number of varieties: the national heritage project page records "more than 110", while the Fujian Digital Culture Centre says that "according to incomplete statistics, Shaxian snacks now number more than 240 varieties".'),
  ('shaxian-snacks', 8,
   '据《八闽通志》记载，沙县小吃兴于唐宋、盛于明清，在当代得到进一步发展。',
   'According to the Fujian gazetteer Bamin Tongzhi, Shaxian snacks rose in the Tang and Song dynasties, flourished in the Ming and Qing, and were further developed in modern times.'),
  ('shaxian-snacks', 9,
   '沙县小吃大体分为两大流派：以城关小吃为代表的一派受福州、厦门等沿海城市风味小吃影响，口味清、鲜、淡、甜，代表品种有扁肉、烧麦、肉包、花椒饼、鱼丸、豆腐丸、烫嘴豆腐、烤豆干等；以夏茂一带为代表的一派原料以米、薯、芋为主，口味咸、辣、酸，代表品种有米冻、喜粿、米冻皮、豆腐包、金钱蛋、芋包、浆糍、芋丝饼、牛肉系列食品等。',
   'Shaxian snacks divide into two lineages: the Chenguan style, influenced by the coastal snacks of Fuzhou and Xiamen, is clear, fresh, light and sweet — bianrou, shaomai, meat buns, pepper cakes, fish balls, tofu balls, scalding-hot tofu and grilled dried tofu' || chr(59) || ' the Xiamao style is built on rice, potato and taro and is salty, spicy and sour — rice jelly, xiguo rice cakes, rice-jelly sheets, stuffed tofu, coin eggs, taro dumplings, jiangci rice cakes, shredded-taro cakes and beef dishes.'),
  ('shaxian-snacks', 10,
   '沙县小吃以血缘传承、业缘传承的方式延续至今，形成了一批名店、名厨；20 世纪 90 年代以来，沙县小吃同业公会在当地政府支持下将其推向全国。',
   'The craft has been passed down through kinship and trade apprenticeship, producing well-known shops and chefs' || chr(59) || ' since the 1990s the Shaxian Snack Trade Association, backed by the local government, has promoted it nationwide.'),
  ('shaxian-snacks', 11,
   '目前沙县小吃从业者多达 6 万余人，沙县小吃店铺共 8.8 万个；近年来开始拓展海外市场，以工艺独特、取材时令、注重健康、力争还原本味等特点广受赞誉。',
   'The trade now employs more than 60,000 people and operates 88,000 shops' || chr(59) || ' in recent years it has begun expanding overseas, praised for its distinctive craft, seasonal ingredients, healthy emphasis and effort to keep flavours close to the original.');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('mengzi-rice-noodles', 1,
   '2014 年，「蒙自过桥米线制作技艺」列入第四批国家级非物质文化遗产代表性项目名录，项目序号 1349，编号 Ⅷ-235，类别传统技艺，类型为新增项目，申报地区云南省蒙自市，保护单位蒙自市文化馆。',
   'In 2014 the craft of Mengzi crossing-the-bridge rice noodles was added to Chinas fourth national list of intangible cultural heritage — item no. 1349, code Ⅷ-235, category traditional craftsmanship, a newly added item, declared by Mengzi City, Yunnan, with the Mengzi Mass Art Centre as safeguarding body.'),
  ('mengzi-rice-noodles', 2,
   '过桥米线由米线、鲜汤和配料三部分组成，以「玉带过桥式」吃法称奇；其制作技艺主要有米线榨制、汤料制作和佐菜配料三道工序。',
   'The dish has three parts — noodles, fresh broth and garnishes — and is known for its "jade-belt crossing the bridge" way of eating' || chr(59) || ' the craft has three stages: extracting the noodles, making the broth and preparing the garnishes.'),
  ('mengzi-rice-noodles', 3,
   '米线经过配米、磨浆、发酵、合成、初蒸、压榨、煮熟、漂洗等工艺流程榨出，成品纤细劲道，直径在 2 毫米之内，烹煮不易断碎；蒙自盛产的优质大米和古城大井的「甜水」是必要原料。',
   'The noodles are pressed out through matching the rice, grinding the slurry, fermenting, combining, pre-steaming, pressing, boiling and rinsing' || chr(59) || ' the finished strands are fine and springy, under two millimetres across, and do not break up on cooking. Mengzis high-quality rice and the "sweet water" of the old citys great well are essential raw materials.'),
  ('mengzi-rice-noodles', 4,
   '汤以鸡肉、猪肉和大骨为主料煨成老汤；配料分生熟两类，生菜如鹌鹑蛋、猪脊肉片、菊花、姜末，熟菜有鸡肉、豆腐皮、豌豆坨、韭菜等。',
   'The broth is simmered from chicken, pork and large bones as the main ingredients' || chr(59) || ' the garnishes divide into raw and cooked — raw ones such as quail eggs, pork loin slices, chrysanthemum petals and minced ginger, cooked ones such as chicken, tofu skin, pea paste and chives.'),
  ('mengzi-rice-noodles', 5,
   '食用时用口径足有 30 厘米大小的土陶大海碗，盛着滚烫的秘制高汤与多碟生熟配菜一并上桌，放料按先生后熟的顺序，再将米线适量过入汤碗，使之一头入汤一头在原碗里，喻义「过桥」。',
   'It is served in a large earthenware bowl 30 centimetres across holding scalding secret-recipe broth together with several plates of raw and cooked garnishes' || chr(59) || ' ingredients go in raw first and cooked afterwards, then noodles are drawn across into the soup so one end sits in the broth and the other stays in the original bowl — which is what "crossing the bridge" refers to.'),
  ('mengzi-rice-noodles', 6,
   '《蒙自县志》记载：清代有一秀才在蒙自南湖小岛苦读，妻子怜其身体送食米线，无意中创此佳肴，因送米线途经石拱桥而得名「过桥米线」；技艺始于明代，大量内地军民戍边蒙自带来不同饮食习俗。',
   'The Mengzi County Gazetteer records that a Qing-dynasty scholar studied hard on a small island in Mengzis South Lake and his wife, worried about his health, brought him rice noodles — an accidental invention' || chr(59) || ' because her route crossed a stone arch bridge the dish was named "crossing the bridge". The craft began in the Ming dynasty, when large numbers of soldiers and civilians garrisoning Mengzi brought their own food customs.'),
  ('mengzi-rice-noodles', 7,
   '云南最早的地方志《万历云南通志》载「食有米缆、蓬饵、蒜脍」，「米缆」即米线早期称谓；《滇南志略》载「明中叶蒙自已有碓房七十二户，昼夜舂米为线」；明正德六年（1511）设新安守御千户所，江南军民入蒙自，带来「米缆」制作技术。',
   'Yunnans earliest gazetteer, the Wanli Yunnan Tongzhi, records "rice noodles, rice cakes and minced fish among the foods", where "rice cable" is the early name for rice noodles' || chr(59) || ' the Diannan Zhilue records that "by the middle of the Ming dynasty Mengzi already had seventy-two husking workshops, pounding rice into noodles day and night"' || chr(59) || ' in 1511 a garrison was established at Xinan and soldiers and civilians from the lower Yangtze entered Mengzi, bringing the technique for making those "rice cables".'),
  ('mengzi-rice-noodles', 8,
   '1995 年版《蒙自县志·卷二十一·社会·饮食》载其「源于明末清初」，至 1989 年已有三百余年历史；并记汤法为「以壮鸡、肥鸭、鲜猪排骨、筒子骨为料，加水煨五六小时，始用猛火去浮沫，后用微火慢炖，汤呈乳白，鸡油封汤，久热不凉」。',
   'The 1995 edition of the Mengzi County Gazetteer (vol. 21, society and diet) dates the dish to "the late Ming and early Qing", over three centuries old by 1989, and records the broth method: "strong chicken, fat duck, fresh pork ribs and marrow bones simmered with water for five or six hours — first a fierce flame to skim the scum, then a low flame until the broth turns milky, sealed with chicken oil so it stays hot".'),
  ('mengzi-rice-noodles', 9,
   '清光绪时期，蒙自、建水出现专营食馆（如建水宝兴楼）；清至民国滇越铁路通车、蒙自开埠通商后，过桥米线随商旅传至昆明、个旧、河口，「德鑫园」「仁和园」等店将其引入昆明；《续蒙自县志》载「汤米线、生片烫食，城乡盛行，为滇南名食」。',
   'In the Guangxu period specialist eateries appeared in Mengzi and Jianshui, such as Baoxinglou' || chr(59) || ' after the Yunnan-Vietnam railway opened and Mengzi became a treaty port, the dish spread with merchants to Kunming, Gejiu and Hekou, with shops such as Dexinyuan and Renheyuan introducing it to Kunming' || chr(59) || ' the Continued Mengzi County Gazetteer records that "soup rice noodles with scalded raw slices were popular in town and countryside alike, a famous dish of southern Yunnan".'),
  ('mengzi-rice-noodles', 10,
   '2009 年，蒙自获封「中国过桥米线之乡」，过桥米线获评「中华名小吃」并获国家地理标志证明商标；2018 年王丽珠被认定为此项国家级非物质文化遗产代表性传承人；2022 年蒙自被世界中餐业联合会评选为「国际（过桥米线）美食名城」。',
   'In 2009 Mengzi was named "home of Chinas crossing-the-bridge rice noodles", the dish was rated a "famous Chinese snack" and received a national geographical indication trademark' || chr(59) || ' in 2018 Wang Lizhu was recognised as the national-level representative inheritor of the craft' || chr(59) || ' in 2022 the World Federation of Chinese Catering Industry named Mengzi an "international (crossing-the-bridge rice noodle) food city".'),
  ('mengzi-rice-noodles', 11,
   '截至人民网报道，蒙自过桥米线的品牌授权店达 1052 家，其中 8 家开在海外；全市有 28 家米线生产主体、3000 余个经营主体、3 万余名从业人员，年产值 45 亿元。',
   'At the time of the Peoples Daily report the dish had 1,052 licensed brand shops, eight of them overseas' || chr(59) || ' the city counted 28 noodle producers, more than 3,000 food businesses and over 30,000 workers, with an annual output value of 4.5 billion yuan.'),
  ('mengzi-rice-noodles', 12,
   '据人民网报道，蒙自熬汤讲究用老母鸡、筒子骨小火慢炖 6 小时以上，汤色清、鲜味醇；米线经浸泡、磨浆、发酵、压榨等 10 多道工序，每百斤大米出粉率超过 92%，产品合格率达到 99.5%。',
   'According to Peoples Daily, Mengzi broth is made by slow-simmering old hen and marrow bones over a low flame for more than six hours to a clear, deeply savoury result' || chr(59) || ' the noodles go through more than ten processes including soaking, slurry-grinding, fermenting and pressing, with a yield above 92 percent per hundred jin of rice and a pass rate of 99.5 percent.');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('goubuli-baozi', 1,
   '2011 年（第三批），「传统面食制作技艺（天津『狗不理』包子制作技艺）」列入国家级非物质文化遗产代表性项目名录，项目序号 943，编号 Ⅷ-160，类别传统技艺，类型为扩展项目，申报地区天津市和平区，保护单位狗不理集团股份有限公司。',
   'In 2011, in the third batch, the traditional noodle-making technique of Tianjin Goubuli baozi was added to Chinas national list of intangible cultural heritage — item no. 943, code Ⅷ-160, category traditional craftsmanship, an extended item, declared by Heping District, Tianjin, with the Goubuli Group as safeguarding body.'),
  ('goubuli-baozi', 2,
   '商务部流通发展司通报：国务院公布的第三批国家级非物质文化遗产名录共 191 项，其中涉及「中华老字号」企业的项目共 15 项，「传统面食制作技艺（天津『狗不理』包子制作技艺、稷山传统面点制作技艺）」在列，该行序号 96、编号 Ⅷ-160，子项为「天津狗不理包子制作工艺」。',
   'A bulletin from the Ministry of Commerce records that the third batch of the national intangible cultural heritage list contained 191 items, 15 of them belonging to "China Time-honoured Brand" enterprises, including the traditional noodle-making technique covering Tianjin Goubuli baozi and Jishan traditional pastries — row 96, code Ⅷ-160, sub-item "Tianjin Goubuli baozi making craft".'),
  ('goubuli-baozi', 3,
   '狗不理包子为天津名优食品「三绝」之首，系用水馅半发面制作，状若凝脂，形似菊花，口感鲜香不腻；在制馅、和面、揉肥、擀皮、捏包、上灶等各方面均有自己独特的操作方法。',
   'Goubuli baozi is the first of Tianjins "three wonders" among famous local foods: made with a juicy filling and half-leavened dough, like congealed cream in appearance and chrysanthemum-like in shape, savoury without being greasy, with its own distinctive methods at every stage from filling and dough to resting, rolling, pleating and steaming.'),
  ('goubuli-baozi', 4,
   '中国日报网转引的介绍记载：狗不理包子始创于公元 1858 年（清朝咸丰年间），为「天津三绝」之首，是中华老字号之一。',
   'An account republished by China Daily records that Goubuli baozi was founded in 1858, in the Xianfeng reign of the Qing dynasty' || chr(59) || ' it is the first of the "three wonders of Tianjin" and one of Chinas time-honoured brands.'),
  ('goubuli-baozi', 5,
   '据非遗项目页记载，创始人高贵友于清同治八年（1869）在侯家后的刘记蒸食铺学徒；学徒期满后辞职出号，清光绪八年（1882）自己投资经营包子铺，取名「德聚号」。',
   'According to the heritage project page, the founder Gao Guiyou apprenticed in 1869 at the Liu familys steamed-food shop at Houjiahou' || chr(59) || ' after his apprenticeship he left and in 1882 set up his own bun shop under the name Dejuhao.'),
  ('goubuli-baozi', 6,
   '「狗不理」之名来自熟客打趣：高贵友乳名「狗子」，因忙于生意、言语不多而被说成「狗子不理人」；天后宫一位道士建议他把「德聚号」改名为「狗不理」，他采纳后挂出招牌。',
   '"Goubuli" came from customers teasing: Gao Guiyous childhood name was Gouzi, and because he was busy and not talkative people said "Gouzi ignores people". A Daoist priest from the Tianhou Temple suggested renaming Dejuhao to Goubuli, and Gao Guiyou hung up the new sign.'),
  ('goubuli-baozi', 7,
   '和面时水温要根据季节变化，一般情况下用温水，采用「一拱肥」的方法；死面起「骨头」作用，发面起「肉」的作用，这种面的优点是不透油、有咬劲、面皮光泽度好、软硬兼备。',
   'The water temperature for the dough changes with the season, generally warm water, using the "single-arch leaven" method' || chr(59) || ' the unyeasted dough acts as "bone" and the leavened dough as "flesh", giving a dough that does not let oil through, has bite, gives the skin a good sheen and manages to be both soft and firm.'),
  ('goubuli-baozi', 8,
   '擀皮时要求达到薄厚均匀、圆、大小适当；每个包子装馅 3 钱左右；捏包时要求褶花均匀、整齐、美观，形似白菊待放；关键环节是上灶，掌握火候要恰到好处。',
   'The skins must be rolled evenly thin and thick, round and suitably sized' || chr(59) || ' each bun takes about three qian of filling' || chr(59) || ' the pleating must be even, neat and handsome, like a white chrysanthemum about to open' || chr(59) || ' and the critical step is the steaming, where the heat must be judged exactly.'),
  ('goubuli-baozi', 9,
   '据中国日报网转引的介绍，狗不理包子褶花匀称，每个包子都不少于 15 个褶；以鲜肉包为主，兼有三鲜包、海鲜包、酱肉包、素包子等 6 大类、98 个品种；刚出笼的包子鲜而不腻、清香适口。',
   'According to the account republished by China Daily, the pleats are evenly spaced with no fewer than fifteen per bun' || chr(59) || ' fresh-pork buns dominate, alongside a mixed three-fresh bun, seafood, braised-pork and vegetarian versions — six broad categories and 98 varieties' || chr(59) || ' straight from the steamer they are fresh without being greasy and clean in flavour.'),
  ('goubuli-baozi', 10,
   '一百五十余年来，狗不理包子制作技艺以其丰富的饮食文化价值，被认定为「中国驰名商标」「中华老字号」，并获得「国际名品中华美食奖」，在国内外烹饪大赛中屡获殊荣。',
   'For more than 150 years the craft has been recognised for its rich culinary-cultural value as a "China Well-known Trademark" and a "China Time-honoured Brand", has won the "International Famous Brand Chinese Cuisine Award" and repeatedly taken prizes in cooking competitions at home and abroad.');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('beijing-roast-duck', 1,
   '烤鸭技艺（含全聚德挂炉烤鸭技艺、便宜坊焖炉烤鸭技艺）于 2008 年（第二批）列入国家级非物质文化遗产代表性项目名录，项目编号 Ⅷ-167，项目序号 950，类别为传统技艺，申报地区为北京市。',
   'The craft of roast duck — covering both Quanjudes hanging-oven technique and Bianyifangs closed-oven technique — was added to Chinas second-batch national intangible cultural heritage list in 2008: item no. Ⅷ-167, sequence no. 950, category traditional craftsmanship, declared by Beijing Municipality.'),
  ('beijing-roast-duck', 2,
   '全聚德挂炉烤鸭技艺的申报地区或单位是北京市全聚德（集团）股份有限公司，保护单位是中国全聚德（集团）股份有限公司；便宜坊焖炉烤鸭技艺的申报与保护单位都是北京便宜坊烤鸭集团有限公司。',
   'The declaring body for Quanjudes hanging-oven technique is Beijing Quanjude (Group) Co., Ltd., which is also its safeguarding body' || chr(59) || ' Bianyifangs closed-oven technique is both declared and safeguarded by Beijing Bianyifang Roast Duck Group Co., Ltd.'),
  ('beijing-roast-duck', 3,
   '烤鸭古称「烧鸭子」「炉烧鸭」「南炉鸭」。据元代《饮膳正要》记载，当时宫廷已有烧鸭子；清代文献记载御膳房中秋除桂花月饼外还备「南炉鸭」，清高宗（乾隆）尤为喜爱。',
   'Roast duck was historically called "shaoyazi", "lushaoya" or "nanluya". The Yuan-dynasty text Yinshan Zhengyao records duck roasting at court, and Qing sources note that the imperial kitchen prepared "southern oven duck" at Mid-Autumn alongside osmanthus mooncakes — a dish the Qianlong Emperor was especially fond of.'),
  ('beijing-roast-duck', 4,
   '便宜坊创始于明代永乐十四年（1416），全聚德创始于清代同治三年（1864），创办人为杨全仁。北京烤鸭有挂炉（明火）、焖炉（暗火）、缸炉、叉烧等不同制作工艺。',
   'Bianyifang was founded in 1416 (the 14th year of Yongle) and Quanjude in 1864 (the 3rd year of Tongzhi), the latter by Yang Quanren. Beijing roast duck is made by several methods: hanging oven (open flame), closed oven (banked heat), jar oven and spit-roasting.'),
  ('beijing-roast-duck', 5,
   '全聚德挂炉烤鸭以果木为燃料、明火烤制，整套工艺由宰烫、制坯、烤制、片鸭 4 道工序、31 个环节组成。',
   'Quanjudes hanging-oven duck is roasted over an open fruitwood fire' || chr(59) || ' the full technique consists of four stages — scalding, preparing the bird, roasting and carving — broken down into 31 steps.');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('hejian-donkey-burger', 1,
   '「河间驴肉火烧」是流行于河北河间一带的传统小吃制作技艺，在民间已有 300 年以上的制作历史。',
   'Hejian donkey-meat huoshao is a traditional snack craft from Hejian in Hebei, made by hand for more than 300 years.'),
  ('hejian-donkey-burger', 2,
   '2012 年，「河间驴肉火烧制作技艺」被列入河北省第四批省级非物质文化遗产代表性项目名录。',
   'In 2012 the technique of making Hejian donkey-meat huoshao was added to the fourth batch of Hebei Provinces intangible cultural heritage list.'),
  ('hejian-donkey-burger', 3,
   '它的主要做法是面食「火烧」的烤制与卤制驴肉，将驴肉、焖子等夹入火烧之中，成品表皮酥脆劲道、味道香浓。',
   'The method combines a baked wheat bun with braised donkey meat, the meat and menzi jelly tucked inside' || chr(59) || ' the result is a chewy, crisp crust with a rich savoury filling.'),
  ('hejian-donkey-burger', 4,
   '火烧的制作要领被概括为「四绝」——色如金、酥如雪、形如书、薄如纸。据河间市人民政府门户网站的解释，火烧层数可达 25 至 30 层，捯开长度约 2 米。',
   'Making the bun comes down to four "excellences": colour like gold, crispness like snow, shape like a book and thinness like paper. According to the Hejian municipal governments website, the bun can have 25 to 30 layers and pull open to about two metres.'),
  ('hejian-donkey-burger', 5,
   '驴肉以陈年老汤加 20 多种佐料大锅炖制；「焖子」用烹制驴肉的汤加驴油和淀粉调成，民间有「驴肉火烧好不好吃，关键在香焖而不在肉」的说法。',
   'The donkey meat is simmered in a large pot with an aged master stock and more than twenty seasonings. The menzi jelly is made from that stock with donkey fat and starch' || chr(59) || ' locals say the quality of the huoshao rests on the menzi rather than the meat.');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('shanxi-knife-cut-noodles', 1,
   '「传统面食制作技艺（龙须拉面和刀削面制作技艺）」于 2008 年（第二批）列入国家级非物质文化遗产代表性项目名录，项目编号 Ⅷ-160，项目序号 943，类别为传统技艺，申报地区为山西省，申报单位为山西省全晋会馆，保护单位为山西全晋饮食文化有限公司。',
   'The traditional wheaten-food technique covering dragon-whisker hand-pulled noodles and knife-cut noodles was added to Chinas second-batch national intangible cultural heritage list in 2008: item no. Ⅷ-160, sequence no. 943, category traditional craftsmanship, declared by Shanxi Province through the Shanxi Quanjin Guild Hall, and safeguarded by Shanxi Quanjin Food Culture Co., Ltd.'),
  ('shanxi-knife-cut-noodles', 2,
   '刀削面又称「飞刀削面」，相传始于元代。',
   'Knife-cut noodles are also known as "flying-knife noodles" and are traditionally said to date from the Yuan dynasty.'),
  ('shanxi-knife-cut-noodles', 3,
   '制作时先把面揉成尺余长的筒状，一手托面、一手持特制削刀由上往下逐条削入沸水锅；削出的面条呈三棱形，宽厚长度相同，状似柳叶。',
   'The dough is kneaded into a roll about a chi long, then held in one hand while the other slices strip after strip into the boiling pot with a purpose-made blade' || chr(59) || ' the noodles come out triangular and uniform, shaped like willow leaves.'),
  ('shanxi-knife-cut-noodles', 4,
   '刀削面以细、薄、长著称，有筋骨、柔软光滑、易于消化。它与炸酱面、伊府面、热干面、担担面同称为中国「五大面食名品」（云州区人民政府的表述中，与它并列的是北京打卤面）。',
   'Knife-cut noodles are known for being fine, thin and long, with a pleasant chew and a smooth texture, and are easy to digest. They are listed among Chinas "five famous wheaten dishes" together with zhajiang noodles, yifu noodles, hot-dry noodles and dandan noodles — though the Yunzhou District governments account pairs them instead with Beijings dalurou noodles.'),
  ('shanxi-knife-cut-noodles', 5,
   '山西素有「中国面食之乡」美称，山西各地刀削面中以大同刀削面最出名。2018 年，中国饭店协会授予大同「中国刀削面之乡」荣誉称号。',
   'Shanxi is known as "Chinas home of wheaten food", and the Datong style is the best known of the provinces knife-cut noodles. In 2018 the China Hotel Association named Datong "Home of Chinese Knife-Cut Noodles".');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('chagan-idee', 1,
   '「奶制品制作技艺（察干伊德）」于 2014 年（第四批）列入国家级非物质文化遗产代表性项目名录，项目编号 Ⅷ-226，项目序号 1340，类别为传统技艺，申报地区为内蒙古自治区正蓝旗，保护单位为正蓝旗文体旅游广电事业发展中心。',
   'Mongolian dairy-making (tsagaan idee) was added to Chinas fourth-batch national intangible cultural heritage list in 2014: item no. Ⅷ-226, sequence no. 1340, category traditional craftsmanship, declared by Zhenglan Banner in Inner Mongolia and safeguarded by the banners culture, tourism, radio and television development centre.'),
  ('chagan-idee', 2,
   '「察干伊德」汉语直译为「白色的食品」，由天然纯奶制成。它的产品有鲜奶干、过滤察干伊德、奶酪等 30 多种，相关饮品也有 10 余种。',
   '"Tsagaan idee" means literally "white food" and is made from pure natural milk. It includes more than thirty products — dried curd, filtered tsagaan idee, cheese and others — plus over ten related drinks.'),
  ('chagan-idee', 3,
   '基本工艺是把鲜奶通过发酵转化、分离、温火炼制等手段，以不同工艺和程序加工出各种察干伊德；分离出的乳清可以制成奶酒，实现鲜奶的全部利用。',
   'Fresh milk is processed through fermentation, separation and gentle heating, with different sequences producing different types of tsagaan idee' || chr(59) || ' the whey that separates out can be turned into milk wine, so the whole of the milk is used.'),
  ('chagan-idee', 4,
   '13 世纪，元世祖忽必烈设立「畜群局」，专为元宫廷提供和制作肉与察干伊德。元代诗人萨都剌有诗句「牛羊散漫落日下，野草生香乳酪甜」。',
   'In the 13th century Kublai Khan established a herds bureau to supply the Yuan court with meat and tsagaan idee. The Yuan poet Sadula wrote: "Cattle and sheep scattered under the setting sun, wild grass fragrant and milk curd sweet."'),
  ('chagan-idee', 5,
   '该技艺主要流布于锡林郭勒盟南部的正蓝旗、正镶白旗、镶黄旗地区，尤以正蓝旗最具代表性；正蓝旗也被誉为「察干伊德文化之乡」。',
   'The craft is found mainly in Zhenglan, Zhengxiangbai and Xianghuang Banners in southern Xilin Gol League, with Zhenglan the most representative' || chr(59) || ' the banner is also known as the "home of tsagaan idee culture".');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('chicken-stewed-with-mushrooms', 1,
   '2024 年，辽宁省商务厅公示的「美市美食」辽宁地标美食评审认定结果中，本溪的「本溪笨鸡炖蘑菇」入选。',
   'In 2024 the Liaoning Provincial Department of Commerce published for comment the results of its "Beautiful Market Foods" Liaoning geographical-indication food review' || chr(59) || ' "Benxi free-range chicken stewed with mushrooms" was among the entries from Benxi.'),
  ('chicken-stewed-with-mushrooms', 2,
   '小鸡炖蘑菇所属的「辽菜传统烹饪技艺」于 2014 年（第四批）列入国家级非物质文化遗产代表性项目名录，项目编号 Ⅷ-227，项目序号 1341，类别为传统技艺，申报地区为辽宁省沈阳市，保护单位为沈阳鹿鸣春饭店有限公司。',
   'The traditional cooking technique of Liao cuisine, on which the dish rests, was added to Chinas fourth-batch national intangible cultural heritage list in 2014: item no. Ⅷ-227, sequence no. 1341, category traditional craftsmanship, declared by Shenyang, Liaoning, and safeguarded by Shenyang Lumingchun Restaurant Co., Ltd.'),
  ('chicken-stewed-with-mushrooms', 3,
   '辽菜以宫廷菜、王府菜、市井菜、民俗菜、民族菜和海鲜菜为基本框架，目前主要流布于辽宁沈阳、锦州、丹东、营口、葫芦岛、铁岭、抚顺、辽阳、鞍山、朝阳、阜新等地。',
   'Liao cuisine is built around court dishes, princely-house dishes, street food, folk dishes, ethnic dishes and seafood, and is currently found across Shenyang, Jinzhou, Dandong, Yingkou, Huludao, Tieling, Fushun, Liaoyang, Anshan, Chaoyang and Fuxin.'),
  ('chicken-stewed-with-mushrooms', 4,
   '辽菜擅长扒、熘、烧、炸、烩、烤等 30 余种技法，尤以「扒」著称；扒菜中的「大翻勺」是辽菜独门绝技，扒三白等菜肴出勺后整齐划一、不变样。',
   'Liao cuisine excels at more than thirty techniques including braising, quick-frying, simmering, deep-frying, stewing and roasting, and is best known for pa-style braising. The "big wok flip" used in those dishes is a Liao speciality that leaves dishes such as pa san bai uniform and intact.'),
  ('chicken-stewed-with-mushrooms', 5,
   '辽菜烹饪技艺从辽金时期就已具有相当水平。老一代传承人梁忠、王占山、颜庆鸿等把鲁菜传统技艺精华与满、蒙、朝、汉民族菜的特点相结合，运用辽宁原材料，逐步形成了辽菜流派。',
   'Liao cooking had already reached a considerable standard in the Liao and Jin dynasties. Inheritors of the earlier generation — Liang Zhong, Wang Zhanshan and Yan Qinghong among them — combined the essence of Shandong cooking with Manchu, Mongolian, Korean and Han characteristics and Liaoning ingredients to form the Liao school.');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('guo-bao-rou', 1,
   '锅包肉原名「锅爆肉」，由哈尔滨道台府（滨江关道）厨师郑兴文创制。1907 年郑兴文到哈尔滨后，为适应经常来道台府的外国客人（尤其是俄罗斯人）的口味，把原本咸鲜的「焦炒肉片」改成了糖醋酸甜口。',
   'Guo bao rou was originally called guo bao rou with a different character, and was created by Zheng Xingwen, chef at Harbins circuit-intendant office. After arriving in Harbin in 1907 he turned the savoury "stir-fried pork slices" into a sweet-and-sour dish to suit the foreign guests — Russians in particular — who frequented the office.'),
  ('guo-bao-rou', 2,
   '因用急火快炒、把汁淋进锅里浸透肉片，这道菜起初叫「锅爆肉」；外国人发不准「爆」字，久而久之读成「包」，「锅包肉」之名由此而来。',
   'Because it was cooked fast over high heat with the sauce poured in to soak the meat, the dish was first called "guo bao rou" with the character for "explosion"' || chr(59) || ' foreign diners could not pronounce it accurately and it shifted to the character for "wrap", giving the modern name.'),
  ('guo-bao-rou', 3,
   '1911 年 4 月，清政府在奉天（今沈阳）召开有十二个国家出席的万国鼠疫研究会，郑兴文被点名出任会议总厨。他注意到锅包肉每桌都有剩余，原因是火候菜存放久了容易发艮，于是把「烹汁」改为「熘汁」并加入蕃茄酱，还强调二次油炸。',
   'In April 1911 the Qing government convened the International Plague Conference in Fengtian — todays Shenyang — with twelve countries attending, and Zheng Xingwen was specifically requested as head chef. Noticing that the guo bao rou was coming back uneaten because a made-to-order dish toughens as it sits, he changed from a cooked-in sauce to a dressed sauce, added tomato paste and insisted on double frying.'),
  ('guo-bao-rou', 4,
   '1922 年，郑家在经营老厨家饭店时，经长子郑义林建议去掉锅包肉中的水果配料，并恢复添加姜丝、葱丝、香菜梗的做法，但保留了甜酸口。',
   'In 1922, when the Zheng family ran the Laochujia restaurant, the eldest son Zheng Yilin suggested removing the fruit from the recipe and restoring shredded ginger, spring onion and coriander stem — while keeping the sweet-and-sour taste.'),
  ('guo-bao-rou', 5,
   '老式锅包肉讲究「汁要现调、醋要炝锅」；肉片裹上淀粉滑入热油时，老师傅靠听声音辨别火候——声音清脆就是火候正好，发闷则欠点火。',
   'Old-style guo bao rou insists that the sauce be mixed to order and the vinegar flashed in the wok. As the starch-coated pork slices go into the hot oil, experienced cooks judge the heat by ear — a clear, crisp sound means the timing is right' || chr(59) || ' a dull one means it needs longer.');

INSERT INTO public.dish_facts (dish_id, seq, text_zh, text_en) VALUES
  ('korean-ethnic-paocai', 1,
   '「泡菜制作技艺（朝鲜族泡菜制作技艺）」于 2014 年（第四批）列入国家级非物质文化遗产代表性项目名录，项目编号 Ⅷ-228，项目序号 1342，类别为传统技艺，申报地区为吉林省延吉市，保护单位为延吉友谊有限公司。',
   'The paocai-making technique of the Korean ethnic group was added to Chinas fourth-batch national intangible cultural heritage list in 2014: item no. Ⅷ-228, sequence no. 1342, category traditional craftsmanship, declared by Yanji City, Jilin, and safeguarded by Yanji Friendship Co., Ltd.'),
  ('korean-ethnic-paocai', 2,
   '该技艺以白菜、萝卜等蔬菜为主要原料，经一系列加工发酵流程制成，工序包括初渍、调制作料、涂抹作料、窖藏发酵等。',
   'The craft uses cabbage, radish and other vegetables as its main materials, taking them through a sequence of processing and fermentation steps: initial brining, preparing the seasoning mix, coating the vegetables and cellaring them to ferment.'),
  ('korean-ethnic-paocai', 3,
   '用辣椒、大蒜、生姜等调味品腌制，使原来只有咸味或酸味的泡菜具有辣、咸、甜、酸等多种味道，营养也更加丰富。',
   'Seasoned with chilli, garlic and ginger, what were once only salty or sour pickles take on spicy, salty, sweet and sour flavours together, with richer nutrition as well.'),
  ('korean-ethnic-paocai', 4,
   '朝鲜族泡菜最初的历史记录可追溯至《三国志·魏志》；16 世纪中叶辣椒传入以后，现代传承的泡菜制作技艺才初见雏形。',
   'The earliest written record of Korean ethnic paocai goes back to the Record of Wei in the Records of the Three Kingdoms' || chr(59) || ' only after chillies arrived in the mid-16th century did the technique as it is passed down today begin to take shape.'),
  ('korean-ethnic-paocai', 5,
   '在吉林延边等朝鲜族世居地区，泡菜是一日三餐不可缺少的佐餐副食。腌制泡菜还是一种冬季文化：一家腌菜邻里来帮，女性分担腌制、男性收拾地窖，成果共同分享。',
   'In Korean communities such as Yanbian in Jilin, paocai is an indispensable side dish at all three daily meals. Making it is also a winter culture: neighbours help each other, women share the curing, men sort out the cellar, and the results are shared.');

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('luosifen', 'ihchina',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《米粉制作技艺（柳州螺蛳粉制作技艺）》项目页',
   'https://www.ihchina.cn/project_details/23595',
   '2026-09-22', 1),
  ('luosifen', 'xinhua',
   '新华社《镜头微观察｜一碗螺蛳粉「嗦」出百亿大产业》（经柳州市人民政府门户网站转载，2024-12-20）',
   'http://www.liuzhou.gov.cn/sjzt/zxzt/zwzt/dlfzsfjj/lsfcyfz/202412/t20241220_3567476.shtml',
   '2026-09-22', 2),
  ('luosifen', 'chinanews',
   '中国新闻网《只有几十年历史的螺蛳粉，是如何成为国家级非遗的？》（2021-06-12）',
   'https://www.chinanews.com/cul/2021/06-12/9498742.shtml',
   '2026-09-22', 3),
  ('luosifen', 'lzzx',
   '中国人民政治协商会议柳州市委员会网站《柳州螺蛳粉如何出海又「出圈」？——专访广西柳州螺蛳粉技术创新中心岗位专家程昊》（2025-02-23）',
   'http://lzzx.liuzhou.gov.cn/xw/202502/t20250223_3593127.html',
   '2026-09-22', 4);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('lanzhou-beef-noodles', 'ihchina',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《传统面食制作技艺（兰州牛肉面制作技艺）》项目页',
   'https://www.ihchina.cn/project_details/23794/',
   '2026-09-24', 1),
  ('lanzhou-beef-noodles', 'gansu',
   '甘肃省人民政府网站「走进甘肃 · 甘味 · 美食」栏目《兰州牛肉面》',
   'https://www.gansu.gov.cn/gsszf/c100394/201909/162305.shtml',
   '2026-09-24', 2),
  ('lanzhou-beef-noodles', 'ctdsb',
   '楚天都市报（湖北日报传媒集团）《从兰州拉面到青海拉面 变的不仅是一块老招牌》（2026-08-15）',
   'https://ctdsbepaper.hubeidaily.net/pc/content/202608/15/content_355860.html',
   '2026-09-24', 3);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('shaxian-snacks', 'ihchina',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《小吃制作技艺（沙县小吃制作技艺）》项目页',
   'https://www.ihchina.cn/project_details/23591',
   '2026-09-24', 1),
  ('shaxian-snacks', 'fjwlt',
   '福建省文化和旅游厅《福建省第二批省级非物质文化遗产名录项目名单（含国家级）》（2007 年 8 月 28 日省政府公布，第 70 项「沙县小吃制作工艺」）',
   'https://wlt.fujian.gov.cn/zwgk/sjfb/fycx/fwzwhycdbxxmml/202003/t20200319_5219570.htm',
   '2026-09-24', 2),
  ('shaxian-snacks', 'fjysg',
   '福建省数字文化馆（福建省艺术馆）《小吃制作技艺（沙县小吃制作技艺）》项目介绍',
   'https://www.fjysg.net/portal/feiyi/read?id=357&nid=28',
   '2026-09-24', 3);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('mengzi-rice-noodles', 'ihchina',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《蒙自过桥米线制作技艺》项目页',
   'https://www.ihchina.cn/project_details/14760',
   '2026-09-24', 1),
  ('mengzi-rice-noodles', 'dfz',
   '云南省地方志编纂委员会办公室《方志视觉下的红河（第七期）：志载米线香，百年过桥韵——方志味寻蒙自过桥米线》（2026-04-27，中共红河州委党史研究室供稿）',
   'https://dfz.yn.gov.cn/portal/xwxq/a6329477dbf9408a8b5aa354b86df8be/01',
   '2026-09-24', 2),
  ('mengzi-rice-noodles', 'people',
   '人民网－人民日报《过桥米线，从街边灶台走向世界餐桌》（神州看点·一方水土一方味，2026-05-21）',
   'https://yn.people.com.cn/n2/2026/0521/c378439-41586461.html',
   '2026-09-24', 3);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('goubuli-baozi', 'ihchina',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《传统面食制作技艺（天津「狗不理」包子制作技艺）》项目页',
   'https://www.ihchina.cn/project_details/14644',
   '2026-09-24', 1),
  ('goubuli-baozi', 'mofcom',
   '商务部「中华老字号」信息管理平台《十五项中华老字号项目列入第三批国家级非物质文化遗产名录》（商务部流通发展司，2011-08-30）',
   'https://zhlzh.mofcom.gov.cn/news/getNews/18642',
   '2026-09-24', 2),
  ('goubuli-baozi', 'chinadaily',
   '中国日报网《国庆假期快乐生活：来天津一定要吃的狗不理》（转北方网·津云，2019-10-04）',
   'https://cnews.chinadaily.com.cn/a/201910/04/WS5d97f1d7a31099ab995e3af8.html',
   '2026-09-24', 3);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('beijing-roast-duck', 'ihchina-quanjude',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《烤鸭技艺（全聚德挂炉烤鸭技艺）》项目页',
   'https://www.ihchina.cn/project_details/14657',
   '2026-09-28', 1),
  ('beijing-roast-duck', 'ihchina-bianyifang',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《烤鸭技艺（便宜坊焖炉烤鸭技艺）》项目页',
   'https://www.ihchina.cn/project_details/14656',
   '2026-09-28', 2);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('hejian-donkey-burger', 'peopleapp',
   '人民日报客户端《舌尖上的非遗｜有乾隆皇帝「背书」的河间驴肉火烧》',
   'https://www.peopleapp.com/rmharticle/30020734020',
   '2026-09-28', 1),
  ('hejian-donkey-burger', 'hejian-gov',
   '河间市人民政府门户网站《河间驴肉火烧、酥糖、河间刻瓷惊艳「京津冀非遗」联展！》（2020-10）',
   'https://www.hejian.gov.cn/hejian/ADD01673/202010/edf76df2316c4c6192b176325d58fd5a.shtml',
   '2026-09-28', 2),
  ('hejian-donkey-burger', 'hebnews',
   '河北新闻网《全球连线｜河北河间：「舌尖」上的非遗技艺》（2021-11-15）',
   'https://hebei.hebnews.cn/2021-11/15/content_8667443.htm',
   '2026-09-28', 3);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('shanxi-knife-cut-noodles', 'ihchina-mianshi',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《传统面食制作技艺（龙须拉面和刀削面制作技艺）》项目页',
   'https://www.ihchina.cn/project_details/14642.html',
   '2026-09-28', 1),
  ('shanxi-knife-cut-noodles', 'dt-gov',
   '大同市人民政府门户网站《从地方美食升级为城市文化IP——大同刀削面爆火解码系列报道之三》',
   'https://www.dt.gov.cn/dtszf/tzggnr/202608/ad4a04a536314833afb94c567320665c.shtml',
   '2026-09-28', 2),
  ('shanxi-knife-cut-noodles', 'yunzhou-gov',
   '大同市云州区人民政府网站《大同刀削面》（2020-07）',
   'https://www.yunzhou.gov.cn/yzqrmzfz/sqglmzzj/202007/e806464524534484962843b6f738a2f3.shtml',
   '2026-09-28', 3),
  ('shanxi-knife-cut-noodles', 'shanxi-gov',
   '山西省人民政府网站《大同：塞上古都的千年文脉》（2026-04-24）',
   'https://www.shanxi.gov.cn/zjsx/sxfg/cysx/202604/t20260424_10110564.shtml',
   '2026-09-28', 4);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('chagan-idee', 'ihchina-chagan',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《奶制品制作技艺（察干伊德）》项目页',
   'https://www.ihchina.cn/project_details/14750',
   '2026-09-28', 1),
  ('chagan-idee', 'ihchina-chagan-art',
   '中国非物质文化遗产网《文化遗产在传承中焕新：多地奏响保护与创新的时代乐章》（含「内蒙古锡林郭勒盟正蓝旗：奶香飘进现代生活」一节）',
   'https://www.ihchina.cn/art/detail/id/31128.html',
   '2026-09-28', 2);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('chicken-stewed-with-mushrooms', 'ihchina-liaocai',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《辽菜传统烹饪技艺》项目页',
   'https://www.ihchina.cn/project_details/14751',
   '2026-09-28', 1),
  ('chicken-stewed-with-mushrooms', 'ln-swtw',
   '辽宁省商务厅《2024「美市美食」辽宁地标美食评审认定结果公示》（2024-10-29）',
   'https://swt.ln.gov.cn/swt/ywxx/tzgg/2024102916531538698/index.shtml',
   '2026-09-28', 2);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('guo-bao-rou', 'hljszw',
   '中共黑龙江省委史志研究室《道台府的四道传世菜肴的故事》',
   'https://www.hljszw.org.cn/news/2684.html',
   '2026-09-28', 1),
  ('guo-bao-rou', 'xinhua-guobaorou',
   '新华网《新华走笔丨一声「滋啦」里的冰城百年》（2025-11-14）',
   'https://www.news.cn/politics/20251114/bd54df7bb93b450eb17dcd6c1806c8f8/c.html',
   '2026-09-28', 2);

INSERT INTO public.dish_sources (dish_id, source_id, title, url, accessed, sort_order) VALUES
  ('korean-ethnic-paocai', 'ihchina-paocai',
   '中国非物质文化遗产网·中国非物质文化遗产数字博物馆《泡菜制作技艺（朝鲜族泡菜制作技艺）》项目页',
   'https://www.ihchina.cn/art/detail/id/14752.html',
   '2026-09-28', 1),
  ('korean-ethnic-paocai', 'yanji-gov',
   '延吉市人民政府《延吉市非物质文化遗产传承项目名录》（延吉市文化广播电视和旅游局，2023-10-31）',
   'http://www.yanji.gov.cn/yjszfxxgkw/gzbm/cyqsjj/xxgkml/202310/t20231031_436536.html',
   '2026-09-28', 2);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('luosifen', 1, 'ihchina', 1),
  ('luosifen', 2, 'ihchina', 1),
  ('luosifen', 3, 'chinanews', 1),
  ('luosifen', 4, 'ihchina', 1),
  ('luosifen', 5, 'xinhua', 1),
  ('luosifen', 5, 'lzzx', 2),
  ('luosifen', 6, 'ihchina', 1),
  ('luosifen', 7, 'ihchina', 1),
  ('luosifen', 8, 'xinhua', 1),
  ('luosifen', 9, 'xinhua', 1),
  ('luosifen', 9, 'chinanews', 2),
  ('luosifen', 10, 'lzzx', 1),
  ('luosifen', 11, 'lzzx', 1);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('lanzhou-beef-noodles', 1, 'ihchina', 1),
  ('lanzhou-beef-noodles', 2, 'ihchina', 1),
  ('lanzhou-beef-noodles', 3, 'gansu', 1),
  ('lanzhou-beef-noodles', 4, 'ihchina', 1),
  ('lanzhou-beef-noodles', 5, 'ihchina', 1),
  ('lanzhou-beef-noodles', 6, 'ihchina', 1),
  ('lanzhou-beef-noodles', 7, 'ihchina', 1),
  ('lanzhou-beef-noodles', 8, 'ihchina', 1),
  ('lanzhou-beef-noodles', 9, 'gansu', 1),
  ('lanzhou-beef-noodles', 10, 'ctdsb', 1),
  ('lanzhou-beef-noodles', 11, 'gansu', 1);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('shaxian-snacks', 1, 'ihchina', 1),
  ('shaxian-snacks', 2, 'fjwlt', 1),
  ('shaxian-snacks', 3, 'ihchina', 1),
  ('shaxian-snacks', 4, 'ihchina', 1),
  ('shaxian-snacks', 5, 'ihchina', 1),
  ('shaxian-snacks', 6, 'ihchina', 1),
  ('shaxian-snacks', 7, 'ihchina', 1),
  ('shaxian-snacks', 7, 'fjysg', 2),
  ('shaxian-snacks', 8, 'ihchina', 1),
  ('shaxian-snacks', 9, 'fjysg', 1),
  ('shaxian-snacks', 10, 'ihchina', 1),
  ('shaxian-snacks', 11, 'ihchina', 1);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('mengzi-rice-noodles', 1, 'ihchina', 1),
  ('mengzi-rice-noodles', 2, 'ihchina', 1),
  ('mengzi-rice-noodles', 3, 'ihchina', 1),
  ('mengzi-rice-noodles', 4, 'ihchina', 1),
  ('mengzi-rice-noodles', 5, 'ihchina', 1),
  ('mengzi-rice-noodles', 6, 'ihchina', 1),
  ('mengzi-rice-noodles', 7, 'dfz', 1),
  ('mengzi-rice-noodles', 8, 'dfz', 1),
  ('mengzi-rice-noodles', 9, 'dfz', 1),
  ('mengzi-rice-noodles', 10, 'dfz', 1),
  ('mengzi-rice-noodles', 11, 'people', 1),
  ('mengzi-rice-noodles', 12, 'people', 1);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('goubuli-baozi', 1, 'ihchina', 1),
  ('goubuli-baozi', 2, 'mofcom', 1),
  ('goubuli-baozi', 3, 'ihchina', 1),
  ('goubuli-baozi', 4, 'chinadaily', 1),
  ('goubuli-baozi', 5, 'ihchina', 1),
  ('goubuli-baozi', 6, 'ihchina', 1),
  ('goubuli-baozi', 7, 'ihchina', 1),
  ('goubuli-baozi', 8, 'ihchina', 1),
  ('goubuli-baozi', 9, 'chinadaily', 1),
  ('goubuli-baozi', 10, 'ihchina', 1);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('beijing-roast-duck', 1, 'ihchina-quanjude', 1),
  ('beijing-roast-duck', 1, 'ihchina-bianyifang', 2),
  ('beijing-roast-duck', 2, 'ihchina-quanjude', 1),
  ('beijing-roast-duck', 2, 'ihchina-bianyifang', 2),
  ('beijing-roast-duck', 3, 'ihchina-quanjude', 1),
  ('beijing-roast-duck', 4, 'ihchina-quanjude', 1),
  ('beijing-roast-duck', 5, 'ihchina-quanjude', 1);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('hejian-donkey-burger', 1, 'hebnews', 1),
  ('hejian-donkey-burger', 1, 'peopleapp', 2),
  ('hejian-donkey-burger', 2, 'hebnews', 1),
  ('hejian-donkey-burger', 3, 'hebnews', 1),
  ('hejian-donkey-burger', 4, 'hejian-gov', 1),
  ('hejian-donkey-burger', 5, 'peopleapp', 1);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('shanxi-knife-cut-noodles', 1, 'ihchina-mianshi', 1),
  ('shanxi-knife-cut-noodles', 2, 'ihchina-mianshi', 1),
  ('shanxi-knife-cut-noodles', 3, 'ihchina-mianshi', 1),
  ('shanxi-knife-cut-noodles', 4, 'ihchina-mianshi', 1),
  ('shanxi-knife-cut-noodles', 4, 'yunzhou-gov', 2),
  ('shanxi-knife-cut-noodles', 5, 'dt-gov', 1),
  ('shanxi-knife-cut-noodles', 5, 'yunzhou-gov', 2);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('chagan-idee', 1, 'ihchina-chagan', 1),
  ('chagan-idee', 2, 'ihchina-chagan', 1),
  ('chagan-idee', 2, 'ihchina-chagan-art', 2),
  ('chagan-idee', 3, 'ihchina-chagan', 1),
  ('chagan-idee', 4, 'ihchina-chagan', 1),
  ('chagan-idee', 5, 'ihchina-chagan', 1),
  ('chagan-idee', 5, 'ihchina-chagan-art', 2);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('chicken-stewed-with-mushrooms', 1, 'ln-swtw', 1),
  ('chicken-stewed-with-mushrooms', 2, 'ihchina-liaocai', 1),
  ('chicken-stewed-with-mushrooms', 3, 'ihchina-liaocai', 1),
  ('chicken-stewed-with-mushrooms', 4, 'ihchina-liaocai', 1),
  ('chicken-stewed-with-mushrooms', 5, 'ihchina-liaocai', 1);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('guo-bao-rou', 1, 'hljszw', 1),
  ('guo-bao-rou', 1, 'xinhua-guobaorou', 2),
  ('guo-bao-rou', 2, 'hljszw', 1),
  ('guo-bao-rou', 3, 'hljszw', 1),
  ('guo-bao-rou', 4, 'hljszw', 1),
  ('guo-bao-rou', 5, 'xinhua-guobaorou', 1);

INSERT INTO public.dish_fact_sources (dish_id, fact_seq, source_id, sort_order) VALUES
  ('korean-ethnic-paocai', 1, 'ihchina-paocai', 1),
  ('korean-ethnic-paocai', 2, 'ihchina-paocai', 1),
  ('korean-ethnic-paocai', 3, 'ihchina-paocai', 1),
  ('korean-ethnic-paocai', 4, 'ihchina-paocai', 1),
  ('korean-ethnic-paocai', 5, 'ihchina-paocai', 1);

SELECT 'regions' AS tbl, count(*) AS rows_now, 34 AS rows_want FROM public.regions
UNION ALL SELECT 'dishes', count(*), 12 FROM public.dishes
UNION ALL SELECT 'dish_aliases', count(*), 108 FROM public.dish_aliases
UNION ALL SELECT 'dish_facts', count(*), 90 FROM public.dish_facts
UNION ALL SELECT 'dish_sources', count(*), 33 FROM public.dish_sources
UNION ALL SELECT 'dish_fact_sources', count(*), 101 FROM public.dish_fact_sources
ORDER BY 1;
