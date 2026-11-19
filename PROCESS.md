# 跑一遍「找需求 → 上站」的完整过程记录

> 方法来源：抖音 @knit网站出海《做网站怎么找需求 完整找需求到上站流程》。
> 视频 107 秒，已完整转写（whisper-large-v3，47 段），四步：**找需求 → 模仿竞品开发 → 外链 + 社媒 → 重复 1–2 个月**。
> 本文只做一件事：把前两步按他说的顺序真跑一遍，产出一个能打开的站。
> 记录日期：2026-11-20。

---

## 0. 先把视频里的方法抠出来

原话（转写稿摘录）：

| 步骤 | 原话要点 |
|---|---|
| 1 找需求 | 「我的需求都是通过 **Toolify 加 Codex** 完成的。在 Toolify 里找到头部的 AI 出…然后去**拆解他们的产品和功能**，拆解完以后再通过产品的**光量词**（关键词）去谷歌搜索，**查看竞品的竞争程度**，去进一步敲定项目是否可行。」 |
| 2 开发 | 「不要盲目让 AI 写代码，一定要做**竞品调研**…尽量去模仿那些已经成功的工具站点，这样你才会符合外面用户的阅读习惯和审美习惯。」 |
| 3 运营 | 「第一个做外链…我自己整理了差不多上千个外链，通过竞品分析得来的；第二个做好**社媒运营**。」 |
| 4 重复 | 「持续去做，大概做那么一两个月，就会形成第一单。」 |

他自己说做了 60+ 站点、46 个站产生付费，主力是订阅费，形态是**套壳 API 站**。

一句话总结他的方法论：**在聚合站里找已被验证的品类 → 拆它的功能 → 用关键词查竞争度 → 抄成功站的结构做一个更窄的工具 → 铺外链和社媒等自然流量。**

---

## 1. 找需求：Toolify 这一步实际遇到什么

Toolify 是可用的入口，但在这台机器上 `toolify.ai` 直接返回 **Cloudflare 挑战页**（`403 / Just a moment...`），
curl 与无头浏览器都一样。所以第 1 步的「翻 Toolify 榜单」我改用两条可复现的替代路径：

- **Google 自动补全挖词**（可脚本化、有真实搜索意图，比看榜单更接近需求本身）
- **精选品类词的 SERP 竞争度**（看谁在排，是新站还是融资 SaaS）

### 1.1 自动补全挖词

用 12 个种子词 × 26 个字母做前缀扩展，过滤掉不含种子词的噪声，得到 **1555 条真实联想词**，落在 `data/autocomplete_all.json`（已随仓库提交前删除，脚本见下）。

种子词：`explainer video / math video / physics video / textbook / lesson video / whiteboard animation / science video / education video ai / pdf to video / manim / ai video lecture / study video`

其中带工具意图（calculator / generator / maker / tool / software / converter）的有 **143 条**，分布很说明问题：

```
pdf to video …            17 条变体（ai / converter / free / maker / online / lecture / slideshow / brainrot…）
whiteboard animation …    28 条变体
explainer video …         17 条变体
study video …             11 条变体
manim …                    8 条（ai generator / animation generator / video generator / free / software / tool）
math video …               5 条
science video …            3 条
```

**读法**：`pdf to video` 和 `whiteboard animation` 的变体密度 = 已经被打烂的红海；
`manim` 下面出现了 `manim ai generator`、`manim video generator` 这类词，但变体少、且明显是技术人群措辞——**需求存在，供给没铺满**。

补充挖到的、正好是「硬核数理 + 视频」交叉带的词：

```
math equation overlay / math overlay transparent video / math video overlay
formula animation / math formula animation / manim formula animation
physics formula animation
animate equations / animate math equations / manim animate equations
```

### 1.2 竞争度：把词丢进搜索看谁在吃

引擎可用性先测了一轮（这决定了后面能不能复现）：

| 引擎 | 结果 |
|---|---|
| Google | 程序化请求 → `sorry/index` 人机验证；无头浏览器同样被挡 |
| Bing | 能返回 HTML，但中英文 locale 混着来，结果被 "MINI 汽车 / 纽约时报 Mini 填字" 污染，**不可用** |
| DuckDuckGo html | 302 / 202，拿不到结果 |
| Startpage / Mojeek / SearXNG 公共实例 | 全部 Anubis 验证或 429 |
| **Brave Search** | **可解析**（`class="snippet"` 块），限速明显，约 5–8 秒一次才不被 429 |

所以就以 Brave 为准，采样了几组词。关键观察：

