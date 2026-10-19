// dsh-chat-figure — browser half.
//
// Loaded by dsh-client-modules and executed through the lazy-CJS module table
// (`window.__ModuleLoader__.load`). Everything lives in the factory closure:
// registering the factory has no side effects, and `apply` owns the observer.
//
// What it does: finds ```figure / ```tree / ```quiz code blocks in the rendered
// transcript, parses the tiny line-oriented DSL inside them, and renders real
// HTML in place of the code block. Text stays real text, so it inherits the
// chat's font size and the host theme instead of being a downscaled bitmap.
//
// The DSL (every line optional, blank lines ignored):
//
//   %%figure
//   title: fork() 之后：一分为二
//   sub: 父子各有独立 PID
//   arrow: fork()
//   row
//   box gray: 父进程 Bash | PID 1000 · fork() 返回 1001
//   box blue: 子进程 Bash（副本） | PID 1001 · fork() 返回 0
//   note: 返回值不同，同一份代码因此走向不同分支
//   foot: 复制的是“进程状态”，不是磁盘上的程序。
//
// Keywords: title, sub, note, arrow, pills, foot, row, box [gray|blue|green|
// amber|plain] [wide]: 标题 | 副标题.

window.__ModuleLoader__.load({
  id: 'dsh-chat-figure',
  factory() {
    const SENTINEL = /^%%\s*figure\s*$/i;
    const COLORS = ['gray', 'blue', 'green', 'amber', 'plain'];
    const STYLE_ID = 'dsh-chat-figure-style';

    const CSS = `
.dfg{margin:16px auto;max-width:720px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:16px;padding:16px 18px 14px;background:color-mix(in srgb,currentColor 5%,transparent)}
.dfg-head{text-align:center;margin-bottom:14px}
.dfg-title{font-size:1.03em;font-weight:700;letter-spacing:.01em;line-height:1.45}
.dfg-sub{margin-top:4px;font-size:.82em;opacity:.6;line-height:1.55}
.dfg-body{display:flex;flex-direction:column}
.dfg-row{display:flex;gap:10px;align-items:stretch}
.dfg-box{flex:1 1 0;min-width:0;border:1px solid;border-radius:10px;padding:10px 12px;text-align:center;display:flex;flex-direction:column;justify-content:center;gap:2px}
.dfg-box .dfg-bt{font-weight:600;font-size:.95em;line-height:1.45}
.dfg-box .dfg-bs{font-size:.79em;opacity:.6;line-height:1.45}
.dfg-blue{background:color-mix(in srgb,#2f6fed 9%,transparent);border-color:color-mix(in srgb,#2f6fed 30%,transparent)}
.dfg-green{background:color-mix(in srgb,#128a5a 9%,transparent);border-color:color-mix(in srgb,#128a5a 30%,transparent)}
.dfg-amber{background:color-mix(in srgb,#b7791f 10%,transparent);border-color:color-mix(in srgb,#b7791f 30%,transparent)}
.dfg-gray{background:color-mix(in srgb,currentColor 8%,transparent);border-color:color-mix(in srgb,currentColor 20%,transparent)}
.dfg-plain{background:color-mix(in srgb,currentColor 2%,transparent);border-color:color-mix(in srgb,currentColor 18%,transparent)}
.dfg-arrow{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 0}
.dfg-bar{width:2px;height:18px;background:currentColor;opacity:.45}
.dfg-bar--end{position:relative;height:18px;margin-bottom:2px}
.dfg-bar--end::after{content:"";position:absolute;left:50%;bottom:-3px;transform:translateX(-50%);border:7px solid transparent;border-top-color:currentColor;opacity:.6}
.dfg-chip{margin:2px 0;padding:3px 11px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 15%,transparent);background:color-mix(in srgb,currentColor 2%,transparent)}
.dfg-chip code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.79em;background:none;padding:0;border:0;color:inherit}
.dfg-note{text-align:center;font-size:.81em;opacity:.6;margin-top:10px;line-height:1.55}
.dfg-pills{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:10px}
.dfg-pill{border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:999px;padding:2px 10px;font-size:.78em;opacity:.75}
.dfg-foot{margin-top:14px;padding-top:10px;border-top:1px solid color-mix(in srgb,currentColor 14%,transparent);font-size:.78em;opacity:.55;line-height:1.65}
.dfg-gap{height:6px}
.dfg-tree{padding:12px 14px}
.dft{display:flex;flex-direction:column;gap:1px}
.dft-row{display:flex;align-items:center;gap:8px;padding:3px 0}
.dft-ico{flex:none;opacity:.72}
.dft-arrow{flex:none;width:15px;text-align:center;opacity:.35;font-size:.9em;line-height:1}
.dft-t{font-size:.92em;line-height:1.5}
.dft-t.is-parent{font-weight:600}
.dft-t.is-leaf{opacity:.62}
.dft-h{font-size:.78em;opacity:.5;margin-left:2px}
.dfg-quiz{padding:18px 20px 16px}
.dfq-title{font-weight:700;font-size:1.02em;text-align:center;margin-bottom:14px;line-height:1.5}
.dfq-q{padding:12px 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent)}
.dfq-q:first-of-type{border-top:0;padding-top:0}
.dfq-prompt{display:flex;gap:7px;font-weight:600;font-size:.94em;line-height:1.6}
.dfq-num{opacity:.45;flex:none;font-variant-numeric:tabular-nums}
.dfq-opts{display:flex;flex-direction:column;gap:1px;margin-top:7px}
.dfq-opt{display:flex;gap:9px;align-items:flex-start;padding:5px 8px;border-radius:8px;border:1px solid transparent;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background .12s}
.dfq-opt:hover{background:color-mix(in srgb,currentColor 5%,transparent)}
.dfq-dot{flex:none;width:14px;height:14px;border-radius:50%;border:1.5px solid color-mix(in srgb,currentColor 32%,transparent);margin-top:.22em;position:relative;box-sizing:border-box}
.dfq-opt.is-picked .dfq-dot{border-color:currentColor}
.dfq-opt.is-picked .dfq-dot::after{content:"";position:absolute;inset:2.5px;border-radius:50%;background:currentColor}
.dfq-opt.is-right{background:color-mix(in srgb,#128a5a 11%,transparent);border-color:color-mix(in srgb,#128a5a 26%,transparent)}
.dfq-opt.is-right .dfq-dot{border-color:#128a5a}
.dfq-opt.is-right .dfq-dot::after{background:#128a5a}
.dfq-opt.is-wrong{background:color-mix(in srgb,#d14343 10%,transparent);border-color:color-mix(in srgb,#d14343 26%,transparent)}
.dfq-opt.is-wrong .dfq-dot{border-color:#d14343}
.dfq-opt.is-wrong .dfq-dot::after{background:#d14343}
.dfq-t{font-size:.9em;line-height:1.55}
.dfq-k{opacity:.5;margin-right:3px;font-variant-numeric:tabular-nums}
.dfq-why{margin-top:7px;padding:7px 10px;border-radius:8px;background:color-mix(in srgb,currentColor 4%,transparent);font-size:.81em;line-height:1.6;opacity:.78}
.dfq-why b{font-weight:600;opacity:.95}
.dfq-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:.79em}
.dfq-score{opacity:.62}
.dfq-actions{display:flex;gap:7px}
.dfq-act,.dfq-reset{border:1px solid color-mix(in srgb,currentColor 15%,transparent);background:none;color:inherit;font:inherit;padding:3px 10px;border-radius:8px;cursor:pointer;opacity:.75}
.dfq-act:hover,.dfq-reset:hover{opacity:1;background:color-mix(in srgb,currentColor 5%,transparent)}
.dfs-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.dfs-tag{font-size:.78em;padding:2px 10px;border-radius:999px;background:color-mix(in srgb,currentColor 7%,transparent);opacity:.9}
.dfs-count{font-size:.78em;opacity:.55;font-variant-numeric:tabular-nums;white-space:nowrap}
.dfs-track{height:4px;border-radius:999px;background:color-mix(in srgb,currentColor 14%,transparent);overflow:hidden;margin:10px 0 20px}
.dfs-fill{height:100%;border-radius:999px;background:color-mix(in srgb,currentColor 55%,transparent);transition:width .25s ease}
.dfs-q{font-weight:700;font-size:1.05em;line-height:1.6;margin-bottom:14px}
.dfs-opts{display:flex;flex-direction:column;gap:3px}
.dfs-opt{display:flex;gap:11px;align-items:center;padding:9px 10px;border:1px solid transparent;border-radius:10px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background .12s,border-color .12s}
.dfs-opt:hover{background:color-mix(in srgb,currentColor 6%,transparent)}
.dfs-opt.is-picked{background:color-mix(in srgb,currentColor 6%,transparent);border-color:color-mix(in srgb,currentColor 26%,transparent)}
.dfs-dot{width:17px;height:17px;border-radius:50%;border:1.5px solid color-mix(in srgb,currentColor 35%,transparent);flex:none;box-sizing:border-box;transition:border .12s}
.dfs-opt.is-picked .dfs-dot{border-width:5.5px;border-color:currentColor}
.dfs-opt.is-right.is-picked{background:color-mix(in srgb,#128a5a 13%,transparent);border-color:color-mix(in srgb,#128a5a 34%,transparent)}
.dfs-opt.is-right{background:color-mix(in srgb,#128a5a 9%,transparent)}
.dfs-opt.is-right .dfs-dot{border-color:#128a5a}
.dfs-opt.is-wrong{background:color-mix(in srgb,#d14343 8%,transparent)}
.dfs-opt.is-wrong .dfs-dot{border-color:#d14343}
.dfs-t{font-size:.95em;line-height:1.55}
.dfs-submit{width:100%;margin-top:18px;padding:11px 16px;border:0;border-radius:10px;font:inherit;font-size:.93em;font-weight:600;cursor:pointer;background:var(--dsw-alias-label-primary,#18181b);color:var(--dsw-alias-bg-base,#fff);transition:opacity .15s}
.dfs-submit:hover:not(:disabled){opacity:.88}
.dfs-submit:disabled{opacity:.42;cursor:not-allowed}
.dfs-summary{margin-top:2px}
.dfs-score{text-align:center;font-size:1.16em;font-weight:700;margin:4px 0 16px}
.dfs-review{display:flex;flex-direction:column;gap:11px}
.dfs-item{display:flex;gap:9px;align-items:flex-start}
.dfs-mark{flex:none;width:14px;text-align:center;font-weight:700;font-size:.9em;line-height:1.6}
.dfs-mark.ok{color:#128a5a}
.dfs-mark.no{color:#d14343}
.dfs-item-body{min-width:0;font-size:.86em;line-height:1.6}
.dfs-item-q{font-weight:600;margin-bottom:2px}
.dfs-item-a{opacity:.62}
@media (max-width:560px){.dfg-row{flex-direction:column}}
`;

    function injectStyle(doc) {
      if (doc.getElementById(STYLE_ID)) return;
      const style = doc.createElement('style');
      style.id = STYLE_ID;
      style.dataset.plugin = 'dsh-chat-figure';
      style.textContent = CSS;
      (doc.head || doc.documentElement).appendChild(style);
    }

    function splitPair(text) {
      const i = text.indexOf('|');
      if (i < 0) return [text.trim(), ''];
      return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
    }

    /**
     * Parse the figure DSL. Returns null when the sentinel is absent, and a
     * partial figure while a message is still streaming — the caller re-renders
     * on the next mutation.
     */
    function parseFigure(source) {
      const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
      let i = 0;
      while (i < lines.length && !SENTINEL.test(lines[i].trim())) i++;
      if (i >= lines.length) return null;
      i += 1;

      const fig = { title: '', sub: '', foot: '', blocks: [] };
      let row = null;

      for (; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#') || line === '```' || line === '%%') continue;

        const boxMatch = /^box(?:\s+([^:]*))?:\s*([\s\S]*)$/i.exec(line);
        if (boxMatch) {
          const mods = (boxMatch[1] || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
          const color = mods.find((m) => COLORS.includes(m)) || 'plain';
          const wide = mods.includes('wide');
          const [title, sub] = splitPair(boxMatch[2]);
          const box = { title, sub, color, wide };
          if (row) row.boxes.push(box);
          else fig.blocks.push({ type: 'row', boxes: [box] });
          continue;
        }

        if (/^row$/i.test(line)) {
          row = { type: 'row', boxes: [] };
          fig.blocks.push(row);
          continue;
        }

        if (/^arrow$/i.test(line)) {
          row = null;
          fig.blocks.push({ type: 'arrow', label: '' });
          continue;
        }

        const kv = /^([a-zA-Z]+)\s*:\s*([\s\S]*)$/.exec(line);
        if (!kv) continue;
        const key = kv[1].toLowerCase();
        const value = kv[2].trim();

        if (key === 'title') fig.title = value;
        else if (key === 'sub' || key === 'subtitle') fig.sub = value;
        else if (key === 'foot' || key === 'footnote') fig.foot = value;
        else if (key === 'note') { row = null; fig.blocks.push({ type: 'note', text: value }); }
        else if (key === 'arrow') { row = null; fig.blocks.push({ type: 'arrow', label: value }); }
        else if (key === 'gap') { row = null; fig.blocks.push({ type: 'gap' }); }
        else if (key === 'pills') {
          row = null;
          const items = value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
          fig.blocks.push({ type: 'pills', items });
        }
      }

      fig.blocks = fig.blocks.filter((b) => b.type !== 'row' || b.boxes.length);
      return fig;
    }

    function el(doc, tag, className, text) {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined && text !== null && text !== '') node.textContent = text;
      return node;
    }

    function arrowNode(doc, label) {
      const wrap = el(doc, 'div', 'dfg-arrow');
      wrap.appendChild(el(doc, 'div', 'dfg-bar'));
      if (label) {
        const chip = el(doc, 'div', 'dfg-chip');
        chip.appendChild(el(doc, 'code', '', label));
        wrap.appendChild(chip);
      }
      wrap.appendChild(el(doc, 'div', 'dfg-bar dfg-bar--end'));
      return wrap;
    }

    function rowNode(doc, boxes) {
      const row = el(doc, 'div', 'dfg-row');
      for (const box of boxes) {
        const node = el(doc, 'div', `dfg-box dfg-${box.color}${box.wide ? ' dfg-wide' : ''}`);
        node.appendChild(el(doc, 'div', 'dfg-bt', box.title));
        if (box.sub) node.appendChild(el(doc, 'div', 'dfg-bs', box.sub));
        row.appendChild(node);
      }
      return row;
    }

    function renderFigure(doc, fig) {
      const root = el(doc, 'div', 'dfg');

      if (fig.title || fig.sub) {
        const head = el(doc, 'div', 'dfg-head');
        if (fig.title) head.appendChild(el(doc, 'div', 'dfg-title', fig.title));
        if (fig.sub) head.appendChild(el(doc, 'div', 'dfg-sub', fig.sub));
        root.appendChild(head);
      }

      const body = el(doc, 'div', 'dfg-body');
      for (const block of fig.blocks) {
        if (block.type === 'row') body.appendChild(rowNode(doc, block.boxes));
        else if (block.type === 'arrow') body.appendChild(arrowNode(doc, block.label));
        else if (block.type === 'note') body.appendChild(el(doc, 'div', 'dfg-note', block.text));
        else if (block.type === 'gap') body.appendChild(el(doc, 'div', 'dfg-gap'));
        else if (block.type === 'pills') {
          const pills = el(doc, 'div', 'dfg-pills');
          for (const item of block.items) pills.appendChild(el(doc, 'span', 'dfg-pill', item));
          body.appendChild(pills);
        }
      }
      root.appendChild(body);

      if (fig.foot) root.appendChild(el(doc, 'div', 'dfg-foot', fig.foot));
      return root;
    }

    /** First non-empty line decides the block kind; anything else is ignored. */
    function detectKind(text) {
      for (const raw of text.split('\n').slice(0, 20)) {
        const line = raw.trim();
        if (!line) continue;
        const m = /^%%\s*([a-z]+)\s*$/i.exec(line);
        if (!m) return null;
        const kind = m[1].toLowerCase();
        return kind === 'figure' || kind === 'tree' || kind === 'quiz' ? kind : null;
      }
      return null;
    }

    // ---------------------------------------------------------------- tree
    function parseTree(source) {
      const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
      let i = 0;
      while (i < lines.length && !/^%%\s*tree\s*$/i.test(lines[i].trim())) i++;
      if (i >= lines.length) return null;

      const nodes = [];
      for (i += 1; i < lines.length; i += 1) {
        const raw = lines[i].replace(/\t/g, '  ');
        const line = raw.trim();
        if (!line || line.startsWith('#') || line === '```') continue;
        const indent = raw.match(/^ */)[0].length;
        const label = line.replace(/^[-*+]\s+/, '');
        const [title, hint] = splitPair(label);
        if (!title) continue;
        nodes.push({ depth: Math.floor(indent / 2), title, hint });
      }
      if (!nodes.length) return null;

      const base = Math.min(...nodes.map((n) => n.depth));
      for (const node of nodes) node.depth -= base;
      return { nodes };
    }

    function terminalIcon(doc) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = doc.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.setAttribute('width', '15');
      svg.setAttribute('height', '15');
      svg.setAttribute('class', 'dft-ico');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.35');
      const rect = doc.createElementNS(ns, 'rect');
      rect.setAttribute('x', '1.6');
      rect.setAttribute('y', '2.6');
      rect.setAttribute('width', '12.8');
      rect.setAttribute('height', '10.8');
      rect.setAttribute('rx', '2.4');
      const path = doc.createElementNS(ns, 'path');
      path.setAttribute('d', 'M4.7 6.5l1.9 1.8-1.9 1.8M8.7 10.3h2.8');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(rect);
      svg.appendChild(path);
      return svg;
    }

    function renderTree(doc, tree) {
      const root = el(doc, 'div', 'dfg dfg-tree');
      const list = el(doc, 'div', 'dft');
      const nodes = tree.nodes;

      nodes.forEach((node, index) => {
        const hasChildren = nodes.slice(index + 1).some((n) => n.depth > node.depth);
        const row = el(doc, 'div', 'dft-row');
        row.style.paddingLeft = node.depth * 20 + 'px';
        if (node.depth === 0) row.appendChild(terminalIcon(doc));
        else row.appendChild(el(doc, 'span', 'dft-arrow', '↳'));
        row.appendChild(el(doc, 'span', 'dft-t' + (hasChildren ? ' is-parent' : ' is-leaf'), node.title));
        if (node.hint) row.appendChild(el(doc, 'span', 'dft-h', node.hint));
        list.appendChild(row);
      });

      root.appendChild(list);
      return root;
    }

    // ---------------------------------------------------------------- quiz
    function hashText(text) {
      let h = 5381;
      for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
      return (h >>> 0).toString(36);
    }

    function readAnswers(key) {
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }

    function writeAnswers(key, state) {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* storage can be disabled; grading still works for this render */
      }
    }

    function parseQuiz(source) {
      const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
      let i = 0;
      while (i < lines.length && !/^%%\s*quiz\s*$/i.test(lines[i].trim())) i++;
      if (i >= lines.length) return null;

      const quiz = { title: '', tag: '', mode: 'step', questions: [] };
      let current = null;

      for (i += 1; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#') || line === '```') continue;

        const q = /^(?:q|question|问题|题目)\s*[:：]\s*(.+)$/i.exec(line);
        if (q) {
          current = { prompt: q[1].trim(), options: [], answerKey: '', why: '' };
          quiz.questions.push(current);
          continue;
        }

        if (!current) {
          const t = /^(?:title|标题)\s*[:：]\s*(.+)$/i.exec(line);
          if (t) quiz.title = t[1].trim();
          const tag = /^(?:tag|标签)\s*[:：]\s*(.+)$/i.exec(line);
          if (tag) quiz.tag = tag[1].trim();
          const mode = /^(?:mode|模式)\s*[:：]\s*(step|list|card)\s*$/i.exec(line);
          if (mode) quiz.mode = mode[1].toLowerCase() === 'list' ? 'list' : 'step';
          continue;
        }

        const opt = /^([A-Za-z])\s*[.、．)）]\s*(.+)$/.exec(line);
        if (opt) {
          current.options.push({ key: opt[1].toUpperCase(), text: opt[2].trim() });
          continue;
        }

        const ans = /^(?:answer|答案|正确)\s*[:：]\s*([A-Za-z])/i.exec(line);
        if (ans) {
          current.answerKey = ans[1].toUpperCase();
          continue;
        }

        const why = /^(?:why|explain|解析|说明)\s*[:：]\s*(.+)$/i.exec(line);
        if (why) current.why = why[1].trim();
      }

      quiz.questions = quiz.questions.filter((q) => q.options.length > 0);
      return quiz.questions.length ? quiz : null;
    }

    function renderQuizList(doc, quiz, storeKey) {
      const root = el(doc, 'div', 'dfg dfg-quiz');
      if (quiz.title) root.appendChild(el(doc, 'div', 'dfq-title', quiz.title));

      const state = readAnswers(storeKey);
      const total = quiz.questions.length;
      const scoreEl = el(doc, 'span', 'dfq-score');

      const updateScore = () => {
        const answered = quiz.questions.filter((q, i) => state[i] !== undefined).length;
        const correct = quiz.questions.filter((q, i) => q.answerKey && state[i] === q.answerKey).length;
        if (answered === 0) scoreEl.textContent = `共 ${total} 题 · 点选项作答`;
        else if (answered < total) scoreEl.textContent = `已答 ${answered}/${total} · 答对 ${correct}`;
        else scoreEl.textContent = `答完 ${total} 题 · 答对 ${correct}/${total}`;
      };

      for (const [index, question] of quiz.questions.entries()) {
        const wrap = el(doc, 'div', 'dfq-q');
        const prompt = el(doc, 'div', 'dfq-prompt');
        prompt.appendChild(el(doc, 'span', 'dfq-num', `${index + 1}.`));
        prompt.appendChild(el(doc, 'span', '', question.prompt));
        wrap.appendChild(prompt);

        const opts = el(doc, 'div', 'dfq-opts');
        const why = el(doc, 'div', 'dfq-why');
        why.style.display = 'none';

        const paint = () => {
          const picked = state[index];
          for (const btn of opts.children) {
            const key = btn.dataset.key;
            btn.classList.toggle('is-picked', key === picked);
            btn.classList.toggle('is-right', picked !== undefined && key === question.answerKey);
            btn.classList.toggle('is-wrong', picked !== undefined && key === picked && key !== question.answerKey);
          }
          if (picked === undefined) {
            why.style.display = 'none';
            why.textContent = '';
          } else {
            why.style.display = '';
            why.textContent = '';
            const ok = picked === question.answerKey;
            why.appendChild(el(doc, 'b', '', ok ? '答对了。' : `正确答案 ${question.answerKey}。`));
            if (question.why) why.appendChild(doc.createTextNode(' ' + question.why));
          }
          updateScore();
        };

        for (const option of question.options) {
          const btn = el(doc, 'button', 'dfq-opt');
          btn.type = 'button';
          btn.dataset.key = option.key;
          btn.setAttribute('aria-label', `${option.key}. ${option.text}`);
          btn.appendChild(el(doc, 'span', 'dfq-dot'));
          const text = el(doc, 'span', 'dfq-t');
          text.appendChild(el(doc, 'span', 'dfq-k', `${option.key}.`));
          text.appendChild(doc.createTextNode(option.text));
          btn.appendChild(text);
          btn.addEventListener('click', () => {
            if (state[index] !== undefined) return;
            state[index] = option.key;
            writeAnswers(storeKey, state);
            paint();
          });
          opts.appendChild(btn);
        }

        wrap.appendChild(opts);
        wrap.appendChild(why);
        root.appendChild(wrap);
        paint();
      }

      const bar = el(doc, 'div', 'dfq-bar');
      bar.appendChild(scoreEl);

      const actions = el(doc, 'div', 'dfq-actions');
      const copy = el(doc, 'button', 'dfq-act', '复制结果');
      copy.type = 'button';
      copy.addEventListener('click', async () => {
        const answered = quiz.questions.filter((q, i) => state[i] !== undefined);
        const correct = quiz.questions.filter((q, i) => q.answerKey && state[i] === q.answerKey).length;
        const lines = quiz.questions.map((q, i) => {
          const picked = state[i] || '-';
          return `第 ${i + 1} 题：我选 ${picked}，正确答案 ${q.answerKey} ${picked === q.answerKey ? '✓' : '✗'}`;
        });
        const summary = `小测结果：答对 ${correct}/${quiz.questions.length}（已答 ${answered.length}）\n${lines.join('\n')}`;
        try {
          await navigator.clipboard.writeText(summary);
          copy.textContent = '已复制';
        } catch {
          copy.textContent = '复制失败';
        }
        setTimeout(() => { copy.textContent = '复制结果'; }, 1600);
      });
      actions.appendChild(copy);

      const reset = el(doc, 'button', 'dfq-reset', '重做');
      reset.type = 'button';
      reset.addEventListener('click', () => {
        for (const key of Object.keys(state)) delete state[key];
        writeAnswers(storeKey, state);
        root.replaceWith(renderQuizList(doc, quiz, storeKey));
      });
      actions.appendChild(reset);
      bar.appendChild(actions);
      root.appendChild(bar);
      updateScore();
      return root;
    }

    function readStepState(key) {
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') {
          return {
            picks: parsed.picks || {},
            answers: parsed.answers || {},
            cursor: parsed.cursor || 0,
            done: !!parsed.done,
          };
        }
      } catch {
        /* fall through to a fresh state */
      }
      return { picks: {}, answers: {}, cursor: 0, done: false };
    }

    /** One question per screen: pick, submit, read the explanation, next. */
    function renderQuizStep(doc, quiz, storeKey) {
      const state = readStepState(storeKey);
      const total = quiz.questions.length;
      const root = el(doc, 'div', 'dfg dfg-quiz dfq-step');

      const head = el(doc, 'div', 'dfs-head');
      const label = quiz.tag || quiz.title;
      head.appendChild(label ? el(doc, 'span', 'dfs-tag', label) : el(doc, 'span', ''));
      head.appendChild(el(doc, 'span', 'dfs-count',
        state.done ? `共 ${total} 题` : `第 ${Math.min(state.cursor, total - 1) + 1} / ${total} 题`));
      root.appendChild(head);

      const answered = Object.keys(state.answers).length;
      const track = el(doc, 'div', 'dfs-track');
      const fill = el(doc, 'div', 'dfs-fill');
      fill.style.width = Math.round((state.done ? 1 : answered / total) * 100) + '%';
      track.appendChild(fill);
      root.appendChild(track);

      const rerender = () => root.replaceWith(renderQuizStep(doc, quiz, storeKey));

      const correct = quiz.questions.filter((q, i) => state.answers[i] === q.answerKey).length;

      if (state.done) {
        const summary = el(doc, 'div', 'dfs-summary');
        summary.appendChild(el(doc, 'div', 'dfs-score', `答对 ${correct} / ${total}`));
        const review = el(doc, 'div', 'dfs-review');
        quiz.questions.forEach((q, i) => {
          const ok = state.answers[i] === q.answerKey;
          const item = el(doc, 'div', 'dfs-item');
          item.appendChild(el(doc, 'span', 'dfs-mark ' + (ok ? 'ok' : 'no'), ok ? '✓' : '✗'));
          const body = el(doc, 'div', 'dfs-item-body');
          body.appendChild(el(doc, 'div', 'dfs-item-q', q.prompt));
          body.appendChild(el(doc, 'div', 'dfs-item-a',
            `你选 ${state.answers[i] || '-'}，正确答案 ${q.answerKey}${q.why ? ' · ' + q.why : ''}`));
          item.appendChild(body);
          review.appendChild(item);
        });
        summary.appendChild(review);

        const actions = el(doc, 'div', 'dfq-actions');
        actions.style.marginTop = '16px';
        actions.style.justifyContent = 'flex-end';
        const copy = el(doc, 'button', 'dfq-act', '复制结果');
        copy.type = 'button';
        copy.addEventListener('click', async () => {
          const lines = quiz.questions.map((q, i) =>
            `第 ${i + 1} 题：我选 ${state.answers[i] || '-'}，正确答案 ${q.answerKey} ${state.answers[i] === q.answerKey ? '✓' : '✗'}`);
          const text = `${label || '小测'} 结果：答对 ${correct}/${total}\n${lines.join('\n')}`;
          try {
            await navigator.clipboard.writeText(text);
            copy.textContent = '已复制';
          } catch {
            copy.textContent = '复制失败';
          }
          setTimeout(() => { copy.textContent = '复制结果'; }, 1600);
        });
        const reset = el(doc, 'button', 'dfq-reset', '重做');
        reset.type = 'button';
        reset.addEventListener('click', () => {
          try { window.localStorage.removeItem(storeKey); } catch { /* ignore */ }
          root.replaceWith(renderQuizStep(doc, quiz, storeKey));
        });
        actions.appendChild(copy);
        actions.appendChild(reset);
        summary.appendChild(actions);
        root.appendChild(summary);
        return root;
      }

      const index = Math.min(state.cursor, total - 1);
      const question = quiz.questions[index];
      const isAnswered = state.answers[index] !== undefined;
      const picked = isAnswered ? state.answers[index] : state.picks[index];

      root.appendChild(el(doc, 'div', 'dfs-q', question.prompt));

      const opts = el(doc, 'div', 'dfs-opts');
      for (const option of question.options) {
        const row = el(doc, 'button', 'dfs-opt');
        row.type = 'button';
        if (picked === option.key) row.classList.add('is-picked');
        if (isAnswered && option.key === question.answerKey) row.classList.add('is-right');
        if (isAnswered && option.key === picked && picked !== question.answerKey) row.classList.add('is-wrong');
        row.appendChild(el(doc, 'span', 'dfs-dot'));
        const text = el(doc, 'span', 'dfs-t');
        text.appendChild(el(doc, 'span', 'dfq-k', `${option.key}.`));
        text.appendChild(doc.createTextNode(option.text));
        row.appendChild(text);
        row.addEventListener('click', () => {
          if (isAnswered) return;
          state.picks[index] = option.key;
          try { window.localStorage.setItem(storeKey, JSON.stringify(state)); } catch { /* ignore */ }
          rerender();
        });
        opts.appendChild(row);
      }
      root.appendChild(opts);

      if (isAnswered) {
        const why = el(doc, 'div', 'dfq-why');
        why.appendChild(el(doc, 'b', '', picked === question.answerKey ? '答对了。' : `正确答案 ${question.answerKey}。`));
        if (question.why) why.appendChild(doc.createTextNode(' ' + question.why));
        root.appendChild(why);
      }

      const submit = el(doc, 'button', 'dfs-submit');
      submit.type = 'button';
      if (!isAnswered) {
        submit.textContent = '提交答案';
        submit.addEventListener('click', () => {
          if (state.picks[index] === undefined) {
            submit.textContent = '先选一个选项';
            setTimeout(() => {
              if (submit.isConnected) submit.textContent = '提交答案';
            }, 1200);
            return;
          }
          state.answers[index] = state.picks[index];
          try { window.localStorage.setItem(storeKey, JSON.stringify(state)); } catch { /* ignore */ }
          rerender();
        });
      } else {
        const last = index >= total - 1;
        submit.textContent = last ? '查看结果' : '下一题';
        submit.addEventListener('click', () => {
          if (last) state.done = true;
          else state.cursor = index + 1;
          try { window.localStorage.setItem(storeKey, JSON.stringify(state)); } catch { /* ignore */ }
          rerender();
        });
      }
      root.appendChild(submit);
      return root;
    }

    function renderQuiz(doc, quiz, storeKey) {
      return quiz.mode === 'list'
        ? renderQuizList(doc, quiz, storeKey)
        : renderQuizStep(doc, quiz, storeKey + ':step');
    }

    /** Code text, tolerating shiki's per-line <span class="line"> markup. */
    function codeText(pre) {
      const lineNodes = pre.querySelectorAll('.line');
      let text;
      if (lineNodes.length > 1) {
        text = Array.from(lineNodes).map((n) => n.textContent || '').join('\n');
      } else {
        const code = pre.querySelector('code') || pre;
        text = code.textContent || '';
      }
      return text.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    }

    function processPre(doc, pre) {
      let text;
      try {
        text = codeText(pre);
      } catch {
        return;
      }
      if (!text || text.indexOf('%%') < 0) return;

      const kind = detectKind(text);
      if (!kind) return;

      let node;
      if (kind === 'figure') {
        const fig = parseFigure(text);
        if (!fig || (!fig.blocks.length && !fig.title && !fig.sub)) return;
        node = renderFigure(doc, fig);
      } else if (kind === 'tree') {
        const tree = parseTree(text);
        if (!tree) return;
        node = renderTree(doc, tree);
      } else {
        const quiz = parseQuiz(text);
        if (!quiz) return;
        node = renderQuiz(doc, quiz, 'dsh-chat-figure:quiz:' + hashText(text));
      }

      const signature = text;
      const next = pre.nextElementSibling;
      if (next && next.classList && next.classList.contains('dfg')) {
        if (next.dataset.dfgSign === signature) {
          if (pre.style.display !== 'none') pre.style.display = 'none';
          return;
        }
        next.remove();
      }

      node.dataset.dfgSign = signature;
      pre.style.display = 'none';
      pre.parentNode.insertBefore(node, pre.nextSibling);
    }

    function install(doc) {
      injectStyle(doc);
      const scan = () => {
        try {
          // Re-assert the stylesheet: the host rewrites <head> when the theme
          // changes, which drops nodes it does not own.
          injectStyle(doc);
          for (const pre of doc.querySelectorAll('pre')) processPre(doc, pre);
        } catch {
          /* never let a malformed block break the transcript */
        }
      };
      scan();
      let timer = 0;
      const observer = new MutationObserver(() => {
        if (timer) return;
        timer = setTimeout(() => {
          timer = 0;
          scan();
        }, 120);
      });
      observer.observe(doc.body || doc.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      return () => {
        if (timer) clearTimeout(timer);
        observer.disconnect();
      };
    }

    const VERSION = '0.2.0';

    return {
      version: VERSION,
      // Exposed for the workspace smoke test; not used by the host.
      __figure: {
        parseFigure,
        renderFigure,
        parseTree,
        renderTree,
        parseQuiz,
        renderQuiz,
        renderQuizStep,
        renderQuizList,
        detectKind,
        codeText,
        processPre,
        install,
      },
      apply(ctx) {
        if (typeof document === 'undefined') return;
        const dispose = install(document);
        if (ctx && typeof ctx.effect === 'function') ctx.effect(() => dispose);
      },
    };
  },
});
