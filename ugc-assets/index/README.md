# image-by-id.csv —— 图片资产索引表规范

本目录存放千星奇域客户端 UI 图片资产的规范化索引表，把「素材文件」与「人工标注」合成一张便于查找的表。

## 文件

| 文件 | 说明 |
|---|---|
| `image-by-id.csv` | 主表，UTF-8 with BOM，Excel/WPS 可直接打开 |
| 生成脚本 | `C:\ugc\MiliastraCodeAgent\Tools\gen_image_by_id_csv.py` |
| 接触表脚本 | `C:\ugc\MiliastraCodeAgent\Tools\contact_sheet.py`（看图核对用） |

已标注批次：

| 批次（类别） | ID 区间 | 入表条数 | 说明 |
|---|---|---|---|
| 功能图标-单色 | 100101–100213 | 113 | 纯白单色功能图标；**可染色** |
| 功能图标-彩色 | 101001–101080 | 75 | 深色圆底+彩色符号的圆形功能按钮；**101019 / 101029 / 101047 / 101049 / 101055 五个 ID 在 `data.json` 里 `img`、`border` 均为空串（素材不存在），未入表** |
| 玩法图标-单色 | 102001–102052 | 52 | 浅色近白玩法/元素/阵营图标（元素纹、属性、材料、机关棋谭旗帜等）；虽是"单色"批但标注 `tint: forbid`，**不可染色**，须压深色底衬 |
| 玩法图标-彩色 | 103001–103148 | 148 | 彩色玩法图标：元素增益、状态增益/减益、抗性盾、作战特性、塔防卡、奖章、UGC 类型符号等；**不可染色** |

合计 388 行。

## 表头（固定 13 列，顺序即规范）

| 列 | 含义 | 取值规范 |
|---|---|---|
| `ID` | 图片资产 ID | 绑定图片控件用。文件 `sprite/<ID>.png`，元数据 `border/<ID>.json` |
| `类别` | 编辑器分类 | 取 `data.json` 的 category 编号 → `ClientUIAnimationEditor/i18n/zh-cn.json` 中文名。当前词表：功能图标-单色/彩色、玩法图标-单色/彩色、装饰图案-单色/彩色、底板-单色/彩色、基础形状、分隔线、特殊字符、技能天赋、道具、造物 |
| `主题` | 语义主题 | `通用`（common）、`UGC`（ugc）、`活动-xxx`（*_event）。出现地区素材时按地区名记（如 `蒙德`）；未登记词按原文保留并标注 |
| `风格` | 作图方式与元素 | 自然语言三段：`<主色调>；<作图方式>；图形元素：<中文名>（原标签）`。**主色调由 PNG 不透明像素统计得出**（量化后取比例最高的若干色，附真实均值 hex 与占比），如 `近黑底（#313131，85%） + 亮黄（#FECB32，9%）`；单色图标即 `白（#FFFFFF）`。色名由色相+明度命名（`亮黄`/`暗蓝`/`深灰`/`近黑`…） |
| `视觉描述` | 图片内容 | 自然语言，合并标注的 `desc` 与 `visual_summary`，按「是什么 → 画面构成」叙述。**摘要若只是换个说法重述 desc 则不追加**（标注里有套话句式如「…以紧凑居中的功能符号呈现，主轮廓、内部标记和局部色层清楚」，以及剥离共有词后残留不足 18 字者，判定为无新信息，共 9 条被丢弃） |
| `缩放类型` | 拉伸形态 | 由 `border/<ID>.json` 的 `m_Border` 判定：**不可缩放**（无九宫格边距，187 条）/ **三宫格**（仅单轴非零）/ **九宫格**（双轴非零，100182 一条）。注意「不可缩放」指不可自由拉伸，等比缩放能力由「可缩放」列表达 |
| `使用建议` | 使用场景 | 自然语言：用途（ui_role + 功能标签）+ 放置（图层/锚点/父级）+ 配对与遮挡 + 拉伸要求 + 裁切与命中要求 |
| `原尺寸` | 编辑器处理尺寸 | **取 `m_Rect`（设计框），不是 PNG 像素**。附带 `内容 m_RD.textureRect` 与 `位图 PNG` 两个尺寸供比对 |
| `可染色` | 是否支持着色 | `是`：`tint_policy` 为 `safe_monochrome_tint` / `允许整体单色着色`（功能图标-单色 113 条）；`否`：`tint: forbid` / `preserve_authored_color` / 保留原有配色（彩色批 75 条、玩法图标-单色批 52 条） |
| `可缩放` | 是否可缩放 | `是`：`resize_policy` 为等比策略（`uniform_only` / `uniform_scale` / 等比缩放…） |
| `可旋转` | 是否可旋转 | `是` / `否`；标注未给该维度时记 `未标注（按图标默认不可旋转）`（80 条，均属功能图标-单色批的 `overrides` 形态） |
| `可平铺` | 是否可平铺 | `是` / `否`；标注未给时记 `未标注（按图标默认不可平铺）` |
| `可遮罩` | 是否可作遮罩 | `是` / `否`（来自 `render.mask_compatible`）；该形态标注未给时记 `该批未给`（160 条 `facts` 形态均无 `render` 字段） |

