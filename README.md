# dsh-chat-figure

在 DSH 聊天里**原生渲染**示意图和练习题：把 ```` ```figure ````、```` ```tree ````、
```` ```quiz ```` 代码块换成真实的 HTML，不是图片。

![浅色主题](docs/preview-light.png)

- 文字是真文字：跟随聊天字号、可选中、可缩放，随主题明暗自动适配
- 零依赖：不需要 Mermaid，不加载外部脚本
- 会话流式输出时边到边渲染
- 三种块：流程图（figure）、层级树（tree）、可点击作答的选择题（quiz）

<details>
<summary>深色主题</summary>

![深色主题](docs/preview-dark.png)

</details>

## 为什么不用图片

聊天里的图片有固定的显示宽度上限，高分辨率导出反而让字被缩小；而且图片不可选中、不跟随主题。
把图渲染成 DOM 之后，字号就是聊天字号，缩放和主题都不用额外处理。

## 三种块

代码块的第一行是哨兵，决定渲染成什么：`%%figure`、`%%tree`、`%%quiz`。
块可以写在 ``` 里，围栏语言写什么都行（哨兵才是依据）。

### `%%tree` — 进程树 / 结构层级

![进程树](docs/preview-tree.png)

```tree
%%tree
Bash (Shell)
  Uvicorn 父进程
    Worker 1
    Worker 2
    Worker 3
```

缩进两格一层；`标题 | 备注` 里的备注会以灰色小字跟在后面；有子节点的行自动加粗。

### `%%quiz` — 选择题，点一下就判

![选择题](docs/preview-quiz.png)

```quiz
%%quiz
title: 第 1 课 · 进程基础
q: 子进程调用 execve() 之后，PID 会怎样？
A. 变成一个新的 PID
B. 保持不变
C. 变成父进程 PID
D. 自动变成 1
answer: B
why: execve 只替换进程映像；只有 fork 才会分配新 PID。
```

- 点选项立即判定：正确项绿、错选项红、附解析；
- 底部显示「已答 x/y · 答对 n」，可「重做」，也可「复制结果」贴回对话；
- 作答记录存在 `localStorage`（按内容哈希分键），刷新页面不丢。

关键字：`q:`/`问题:` 开新题，`A.`~`H.` 是选项，`answer:`/`答案:` 是正确项，
`why:`/`解析:` 是解释，`title:` 是卡片标题。

### `%%figure` — 流程/结构示意

```figure
%%figure
title: fork() 之后：一分为二
sub: 父子各有独立 PID，内存先共享同一批物理页
arrow: fork()
row
box gray: 父进程 Bash | PID 1000 · fork() 返回 1001
box blue: 子进程 Bash（副本） | PID 1001 · fork() 返回 0
note: 返回值不同，同一份代码因此走向不同分支
foot: 复制的是“进程状态”，不是磁盘上的程序。
```

| 行 | 含义 |
| --- | --- |
| `title:` / `sub:` | 图标题 / 灰色副标题（居中） |
| `arrow: 标签` | 竖向箭头，标签可省略 |
| `row` | 开始一行并列的盒子；后续 `box` 都归入这一行 |
| `box [颜色] [wide]: 标题 \| 副标题` | 盒子；颜色 `gray` `blue` `green` `amber` `plain`（默认）；`wide` 强制整行 |
| `note: 文字` | 居中的灰色小字 |
| `pills: A, B, C` | 一排胶囊标签 |
| `foot: 文字` | 底部图注（带分隔线） |
| `gap` | 垂直空隙 |

空行、`#` 开头的注释行会被忽略；没闭合的代码块（流式输出中）也会按已有内容先画。

## 实现

| 文件 | 作用 |
| --- | --- |
| `lib/index.js` | Host 半边，空实现 |
| `lib/client.js` | 浏览器半边：注册 `window.__ModuleLoader__.load`，`apply` 里装 MutationObserver |
| `cordis.patch.yml` | 向 profile 插入一条 loader 行 |
| `smoke/smoke.mjs` | jsdom 冒烟测试（解析、渲染、幂等、重复渲染） |

运行测试：

```bash
npm i          # 仅首次，装 jsdom
npm test
```

## 安装

1. 在 profile 的 `node_modules` 建软链：

```bash
ln -s /home/a3165/workspace/dsh-chat-figure ~/.dsh/profiles/web/node_modules/dsh-chat-figure
```

2. 在 `~/.dsh/profiles/web/cordis.patch.yml` 末尾追加一行 loader 条目：

```yaml
- insert:
    - id: chat-figure
      name: 'dsh-chat-figure'
```

用 **patch 层**而不是 bundle 列表：patch 层是热加载的，改动后刷新页面即可生效，
不需要重启 `dsh web`。如果同时把包装进 `dsh.profile.bundles`，重启后会重复插入同 id 行。

## 已验证

- jsdom 冒烟测试：解析、渲染、幂等、流式半截内容、shiki 行结构、无关代码块不受影响
- 真实应用外壳（headless Chromium + 独立实例）：浅色/深色主题都正常渲染，见 `docs/preview-*.png`

## 已知限制

- 靠 `pre` 元素文本里的 `%%…` 哨兵识别，不依赖代码块的 class，代码块组件改样式也不会失效；
- 会隐藏原始代码块（图是真渲染，不是叠加）；
- 暂不支持 Mermaid 语法；
- 选择题判定在浏览器本地完成，模型看不到你的作答——要么点「复制结果」贴回来，要么直接说分数。
