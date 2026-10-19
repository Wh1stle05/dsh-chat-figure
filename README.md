# dsh-chat-figure

简体中文 | [English](README.en.md)

![Version](https://img.shields.io/badge/version-0.2.0-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Platform](https://img.shields.io/badge/platform-DSH%20Web-blue?style=flat-square)
![Bundle](https://img.shields.io/badge/bundle-35%20KB%20zero--deps-brightgreen?style=flat-square)

---

**在对话里直接画图，不再贴图片。** dsh-chat-figure 把 ```` ```figure ````、```` ```tree ````、```` ```quiz ```` 三种代码块渲染成真实的 HTML：文字是真文字、可选中、可缩放、跟随明暗主题，选择题还能点着作答。整个过程零依赖、不联网、不调用模型。

---

## 为什么不是图片

之前我确实是用 PNG 贴图的，问题很具体：

| 做法 | 结果 |
| --- | --- |
| 导出 1800px 的 PNG | 聊天里图片有固定宽度上限，显示时被压回 860px，**字反而更小** |
| 导出 SVG 图片 | 仍然受宽度上限约束，只是不糊 |
| Mermaid / 外部渲染 | 要加载几百 KB 依赖，样式也被别人的主题牵着走 |
| **渲染成 HTML** | 字号就是聊天字号，容器多宽就多宽，明暗自动跟随，还能交互 |

一句话：图片是「画好的」，HTML 是「活的」。

## 效果

| 流程结构图 | 层级树 |
| --- | --- |
| ![结构图](docs/preview-light.png) | ![进程树](docs/preview-tree.png) |

| 选择题（一次一题） | 答完立即判分 |
| --- | --- |
| ![选择题](docs/preview-quiz-step.png) | ![判分](docs/preview-quiz-feedback.png) |

<details>
<summary>深色主题</summary>

![深色主题](docs/preview-dark.png)

</details>

## 三种块

块的第一行是哨兵，决定渲染成什么；围栏语言写什么都行（哨兵才是依据）。

### `%%figure` — 流程 / 结构

````markdown
```figure
%%figure
title: fork() 之后：一分为二
sub: 父子各有独立 PID，内存先共享同一批物理页
arrow: fork()
row
box gray: 父进程 Bash | PID 1000 · fork() 返回 1001
box blue: 子进程 Bash（副本） | PID 1001 · fork() 返回 0
note: 返回值不同，同一份代码因此走向不同分支
pills: Copy-on-Write, PID, 地址空间
foot: 复制的是“进程状态”，不是磁盘上的程序。
```
````

| 行 | 含义 |
| --- | --- |
| `title:` / `sub:` | 居中标题 / 灰色副标题 |
| `arrow: 标签` 或 `arrow` | 竖向箭头，标签可省略 |
| `row` | 开始一行并列盒子，后续 `box` 归入该行 |
| `box [gray\|blue\|green\|amber\|plain] [wide]: 标题 \| 副标题` | 盒子；`wide` 强制整行 |
| `note:` / `pills:` / `foot:` / `gap` | 居中注释 / 胶囊标签 / 底部图注 / 空隙 |

### `%%tree` — 进程树、目录树、调用层级

````markdown
```tree
%%tree
systemd (PID 1)
  uvicorn.service | PID 1000
    Worker 1 | PID 1001
    Worker 2 | PID 1002
```
````

缩进两格一层，`标题 | 备注` 的备注以灰色小字跟在后面；有子节点的行自动加粗，叶子节点变淡。

### `%%quiz` — 选择题，一次一题

````markdown
```quiz
%%quiz
tag: Linux 小测验
q: Linux 中，kill -9 发送的是什么信号？
A. SIGTERM (15)
B. SIGKILL (9)
C. SIGSTOP (19)
D. SIGINT (2)
answer: B
why: -9 就是 SIGKILL，内核直接终止，既不能捕获也不能忽略。
```
````

- 顶部是标签 + `第 n / N 题`，下面是进度条；
- 单选 → 「提交答案」→ 立即判分、展开解析 → 按钮变「下一题」；
- 最后一题之后是成绩页：答对 x/N、逐题回顾、重做、复制结果；
- 想一次看完整卷，加一行 `mode: list`。

关键字：`q:`/`问题:` 开新题，`A.`~`H.` 是选项，`answer:`/`答案:` 正确项，`why:`/`解析:` 解释，`tag:`/`title:` 标题。

## 安装

插件是「Host 空实现 + 浏览器半边」，装进任意 profile 即可：

```bash
# 1. 放到磁盘任意位置，链进 profile
ln -s /path/to/dsh-chat-figure ~/.dsh/profiles/web/node_modules/dsh-chat-figure

# 2. 在 profile 的 patch 层追加一行
cat >> ~/.dsh/profiles/web/cordis.patch.yml <<'YAML'
- insert:
    - id: chat-figure
      name: 'dsh-chat-figure'
YAML
```

然后刷新页面。**不需要重启 `dsh web`**：patch 层是热加载的，重启后也照常生效。

> 为什么不走 `dsh.profile.bundles`？bundle 列表在启动时组合，而且 bundle 自带的 patch 会和手写的 patch 行重复插入同一个 id。走 patch 层一份就够了。

## 设计说明

- **零依赖**：不打包 Mermaid、不加载外部脚本，35 KB 手写 JS；
- **哨兵识别**：靠代码块文本里的 `%%figure` 识别，不依赖 class，代码块组件改样式也不会失效；
- **流式友好**：没写完的代码块按已有内容先画，内容变化后原地重画；
- **状态自愈**：每次扫描都确认样式表还在——宿主切换主题会重写 `<head>`，不认识的节点会被删掉，不补就会退化成浏览器默认样式；
- **作答持久化**：选项、进度、完成态存在 `localStorage`，按块内容哈希分键，刷新不丢；
- **主题适配**：颜色从 `currentColor` 派生，卡片、盒子、箭头在深浅色下共用一套规则。

## 常见问题

**卡片变成浏览器默认样式（无边框、选项挤成一行）？**
样式表被清掉了。刷新一次即可，插件每次扫描都会重新注入。控制台执行
`document.getElementById('dsh-chat-figure-style')` 可以确认样式表在不在。

**模型能看到我选了什么吗？**
不能。判分完全在浏览器本地，和「LLM 出题 → 前端判题」的分工一致。想让我知道，点成绩页的「复制结果」贴回来，或者直接说「第 2 题错了」。

**支持 Mermaid 语法吗？**
不支持，也不打算支持：Mermaid 会带来几百 KB 依赖和一套不受控的样式。需要新形状的话，直接扩 `%%figure` 的 DSL 更省事。

## 兼容性

- DSH Web（`dsh web`），浏览器需支持 `color-mix()`（Chrome 111+ / Safari 16.2+ / Firefox 113+）；
- 只依赖 `window.__ModuleLoader__.load` 与 profile patch 层，不 import 任何内部模块；
- 未改动 DSH 源码，卸载只需删掉 patch 行与软链。

[更新日志](CHANGELOG.md) · [MIT](LICENSE)
