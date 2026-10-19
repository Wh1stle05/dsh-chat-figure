// dsh-chat-figure — browser half.
//
// Loaded by dsh-client-modules and executed through the lazy-CJS module table
// (`window.__ModuleLoader__.load`). Everything lives in the factory closure:
// registering the factory has no side effects, and `apply` owns the observer.
//
// What it does: finds ```figure code blocks in the rendered transcript, parses
// the tiny line-oriented DSL inside them, and renders a real HTML figure in
// place of the code block. Text stays real text, so it inherits the chat's font
// size and the host theme instead of being a downscaled bitmap.
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
.dfg{margin:16px auto;max-width:720px;border:1px solid color-mix(in srgb,currentColor 11%,transparent);border-radius:14px;padding:14px 16px 12px;background:color-mix(in srgb,currentColor 2%,transparent)}
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
.dfg-gray{background:color-mix(in srgb,currentColor 5%,transparent);border-color:color-mix(in srgb,currentColor 14%,transparent)}
.dfg-plain{background:transparent;border-color:color-mix(in srgb,currentColor 13%,transparent)}
.dfg-arrow{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 0}
.dfg-bar{width:2px;height:18px;background:currentColor;opacity:.45}
.dfg-bar--end{position:relative;height:18px;margin-bottom:2px}
.dfg-bar--end::after{content:"";position:absolute;left:50%;bottom:-3px;transform:translateX(-50%);border:7px solid transparent;border-top-color:currentColor;opacity:.6}
.dfg-chip{margin:2px 0;padding:3px 11px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 15%,transparent);background:color-mix(in srgb,currentColor 2%,transparent)}
.dfg-chip code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.79em;background:none;padding:0;border:0;color:inherit}
.dfg-note{text-align:center;font-size:.81em;opacity:.6;margin-top:10px;line-height:1.55}
.dfg-pills{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:10px}
.dfg-pill{border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:999px;padding:2px 10px;font-size:.78em;opacity:.75}
.dfg-foot{margin-top:14px;padding-top:10px;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:.78em;opacity:.55;line-height:1.65}
.dfg-gap{height:6px}
@media (max-width:560px){.dfg-row{flex-direction:column}}
`;

    function injectStyle(doc) {
      if (doc.getElementById(STYLE_ID)) return;
      const style = doc.createElement('style');
      style.id = STYLE_ID;
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

      const fig = parseFigure(text);
      if (!fig) return;
      if (!fig.blocks.length && !fig.title && !fig.sub) return;

      const signature = text;
      const next = pre.nextElementSibling;
      if (next && next.classList && next.classList.contains('dfg')) {
        if (next.dataset.dfgSign === signature) {
          if (pre.style.display !== 'none') pre.style.display = 'none';
          return;
        }
        next.remove();
      }

      const node = renderFigure(doc, fig);
      node.dataset.dfgSign = signature;
      pre.style.display = 'none';
      pre.parentNode.insertBefore(node, pre.nextSibling);
    }

    function install(doc) {
      injectStyle(doc);
      const scan = () => {
        try {
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

    return {
      // Exposed for the workspace smoke test; not used by the host.
      __figure: { parseFigure, renderFigure, codeText, processPre, install },
      apply(ctx) {
        if (typeof document === 'undefined') return;
        const dispose = install(document);
        if (ctx && typeof ctx.effect === 'function') ctx.effect(() => dispose);
      },
    };
  },
});
