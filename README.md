# 奇思科创社官网 · 技术交接文档

> 本文件是**唯一真相来源**。所有关键决策、踩过的坑、红线都已固化在这里。
> 换人、换会话、上下文丢失，只要读到这个文件就能完全恢复，无需复述任何背景。

---

## 0. 给接手的人：如何快速恢复上下文

如果你是 AI 助手或新接手的同学，**先读完本文件再动手**。

粘贴这段作为开场白即可恢复全部上下文（路径按需调整）：

```
我们正在为揭阳一中「奇思科创社」搭建招新官网。动手前请先读这三个地方恢复上下文：
1. qisi-site/README.md  ← 本文件，含全部技术决策、红线和踩坑清单
2. 奇思科创社官网建设方案.md  ← 完整方案与设计取舍
3. qisi-site/public/  ← 现有站点代码

读完再操作。特别注意 README 里标「红线」的条目——那些是踩过坑才定下来的，不要凭常识推翻。
```

---

## 1. 项目一句话

揭阳一中「奇思科创社」2026 招新官网，纯静态多页站点，托管在 **Cloudflare Workers（Static Assets）**，自有域名 `cheers.aectn.top`，通过**优选 IP + Worker 路由**实现国内相对可用的访问。零成本。

## 2. 为什么这么选（决策经过，不要重蹈覆辙）

| 决策 | 结论 | 原因 |
| --- | --- | --- |
| 托管载体 | **Workers Static Assets**，不用 Pages | Pages 绑定域名只能走 Custom Domain，解析终点是 CF 控制的 `<project>.pages.dev`，**无法自选 IP → 做不了优选**。Workers 用 Route 模式则由你自控 DNS |
| 不用 GitHub Pages | ❌ | 若用 Worker 反代 GH Pages，每请求都要 invoke Worker 代码，白白吃掉配额；还多一跳回源 |
| 不用 Pages + 反代 | ❌ | 同上，反代 Pages 也一样计数，等于用浪费换复杂 |
| 不做 ICP 备案 | ✅ 定案 | 社团实名认证不好走，确定不用国内服务 |

## 3. 🚫 红线（这几条踩过，别改）

1. **DNS 记录必须灰云（DNS only）**。橙云一开，CF 忽略你填的 IP，优选彻底失效。
2. **必须用 Routes，不能用 Custom Domains**。后者强制走代理，白做。路由规则**末尾必须带 `/*`**。
3. **绝对不要加 `run_worker_first = true`**，也不要写「每个请求都跑一遍」的全站中间件。一旦加了，所有请求开始 invoke Worker 代码，"静态请求免费无限"的优势立刻归零。
4. **HSTS / 缓存头写在 `_headers` 文件里**，不要试图在 Worker 响应头里加（静态资源直出不经过 Worker）。
5. **不要为此开 `run_worker_first` 去实现 HTTP→HTTPS 跳转**。跳转改用 HSTS 方案（见第 5 节）。
6. **操作时只动 `cheers` 这一条 DNS 记录**。`aectn.top` 这个 zone 上还有别的服务。

## 4. 配额真相（重要，容易误解）

**判据是「请求有没有执行 Worker 代码」，不是「数据放在哪里」。**

| 场景 | 计数 |
| --- | --- |
| 命中 assets 的 HTML/CSS/JS/图片 | **0**（本项目全部请求属于这一类） |
| 落到 `404.html` | **0** |
| Worker 反代任何目标（哪怕目标是 CF 自己的 pages.dev） | 计 1 |
| `run_worker_first = true` | 全部计 |

> 一句话：**免费的不是"CF 上的数据"，是"没有跑代码的请求"。**
> 本项目实际配额消耗 **≈ 0**。

## 5. 部署配置

**三种上传方式，选一条走，不要混用**

| 方式 | 适合场景 | 需要本地环境 |
| --- | --- | --- |
| **A. 控制台上传文件夹** | 最快，先上线看效果 | 不需要 |
| B. wrangler 命令行 | 需要本地预览调试 | 需要装 Node |
| C. Workers Builds 连 Git | 社团长期维护，推 Git 自动上线 | 不需要 |