- `math formula animation maker` → 首屏是 **Leadde AI**（`leadde.ai/home/math-animation-maker`）这类通用 AI 视频工具拿 SEO 落地页来抢词，不是专业数学动画产品。
- `animate latex equation` → 首屏是 **Reddit r/math 提问帖、TeX StackExchange 技术问答、YouTube 教程**。**没有任何一个 SaaS 产品在正经吃这个词。**
- 进一步直接去看已知玩家：
  - **Plotexa**（`plotexa.com`）——浏览器里的可视化数学动画编辑器，定位清楚，但**定价是卢比**（₹0 / ₹499 / ₹999），功能表里 "Cloud MP4 Rendering / API Access / AI Voice" 全标 **Upcoming**，说明产品还早。
  - **DistilBook**（`distilbook.com`）——PDF/教材章节 → 讲解视频，$20/$50/$100 月付，$14/$35/$70 年付，做得很成熟，**但它是"整段视频生成"，不是"给我一段能贴进我自己片子里的公式动画"**。
  - 还有 Atlabs、Halomind、scholarly.so 的 chapter-to-video，全是同一个方向：**文档 → 一条完整讲解视频**。

### 1.3 定档

| 候选 | 需求信号 | 竞争 | 判断 |
|---|---|---|---|
| PDF → 讲解视频 | 极强（17+ 变体） | DistilBook / Atlabs / Leadde / Halomind，均已融资或成熟 | ✗ 打不动 |
| 白板动画 | 强（28 变体） | Doodly / Renderforest 等老牌 | ✗ |
| **公式动画 → 透明素材** | 中（多组长尾词，工具词稀疏） | **首屏是论坛帖和技术文档，无产品** | ✓ **就它** |

**选的缝**：不是"帮我生成一条科普视频"，而是**"把这段推导变成一条能盖在我自己画面上的公式动画"**。
理由三条：

1. 需求真实且具体——做硬核科普的人几乎都自己在剪片子，缺的从来不是"整条视频"，是**中间那 5 秒的公式特写**。
2. 竞争几乎为零——搜这个词出来的是 Reddit 求问和 TeX 问答，说明**很多人在找，没人做产品**。
3. 技术上做得动——纯前端，无后端、无 API key、无渲染队列，**一天能上线**（这正好对上视频里"套壳也能收钱"的现实：先有站，再有收费）。

---

## 2. 开发：模仿谁、抄什么

视频说「尽量去模仿已经成功的工具站点…符合用户的阅读习惯和审美习惯」。拆了三个对标：

| 站点 | 抄什么 | 不抄什么 |
|---|---|---|
| DistilBook | 定价页的信息密度：档位表 + credits 解释 + FAQ 长尾（"credits 会不会滚存"） | 它的产品形态（整段视频） |
| Plotexa | 首页能力罗列方式：定时器式编辑器 + "可以做什么"的场景清单 | 卢比定价、以及一堆 Upcoming 功能 |
| Leadde | 用**单个具体功能**做 landing page 去抢长尾词（`/math-animation-maker`） | 它的通用 AI 视频外壳 |

**结构上的取舍**：
- 一屏之内给到**能跑的东西**（不是"注册后可用"），因为这类工具站的自然流量大多来自"我现在就要一个"。
- 明码承诺 **no upload / no account**——这是和 DistilBook 那类云渲染产品的差异点，也是隐私上真实的实话（真的一点不上传）。
- 定价页先不做：**还没有收费能力，先不摆假价目表**（视频里也是先有站、后出单）。

### 2.1 做出来的东西

一个叫 **EquationMotion** 的纯前端页面：

- 输入：一行一条的 LaTeX（或纯文本，自动包 `\text{}`）
- 渲染：MathJax 把每行排成 SVG 路径 → 逐字形按阅读顺序擦出，得到"手写"式的 write-on
- 控制：write-on / fade / slide 三种揭示；累积 or 逐条替换；字号、时长、背景、强调色、宽高比
- 导出：**透明 PNG 逐帧（ZIP）** / WebM / GIF / 单帧海报
- 分享：状态压进 URL hash，链接即存档

技术实现里有两个坑值得记一笔：

1. **`DOMMatrix` 不认 SVG 的 `transform` 属性语法**。MathJax 输出的 `<use transform="translate(1028,0)">` 直接喂给 `new DOMMatrix()` 会抛 `Failed to parse`，而且是被 try/catch 吞掉后表现为**整页空白**。改成自己写一个 `translate/scale/rotate/skew/matrix` 的解析器才对。
2. **镜头不能放大到 1:1 以上**。最初的"自动缩放塞满画面"会让第一行字被放得比用户设定的字号还大，看起来像 bug。改成只缩不放。

