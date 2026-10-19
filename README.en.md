# dsh-chat-figure

[简体中文](README.md) | English

![Version](https://img.shields.io/badge/version-0.2.0-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Platform](https://img.shields.io/badge/platform-DSH%20Web-blue?style=flat-square)
![Bundle](https://img.shields.io/badge/bundle-35%20KB%20zero--deps-brightgreen?style=flat-square)

---

Draw diagrams, hierarchies and quizzes inside a DSH conversation. Three code blocks are rendered as real HTML: selectable text at the conversation's own font size, following the light/dark theme, with quizzes you answer by clicking. Zero dependencies, no network, no model calls.

## What it renders

| Block | For | Output |
| --- | --- | --- |
| `%%figure` | Flows, structure, comparisons | Boxes, arrows, notes, chips, footnote |
| `%%tree` | Process trees, directories, call chains | Indentation as depth; parents emphasised, leaves dimmed |
| `%%quiz` | Lesson checks | Single choice, grading, explanation, progress, score |

## Preview

| Flow / structure | Hierarchy tree |
| --- | --- |
| ![figure](docs/preview-light.png) | ![tree](docs/preview-tree.png) |

| Quiz, one at a time | Graded on submit |
| --- | --- |
| ![quiz](docs/preview-quiz-step.png) | ![graded](docs/preview-quiz-feedback.png) |

<details>
<summary>Dark theme</summary>

![dark theme](docs/preview-dark.png)

</details>

## Usage

The first line is a sentinel that picks the renderer; the fence language is cosmetic.

### `%%figure`

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
pills: Copy-on-Write, PID, address space
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

### `%%tree`

````markdown
```tree
%%tree
systemd (PID 1)
  uvicorn.service | PID 1000
    Worker 1 | PID 1001
    Worker 2 | PID 1002
```
````

Two spaces per level; `title | hint` renders the hint as muted text.

### `%%quiz`

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

- Header shows the tag, `n / N` and a progress bar;
- Pick one, hit **Submit** to grade and reveal the explanation, then **Next**;
- After the last question: score, per-question review, retry, copy-results;
- Add `mode: list` to show the whole paper at once.

| Keyword | Meaning |
| --- | --- |
| `q:` | Starts a question |
| `A.`–`H.` | Options |
| `answer:` | Correct option |
| `why:` | Explanation shown after grading |
| `tag:` / `title:` | Header label / title |

## How it works

1. **Detect** — the block's first line (`%%figure` / `%%tree` / `%%quiz`) selects the renderer;
2. **Parse** — line-oriented directives become an intermediate structure; blank lines and `#` comments are ignored, and half-streamed blocks render what exists;
3. **Render** — plain DOM with every color derived from `currentColor`, so one rule set covers light and dark; changed content replaces the old node in place;
4. **State** — quiz picks, cursor and completion persist in `localStorage`, keyed by a hash of the block, surviving refreshes and re-renders;
5. **Schedule** — a `MutationObserver` watches the transcript and processes new code blocks.

## Install

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

Refresh the page; no `dsh web` restart required.

## Limits

- DSH Web only, with a browser supporting `color-mix()` (Chrome 111+ / Safari 16.2+ / Firefox 113+);
- The source code block is hidden once rendered;
- No Mermaid support;
- Grading happens in the browser, so the model cannot see your answers — use **Copy results** or say which question you missed.

[Changelog](CHANGELOG.md) · [MIT](LICENSE)