## 数据来源（以 assetID 关联）

| 来源 | 用到的字段 |
|---|---|
| `CustomUIImage/data.json` | `imageData[id].img/.border`（文件索引）、`category[].images`（类别编号） |
| `ClientUIAnimationEditor/i18n/zh-cn.json` | 类别编号 → 中文名 |
| `CustomUIImage/border/<id>.json` | `m_Rect`（原尺寸/设计框）、`m_Border`（宫格形态）、`m_RD.textureRect`（内容尺寸）、`m_Pivot`、`m_PixelsToUnits` |
| `Tools/Image_sample_by_id.json` | `facts.*`（扁平形态）或 `overrides.*`（嵌套形态）：语义、风格、约束、拼装指引 |

判定说明：编辑器读取尺寸的逻辑在 `site/js/app.<hash>.js` 模块 36759 —— 由 `m_Rect` 得到 width/height，由 `m_Border` 得到九宫格边距，`m_PixelsToUnits` 得像素单位比。

## 词表（便于查找，扩展批次时在此追加）

- **类别**：见上表，源文件 `i18n/zh-cn.json`
- **主题**：`common`=通用、`ugc`=UGC、`*_event`=活动-xxx（脚本内 `THEME_CN` 已登记 40 个活动主题）
- **作图方式**（`fill_style`）：中文原文直接采用；英文标识与短语查 `FILL_CN` / `FILL_TOKEN_CN` 逐词中文化（如 `dark_disc_with_colored_glyph` → 深色圆底+彩色字形，`solid_stroke` → 实心粗笔画）。已登记：实心块面、实心粗笔画、实心块面+透明负形镂空、白色实心、白色描边空心(+斜杠)、实心分离构件、实心字形、描边外框+字形/构件、白色转角笔画、扁平单色/描边/填充 等
- **图形元素 / 标签**：标注原文标签统一记为 `中文名（原标签）`，双语都可检索。统一查找表 `ZH_ALL` 由 `TERM_CN` / `FUNC_CN` / `STYLE_CN` / `UI_ROLE_CN` / `LAYER_CN` / `ANCHOR_CN` / `SUBCAT_CN` / `PARENT_CN` / `PAIR_CN` 合并而成；未登记的新标签会保留原样输出，发现后补进对应词表
- **色名**：由 RGB 转 HSV 后命名 —— 饱和度 <0.18 按明度分「白/浅灰/中灰/深灰/近黑/黑」，其余按色相（红/橙红/橙黄/黄/黄绿/绿/青绿/青/蓝/蓝紫/紫/品红）加明度前缀（`亮`/`暗`/`深`）
- **作图方式**（`fill_style`）：中文原文直接采用；英文标识与短语查 `FILL_CN` / `FILL_TOKEN_CN` 逐词中文化（如 `dark_disc_with_colored_glyph` → 深色圆底+彩色字形，`solid_stroke` → 实心粗笔画）
- **父级要求**：`PARENT_CN` 登记全部 47 种英文表述（`external hit target when interactive` → 交互时需外部点击目标 等）；未登记的整句保留原文，不臆改
- **遮挡约束**：`keep_xxx_visible` 类标识由 `OCCLUSION_TOK` 规则生成中文（`keep_ring_opening_visible` → 保持圆环开口可见）
- **底衬与并列对象**：`dark_property_backplate` → 深色属性底衬、`monster_chess_faction` → 机关棋谭阵营、`ugc_bag_tabs` → UGC 背包页签 等已登记在 `PARENT_CN` / `PAIR_CN`
- **子类**：`SUBCAT_CN` 已登记四批出现的 106 种标识
- **元素与玩法术语**：七元素（`pyro`火/`hydro`水/`cryo`冰/`electro`雷/`dendro`草/`anemo`风/`geo`岩）、状态与特性（`aoe_feature`范围效果特性、`tower_life_card`塔生命卡 等）已登记在 `TERM_CN` / `FUNC_CN`