> 🚩 **A 和 B 不要混用**：一旦用 wrangler 推过一次，控制台的上传入口会消失（社区反馈是单向转换）。
> 建议路线：**先用 A 快速验证效果 → 正式维护时新建项目走 C**，把旧的删掉。

> 走方式 A 时**用不到 `wrangler.toml`**，那个文件是给方式 B / C 用的。走 A 的话所有配置都在控制台界面里完成。

**Worker 配置（`wrangler.toml`，站点根目录）**

```toml
name = "qisi-site"
compatibility_date = "2026-09-25"

[assets]
directory = "./public"
not_found_handling = "404-page"
```

### 方式 A：控制台上传文件夹（推荐先走这条，2 分钟，不用装任何东西）

1. Cloudflare 控制台 → **Workers & Pages** → **Create**
2. 创建方式里选 **「Upload your static files」**（上传你的静态文件）
3. 把整个 **`public` 文件夹**拖进去 —— 注意是拖**文件夹本身**，
   而不是把里面的 html 一个个选上，否则目录结构会丢失
4. Worker 名字填 `qisi-site`，点 **Deploy**
5. 部署完会得到一个 `https://qisi-site.<随机>.workers.dev` 地址，先打开验证 5 个页面

> ⚠️ 上传的是 `public/` **里面的内容**（index.html 必须在根目录），
> 不要连 `public` 这一层一起传进去，否则会变成 `xxx.dev/public/index.html`。

### 方式 B：wrangler 命令行（适合需要本地预览调试）

**从零上线的完整步骤**

```bash
cd qisi-site

# 1. 安装 wrangler（当前沙箱环境装不上，需在本地执行一次；
#    不想装也可以把下面所有 npx wrangler 换成 npx wrangler@latest 直接跑）
npm install

# 2. 登录 Cloudflare
npx wrangler login

# 3. 本地预览（可选，验证样式和交互）
npx wrangler dev        # 或 npm run dev

# 4. 正式部署
npx wrangler deploy     # 或 npm run deploy
```

首次部署会问你选择账号、是否创建 Worker，按提示确认即可。成功后会返回一个 `*.workers.dev` 预览地址。

**5. 自检**：打开 workers.dev 地址，确认 5 个页面都正常、样式没丢、手机宽度下导航正常。

**6. 绑域名**：按下面的 DNS + 路由 + 证书流程走。

> **替代方案**：在 CF 控制台用 **Workers Builds** 连接 Git 仓库，**构建命令留空、输出目录填 `public`**。配好后每次推 Git 自动部署（约 40 秒），适合交给社团同学维护。
> 两种方法可以共存，但不要同时对同一个 Worker 用，避免互相覆盖。

**DNS 记录（CF 控制台 → DNS）**

| 类型 | 名称 | 目标 | 代理状态 |
| --- | --- | --- | --- |
| CNAME | `cheers` | 优选域名 | **灰云** 🚩 |

**CNAME 目标怎么选：优选域名 vs 自己测 IP**

| | 第三方优选域名 | 自己测优选 IP |
| --- | --- | --- |
| 维护 | 对方持续更新，你不用管 | **IP 会失效**，需定期重测并手动改 DNS |
| 覆盖面 | 通常做了多运营商优化 | 只优化你测的那条线路，别的运营商可能很差 |
| 依赖 | 依赖第三方，可能停服 | 完全自控 |
| 上手 | 填个域名就行 | 需要测速工具和知识 |
| 风险性质 | 第三方停服 → 站点打不开 | IP 劣化 → 变慢 |

> ⚠️ **重要认知**：**不存在「大厂的优选域名」**。Cloudflare 官方不提供这项服务（官方的国内节点是企业付费产品，需备案、签合同，免费计划拿不到）。
> 市面上的优选域名**全是社区或个人维护的**，所以选择时要按下面的标准筛，别因为「看起来像官方」就信任。

