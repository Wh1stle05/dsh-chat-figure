import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.MutationObserver = dom.window.MutationObserver;

let plugin = null;
window.__ModuleLoader__ = {
  load({ id, factory }) {
    assert.equal(id, 'dsh-chat-figure');
    plugin = factory();
  },
};

await import('../lib/client.js');
assert.ok(plugin, 'factory should register');
const { parseFigure, renderFigure, processPre, parseTree, renderTree, parseQuiz, renderQuiz, detectKind } = plugin.__figure;

// ---------------------------------------------------------------- parse
const src = [
  '%%figure',
  'title: fork() 之后：一分为二',
  'sub: 父子各有独立 PID',
  'arrow: fork()',
  'row',
  'box gray: 父进程 Bash | PID 1000 · fork() 返回 1001',
  'box blue wide: 子进程 | PID 1001',
  'note: 返回值不同',
  'pills: PID, 虚拟地址空间',
  'foot: 复制的是“进程状态”。',
].join('\n');

const fig = parseFigure(src);
assert.equal(fig.title, 'fork() 之后：一分为二');
assert.equal(fig.sub, '父子各有独立 PID');
assert.equal(fig.foot, '复制的是“进程状态”。');
assert.deepEqual(fig.blocks.map((b) => b.type), ['arrow', 'row', 'note', 'pills']);
assert.equal(fig.blocks[1].boxes.length, 2);
assert.equal(fig.blocks[1].boxes[0].color, 'gray');
assert.equal(fig.blocks[1].boxes[0].title, '父进程 Bash');
assert.equal(fig.blocks[1].boxes[0].sub, 'PID 1000 · fork() 返回 1001');
assert.equal(fig.blocks[1].boxes[1].wide, true);
assert.deepEqual(fig.blocks[3].items, ['PID', '虚拟地址空间']);

// no sentinel -> null
assert.equal(parseFigure('title: x\nrow'), null);

// partial / streaming source still parses what it has
const partial = parseFigure('%%figure\ntitle: 半截\nbox blue: A');
assert.equal(partial.title, '半截');
assert.equal(partial.blocks[0].boxes[0].title, 'A');

// ---------------------------------------------------------------- render
const node = renderFigure(document, fig);
assert.equal(node.className, 'dfg');
assert.equal(node.querySelectorAll('.dfg-box').length, 2);
assert.equal(node.querySelector('.dfg-title').textContent, 'fork() 之后：一分为二');
assert.ok(node.querySelector('.dfg-chip code').textContent === 'fork()');
assert.ok(node.querySelector('.dfg-blue.dfg-wide'), 'wide modifier lands as class');
assert.ok(node.querySelector('.dfg-pill'), 'pills render');
assert.ok(node.querySelector('.dfg-foot'), 'foot renders');

// ---------------------------------------------------------------- DOM pass
const root = document.getElementById('root');
root.innerHTML = '<div class="md"><pre class="shiki"><code>%%figure\ntitle: 第一步\nbox blue: A | a\nnote: hi</code></pre></div>';
const pre = root.querySelector('pre');
processPre(document, pre);
assert.equal(pre.style.display, 'none', 'source block hidden');
const rendered = pre.nextElementSibling;
assert.ok(rendered && rendered.classList.contains('dfg'), 'figure inserted after block');

// idempotent: a second pass must not duplicate
processPre(document, pre);
assert.equal(root.querySelectorAll('.dfg').length, 1, 'no duplicate on rescan');

// changed source re-renders in place
pre.querySelector('code').textContent = '%%figure\ntitle: 第二步\nbox green: B';
processPre(document, pre);
assert.equal(root.querySelectorAll('.dfg').length, 1, 'replaces stale figure');
assert.equal(root.querySelector('.dfg-title').textContent, '第二步');

// shiki-style per-line spans are joined back into lines
const linePre = document.createElement('pre');
linePre.innerHTML = [
  '<code>',
  '<span class="line">%%figure</span>',
  '<span class="line">title: shiki 行</span>',
  '<span class="line">box amber: C | c</span>',
  '</code>',
].join('');
root.appendChild(linePre);
processPre(document, linePre);
assert.equal(linePre.style.display, 'none');
assert.ok(linePre.nextElementSibling.querySelector('.dfg-amber'), 'line spans handled');

// unrelated code blocks are untouched
const plain = document.createElement('pre');
plain.innerHTML = '<code>npm install</code>';
root.appendChild(plain);
processPre(document, plain);
assert.equal(plain.style.display, '', 'plain code block untouched');
assert.equal(plain.nextElementSibling, null);