### 2.2 导出格式，是实测不是声称

| 格式 | 真有 alpha？ | 实测依据 |
|---|---|---|
| PNG 序列（ZIP） | **是，8-bit** | 导出的 PNG `colortype=6`（RGBA），透明像素占 **98.9%** |
| WebM | **否** | `MediaRecorder` 出来的 `pix_fmt=yuv420p`，背景被烘进去；页面文案已改成实话 |
| GIF | 1-bit | 用底色抠的，不是真 alpha |
| 海报 PNG | 是 | 同 PNG 序列 |

页面 FAQ 里那句 "WebM 用来导出带 alpha 的单文件" 是错的，已经在第一次实测后改掉——**这类"看起来对"的文案，是这个品类最容易翻车的地方之一**。

### 2.3 顺手铺的 SEO 长尾

三篇 guide，各自对应一个已经确认有人在搜、且搜索结果里没有产品的意图：

- `/guides/animate-latex-equation/` —— "how to animate a latex equation"（含 HowTo 结构化数据）
- `/guides/transparent-equation-overlay/` —— "transparent equation overlay"，顺手解释了 MP4 为什么没有 alpha
- `/guides/manim-alternative-browser/` —— "manim without python / browser"，接住 manim 系长尾

加上 `sitemap.xml`、`robots.txt`、canonical、OG 图。

---

## 3. 上线

| 项 | 值 |
|---|---|
| 站点 | **https://xiaoqiangch.github.io/equationmotion/** |
| 代码 | https://github.com/xiaoqiangch/equationmotion |
| 托管 | GitHub Pages（`gh-pages` 分支，静态，免费） |
| 后端成本 | 0（无服务器、无 API、无队列） |
| 构建 | `python3 build.py /equationmotion/` 把根绝对路径改成 base path |

已逐条验证返回 200：首页、3 篇 guide、`sitemap.xml`、`robots.txt`、`app.js`、`style.css`、`favicon.svg`。

线上实测过的完整闭环（不是本地假设）：
1. 打开页面 → 默认 demo（欧拉恒等式 5 步）直接渲染出成片帧
2. 切透明背景 → 变棋盘格
3. 点 Export frames → 下载 361 帧 1920×1080 的 ZIP（23 MB），抽出帧用 ffmpeg 合成 12 秒 MP4 正常
4. 点 Export WebM → 394 KB、VP9、1920×1080、14 秒
5. 点 Save still → 1920×1080 RGBA PNG

---

## 4. 视频里没跑的部分（说清楚）

| 步骤 | 状态 |
|---|---|
| 找需求 | ✅ 跑了，换了 Toolify（被 Cloudflare 挡）→ 自动补全 + Brave SERP |
| 竞品拆解 | ✅ 拆了 Plotexa / DistilBook / Leadde |
| 模仿开发 | ✅ 上线了一个真能用的站 |
| 定价页 / 收费 | ❌ 没做。还没有收款链路，摆价目表是假的 |
| 外链 | ❌ 没做。需要真实投放，不是一次会话能造的 |
| 社媒 | ❌ 没做。同理 |
| 等 1–2 个月出单 | ❌ 不是这次能验证的 |

**所以这次跑完的是"找需求 → 敲定 → 上站"这一段**，也就是他视频里前两步 + 上线。
后面三步是运营动作，需要真实投放和外链名单，只能由你（或者排期任务）持续做。

---

## 5. 如果继续，下一步按顺序

1. **先验证有人用**：把站点丢到 Reddit 的 `r/math`（那两条帖子里就在问这个）、`r/Physics`、`r/edtech`，以及 TeX StackExchange 相关问答下做真实回答 —— 这是零成本的需求二次验证。
2. **定价**：等有一两个人在问"能不能批量/能不能去水印"，再上 $9/月 或 $29 买断的轻档位。这个品类的付费点很明确：批量导出 + 去水印 + 保存项目。
3. **外链**：从竞品反查（DistilBook 的 `/tools/*` 页面、Plotexa 的目录收录），找 AI 工具目录站逐条投递——这就是视频里说的"通过竞品分析得来的外链名单"。
4. **换主词**：靠 `equation overlay` 这类词自然排名很慢，更快的入口是**做 20 个具体公式的示例页**（泰勒展开、薛定谔方程…），每个页面就是一个真实的长尾入口。

---

*附：挖词脚本逻辑（可复现）*
```python
# Google autocomplete，无需 key
GET https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=us&q=<seed>
# 返回 JSON：[query, [suggestions...]]
```