**筛选择优服务的 4 条标准**
1. 维护者近期还在更新（社区活跃、有更新记录）
2. 公开说明原理和 IP 来源，不藏着掖着
3. 提供备用域名，避免单点
4. 能用 `nslookup 优选域名` 查到它返回什么 IP，然后**自己再测一遍这些 IP 的延迟**（不盲信）

**推荐策略：双保险**
- **日常用优选域名**（省心，有人维护）
- **自己测 2–3 个可用的 IP 记在本文档下方**，作为域名服务失效时的应急档
- 切换只需改一条 DNS 记录，约 1 分钟

**自建 IP 的测试建议**（作为备份时）
- **测你同学的网络，不是你自己的** —— 目标用户是揭阳一中的同学，广东移动/电信为主
- 让 2–3 位不同运营商的同学分别 ping，取共同表现好的 IP
- 测出的 IP 连同日期记在下面，方便日后对比

**应急 IP 备份记录**

| 记录日期 | IP | 测试人/网络 | 延迟 | 备注 |
| --- | --- | --- | --- | --- |
| | | | | |

### 🔤 Cloudflare 控制台路径对照（中文界面）

> 账号界面语言是**中文**，但 Cloudflare 中文界面是中英混排的：
> 产品名（`Workers & Pages`、`DNS`、`SSL/TLS`）通常保持英文，只有菜单项翻译。
> 名字对不上时看**位置和图标**即可。

| 要找的东西 | 中文界面路径 | 英文原名 |
| --- | --- | --- |
| 创建 Worker | Workers 和 Pages → **创建** | Workers & Pages → Create |
| 上传静态文件 | 创建 → **上传静态文件** | Upload your static files |
| DNS 记录 | **DNS** → **记录** | DNS → Records |
| 证书 | **SSL/TLS** → **边缘证书** | SSL/TLS → Edge Certificates |
| Worker 路由 | Workers 和 Pages → 选项目 → **设置** → **域和路由** | Settings → Domains & Routes |
| 访问统计 | **Web 分析** | Web Analytics |
| 账号首页 | **账户主页** | Account Home |

**三种比记路径更靠谱的找法**

1. **控制台顶部搜索框**：输入 `certificate`、`dns`、`worker` 直接跳，不用记路径
2. **直接访问 URL**（不受界面语言影响，`<账户ID>` 换成控制台地址栏里那串字符）：
   ```
   https://dash.cloudflare.com/<账户ID>/aectn.top/dns/records
   https://dash.cloudflare.com/<账户ID>/aectn.top/ssl-tls/edge-certificates
   ```
3. 找不到就点左侧边栏顶部的**账户主页**，从域名卡片进

**Worker 路由**：`设置 → 域和路由 → 添加（Add）`
```
Route: cheers.aectn.top/*
Zone:  aectn.top
```

**证书签发（必做，否则浏览器告警）**
灰云状态下 CF 不主动签发证书。流程：
1. 先把 `cheers` 记录设为**橙云**
2. 到 SSL/TLS → Edge Certificates，确认出现覆盖 `*.aectn.top` 且状态 **Active**（5–15 分钟）
3. 确认后**改回灰云**。证书签发后会保留，不受代理开关影响

> `cheers.aectn.top` 是相对 `aectn.top` 的一级子域，落在免费 Universal SSL 覆盖范围内，**不需要花钱买 Advanced Certificate**。
> 若换成 `a.b.aectn.top` 这种更深的子域，则必须付费（$10/月）。

**HTTP → HTTPS 跳转（零代价方案）**
灰云下 CF 的「Always Use HTTPS」和 Bulk Redirect 都不生效。处理方式：
- `_headers` 里下发 HSTS（`max-age=31536000; includeSubDomains`）
- 对外链接（推文、海报二维码、OG/canonical）统一写 https
- 页面内链接全用相对路径

唯一漏网场景：有人手工敲 `http://` 首访，访问一次后即进入 HSTS 保护期，可忽略。

## 6. 目录结构