// ---------------------------------------------------------------- tree
const treeSrc = ['%%tree', 'Bash (Shell)', '  Uvicorn 父进程', '    Worker 1', '    - Worker 2 | :8001', '# comment'].join('\n');
const tree = parseTree(treeSrc);
assert.deepEqual(tree.nodes.map((n) => [n.depth, n.title]), [
  [0, 'Bash (Shell)'], [1, 'Uvicorn 父进程'], [2, 'Worker 1'], [2, 'Worker 2'],
]);
assert.equal(tree.nodes[3].hint, ':8001');
const treeNode = renderTree(document, tree);
assert.equal(treeNode.querySelectorAll('.dft-row').length, 4);
assert.ok(treeNode.querySelector('.dft-ico'), 'root gets the terminal icon');
assert.equal(treeNode.querySelectorAll('.dft-arrow').length, 3, 'children get elbows');
assert.ok(treeNode.querySelector('.dft-t.is-parent'), 'parents are emphasised');
assert.ok(treeNode.querySelector('.dft-h'), 'hint renders');

// ---------------------------------------------------------------- quiz
const quizSrc = [
  '%%quiz',
  'title: 第 1 课 · 小测',
  'q: 子进程 execve 之后，PID 会怎样？',
  'A. 变成新的 PID',
  'B. 保持不变',
  'answer: B',
  'why: execve 只替换映像。',
  'q: Z 状态指什么？',
  'A. 占用 CPU',
  'B. 等待 IO',
  'C. 已退出但未被回收',
  'answer: C',
].join('\n');
const quiz = parseQuiz(quizSrc);
assert.equal(quiz.title, '第 1 课 · 小测');
assert.equal(quiz.questions.length, 2);
assert.deepEqual(quiz.questions[0].options.map((o) => o.key), ['A', 'B']);
assert.equal(quiz.questions[0].answerKey, 'B');
assert.equal(quiz.questions[0].why, 'execve 只替换映像。');

const quizNode = renderQuiz(document, quiz, 'test:quiz:1');
const firstOpts = quizNode.querySelectorAll('.dfq-q')[0].querySelectorAll('.dfq-opt');
assert.equal(firstOpts.length, 2);
firstOpts[1].click();
assert.ok(firstOpts[1].classList.contains('is-right'), 'correct pick is marked');
assert.notEqual(quizNode.querySelector('.dfq-why').style.display, 'none', 'explanation appears');
assert.match(quizNode.querySelector('.dfq-score').textContent, /1\/2/);

// wrong pick marks both the mistake and the right answer
const secondOpts = quizNode.querySelectorAll('.dfq-q')[1].querySelectorAll('.dfq-opt');
secondOpts[0].click();
assert.ok(secondOpts[0].classList.contains('is-wrong'));
assert.ok(secondOpts[2].classList.contains('is-right'));
assert.match(quizNode.querySelector('.dfq-score').textContent, /1\/2/);

// answers survive a re-render (same content hash)
const quizAgain = renderQuiz(document, quiz, 'test:quiz:1');
assert.ok(quizAgain.querySelectorAll('.dfq-q')[0].querySelectorAll('.dfq-opt')[1].classList.contains('is-picked'));
assert.match(quizAgain.querySelector('.dfq-score').textContent, /答完 2 题/);

// reset clears them and swaps in a fresh card
root.appendChild(quizAgain);
quizAgain.querySelector('.dfq-reset').click();
const afterReset = root.querySelector('.dfg-quiz');
assert.match(afterReset.querySelector('.dfq-score').textContent, /点选项作答/);
assert.equal(afterReset.querySelectorAll('.dfq-opt.is-picked').length, 0);

// ---------------------------------------------------------------- dispatch
assert.equal(detectKind('%%figure\ntitle: x'), 'figure');
assert.equal(detectKind('%%tree\nroot'), 'tree');
assert.equal(detectKind('%%quiz\nq: x'), 'quiz');
assert.equal(detectKind('console.log(1)'), null, 'plain code is ignored');

const quizPre = document.createElement('pre');
quizPre.innerHTML = '<code>' + quizSrc + '</code>';
root.appendChild(quizPre);
processPre(document, quizPre);
assert.equal(quizPre.style.display, 'none');
assert.ok(quizPre.nextElementSibling.classList.contains('dfg-quiz'));

console.log('smoke: all assertions passed');
