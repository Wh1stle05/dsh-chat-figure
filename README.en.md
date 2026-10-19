# dsh-chat-figure

[简体中文](README.md) | English

![Version](https://img.shields.io/badge/version-0.2.0-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Platform](https://img.shields.io/badge/platform-DSH%20Web-blue?style=flat-square)
![Bundle](https://img.shields.io/badge/bundle-35%20KB%20zero--deps-brightgreen?style=flat-square)

---

**Diagrams inside the conversation, not screenshots of them.** dsh-chat-figure turns ```` ```figure ````, ```` ```tree ```` and ```` ```quiz ```` code blocks into real HTML: actual text you can select, scale and theme, plus quizzes you can answer by clicking. No dependencies, no network, no model calls.

---

## Why not images

Images were the first attempt, and the reason they failed is concrete:

| Approach | Result |
| --- | --- |
| Export a 1800px PNG | Chat caps image width around 860px, so it is scaled back down and the **text gets smaller** |
| Export an SVG image | Still capped by width, only sharper |
| Mermaid / external renderer | Hundreds of KB of dependencies and someone else's theme |
| **Render HTML** | Text is the conversation's own text size, fills the column, follows light/dark, and stays interactive |

An image is drawn once. HTML is alive.

## What it looks like

| Flow / structure | Hierarchy tree |
| --- | --- |
| ![figure](docs/preview-light.png) | ![tree](docs/preview-tree.png) |

| Quiz, one question at a time | Graded on submit |
| --- | --- |
| ![quiz](docs/preview-quiz-step.png) | ![graded](docs/preview-quiz-feedback.png) |

<details>
<summary>Dark theme</summary>

![dark theme](docs/preview-dark.png)

</details>

## The three blocks

The first line is a sentinel that decides the renderer; the fence language is cosmetic.

### `%%figure` — flow and structure

````markdown
```figure
%%figure
title: After fork(): one becomes two
sub: Separate PIDs, shared physical pages
arrow: fork()
row
box gray: Parent Bash | PID 1000 · fork() returns 1001
box blue: Child Bash (copy) | PID 1001 · fork() returns 0
note: Same code, different return value, different branch
foot: What is copied is process state, not the program on disk.
```
````

| Line | Meaning |
| --- | --- |
| `title:` / `sub:` | Centered title / muted subtitle |
| `arrow: label` or `arrow` | Vertical arrow, label optional |
| `row` | Start a row; following `box` lines join it |
| `box [gray\|blue\|green\|amber\|plain] [wide]: title \| subtitle` | A box; `wide` forces full width |
| `note:` / `pills:` / `foot:` / `gap` | Centered note / chips / footnote / spacer |

### `%%tree` — process trees, directories, call hierarchy

````markdown
```tree
%%tree
systemd (PID 1)
  uvicorn.service | PID 1000
    Worker 1 | PID 1001
    Worker 2 | PID 1002
```
````

Two spaces per level. `title | hint` renders the hint as muted text; rows with children are emphasised, leaves are dimmed.

### `%%quiz` — single choice, one question at a time

````markdown
```quiz
%%quiz
tag: Linux quiz
q: What does kill -9 send?
A. SIGTERM (15)
B. SIGKILL (9)
C. SIGSTOP (19)
D. SIGINT (2)
answer: B
why: -9 is SIGKILL; the kernel terminates the process and it cannot catch or ignore it.
```
````

- Header shows the tag and `n / N`, with a progress bar underneath;
- Pick one, hit **Submit**, get the verdict and explanation, then **Next**;
- After the last one: score, per-question review, retry, copy-results;
- Add `mode: list` to show the whole paper at once.

Keywords: `q:` starts a question, `A.`–`H.` are options, `answer:` marks the correct one, `why:` is the explanation, `tag:`/`title:` is the header.

## Install

The plugin is a no-op host half plus a browser half:

```bash
# 1. link it into the profile
ln -s /path/to/dsh-chat-figure ~/.dsh/profiles/web/node_modules/dsh-chat-figure

# 2. add one row to the profile patch layer
cat >> ~/.dsh/profiles/web/cordis.patch.yml <<'YAML'
- insert:
    - id: chat-figure
      name: 'dsh-chat-figure'
YAML
```

Refresh the page. **No `dsh web` restart needed**: the patch layer hot-reloads, and the row also survives restarts.

> Why not `dsh.profile.bundles`? Bundle lists are composed at boot, and a bundle's own patch would insert the same id twice alongside the manual row.

## Design notes

- **Zero dependencies** — no Mermaid, no external scripts, 35 KB of hand-written JS;
- **Sentinel-based detection** — matches `%%figure` in the block text, not a class name, so a restyle of code blocks cannot break it;
- **Streaming-aware** — incomplete blocks render what exists and re-render as tokens arrive;
- **Self-healing styles** — the host rewrites `<head>` on theme changes and drops nodes it does not own, so every scan re-asserts the stylesheet;
- **Persistent answers** — picks, cursor and completion live in `localStorage`, keyed by a hash of the block;
- **Theme-driven colors** — derived from `currentColor`, so light and dark need no separate rules.

## FAQ

**The card lost its styles (no border, options on one line).**
The stylesheet was removed; refresh once. Every scan re-injects it. Check with
`document.getElementById('dsh-chat-figure-style')` in the console.

**Can the model see what I picked?**
No. Grading is entirely client-side. Use **Copy results** and paste it back, or just say which question you missed.

**Mermaid support?**
No, on purpose: hundreds of KB and a styling system we do not control. Extending the `%%figure` DSL is cheaper.

## Compatibility

- DSH Web, with a browser supporting `color-mix()` (Chrome 111+ / Safari 16.2+ / Firefox 113+);
- Only relies on `window.__ModuleLoader__.load` and the profile patch layer — no internal imports;
- No DSH source is modified; uninstalling is removing the row and the symlink.

[Changelog](CHANGELOG.md) · [MIT](LICENSE)