```
qisi-site/
├── wrangler.toml          Worker 配置（assets 目录、404 处理）★核心
├── _headers               ★安全头 + 缓存策略 + HSTS（不要写进 Worker 代码）
├── package.json           npm scripts（dev / deploy）
├── .gitignore             已排除 node_modules、dist、.wrangler 等
├── README.md              本文档
└── public/                ← 部署到线上的就是这个目录
    ├── index.html         首页
    ├── departments.html   部门介绍
    ├── robotics.html      机器人战队
    ├── news.html          社团动态
    ├── join.html          加入我们
    ├── 404.html           错误页
    └── assets/
        ├── css/style.css  全站样式（设计令牌 + 组件库）
        ├── js/main.js     交互（导航、动效、FAQ、计数器）
        ├── js/config.js   ★ 站点配置：域名、QQ 群号、二维码路径
        └── img/           图片素材目录（目前为空，等素材）
```

> 改 `public/` 里的任何文件都需要重新 `npx wrangler deploy` 才会上线。

## 7. 日常怎么更新

**改联系方式（最常见）**
只改 `public/assets/js/config.js` 一个文件，全站同步：
```js
qqGroup:    "123456789",                 // 招新群号
qqGroupKey: "",                          // 群链接 key，填了"一键加群"才生效
qrGroup:    "assets/img/qr-group.png",   // 群二维码图片路径
qrContact:  "assets/img/qr-official.png" // 官号二维码
```

**新增一条动态**
复制 `news.html` 里任意一段 `<article class="post">`，改日期、标题、正文、图片路径，放到列表最上方。

**改设计**
所有颜色/字号/圆角在 `assets/css/style.css` 顶部的 `:root` 变量里，改一处生效。

**上线**
`npx wrangler deploy`，或接了 Git 就推仓库自动部署（约 40 秒）。

## 8. 内容规范（防止跑偏）

- 配图：比例 16:9 或 4:3，宽 ≤1600px，单张 ≤300KB，统一放 `public/assets/img/`
- 标题：每页**只能有一个 h1**，区块用 h2，卡片用 h3
- 语气：口语化、第二人称「你」、不堆感叹号
- 新增内容请复制现成组件块，不要自己写样式

## 9. 待办清单

**素材（唯一卡进度项）**
- [ ] 社团教室 / 机器人教室照片 3–5 张
- [ ] 招新 QQ 群二维码 + 群号 + 群链接 key
- [ ] 社团官号 QQ 二维码
- [ ] 战队比赛照片 / 合影
- [ ] 2026 省赛**获奖项目具体名称**（目前只知道奖项数量）
- [ ] 更早期竞赛成绩
- [ ] 社团动态的真实日期与文案（`news.html` 现为示意内容）
- [ ] 报名截止日期 / 招新流程细节

**配置**
- [ ] 确定用哪个优选服务 → 填进 DNS 的 CNAME 目标
- [ ] 页脚年份由 JS 自动填充（`data-year`），无需手动改

## 10. 回滚预案

优选出问题（打不开/被干扰）时，**2 分钟切回默认方案**：
1. CF 控制台把 `cheers` 记录改回**橙云**
2. 目标改回 Worker 提供的 workers.dev 地址（或保留 CNAME 由 CF 自动代理）
3. 等 DNS 生效（几分钟）

**永远保留的兜底**：海报和推文上必须同时印**招新群二维码**。官网是加分项，**不能是唯一入口**——Cloudflare 免费套餐对大陆访问没有任何 SLA，优选只是缓解手段，不是保证。

## 11. 账号与归属

| 项 | 值 |
| --- | --- |
| 域名 | `cheers.aectn.top`（NameSilo 注册，已 NS 托管到 Cloudflare） |
| Cloudflare 账号 | 暂用个人账号，后续迁移成本低 |
| 代码仓库 | 待建（建议用社团公共账号，避免毕业失联） |
| 成本 | ¥0（仅域名续费） |

**交接时必须移交**：CF 账号、Git 仓库地址、本文档、DNS 配置截图。