## 视觉核对

两批均已用 `contact_sheet.py` 拼接触表逐格比对，标注与图片一致；接触表存在 `C:\ugc\MiliastraCodeAgent\Tools\Output\`：

| 接触表 | 内容 |
|---|---|
| `contact_sheet_100101_100213.png` | 113 个功能图标-单色 |
| `contact_sheet_101001_101080.png` | 101xxx 全部 80 格，其中 5 个空位即素材缺失的 101019 / 101029 / 101047 / 101049 / 101055 |
| `contact_sheet_102001_102052.png` | 52 个玩法图标-单色（元素纹、属性、材料、机关棋谭旗帜等），逐格与标注比对一致 |
| `contact_sheet_103001_103148.png` | 148 个玩法图标-彩色（元素增益、状态、抗性盾、特性、塔防卡、奖章等），逐格与标注比对一致 |

```
python C:\ugc\MiliastraCodeAgent\Tools\contact_sheet.py 101001 101080 out.png
```

## 扩展其他批次

目标文件已有内容时加 `--append`：保留原行、按 ID 合并排序，同 ID 以新生成的覆盖；整批重跑时再加 `--replace-range`，会先删掉落在 `--from/--to` 区间内的旧行。

```powershell
$out = "C:\ugc\ClientUIAnimationEditor\site\ugc-tool-data\Public\CustomUIImage\index\image-by-id.csv"

# 单个批次
python C:\ugc\MiliastraCodeAgent\Tools\gen_image_by_id_csv.py --from 103001 --to 103148 --append --out $out

# 整批重跑（清掉该区间旧行再写入）
python C:\ugc\MiliastraCodeAgent\Tools\gen_image_by_id_csv.py --from 102001 --to 102052 --append --replace-range --out $out

# 全部 1543 条（会包含无标注条目，填充「（未标注）」）
python C:\ugc\MiliastraCodeAgent\Tools\gen_image_by_id_csv.py --all --out $out
```

类别编号与区间对应（来自 `data.json`）：3=100101–100213（113 ✅）、4=101001–101080（80，其中 5 个无素材 → 入表 75 ✅）、15=102001–102052（52 ✅）、16=103001–103148（148 ✅）、5=104001–104010（10）、6=105001–105317（317）、1=106001–106096（96）、2=107001–107402（392）、18=108001–108020（20）、7=109001–109075（75）、17=110001–110053（53）、9=111001–111139（139）、12=112001–112042（42）、8=100001–100006（6，基础形状）。

注意：`--all` 会包含标注文件中没有记录的条目，这些行填 `（未标注）`。建议按批次逐段核对后追加。
