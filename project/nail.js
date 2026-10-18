/* ============================================================
   打孔上钉 · 手机/平板端游戏逻辑（新流程）
   状态机：
     LIGHTUP  → 工作台亮起 + 移至操作台渐显 → 停留 → 渐暗
     SLIDE_IN → 瓷杯上滑(渐显) + 开始体验渐显 + 连孔上钉渐显闪烁两下(实/虚)
     CUP_ADJUST → 开始体验消失 + 瓷杯上移(after) + 连孔上钉移位(after) → 渐暗 → 上钉替代
     BASES_SHOW → 上钉消失 + 梅花钉底图渐显 + 柳叶钉底图渐显 + 连线提示
     DRILLING(梅花钉) → 每孔底图渐透 → 完成 → 钉图从大缩小渐显 + 文字渐显→渐暗 → 半透明
     DRILLING(柳叶钉) → 同上
     COMPLETE → 游戏结束
   先梅花钉后柳叶钉（顺序），所有参数在 CONFIG 中集中维护
   ============================================================ */
(function () {
'use strict';

const CONFIG = {
        timings: {
        lightUpMs: 1400, moveShowMs: 1800, moveFadeMs: 800,
        slideInMs: 1200, slideFadeMs: 900, startExpFadeMs: 900, connectFadeMs: 900,
        connectBlinkMs: 500, connectBlinks: 2, cupMoveMs: 1100, connectReplaceMs: 900,
        baseFadeMs: 900, baseGapMs: 600, nailAppearMs: 900, nailShrinkMs: 1200,
        textFadeMs: 900, textShowMs: 3500, textFadeOutMs: 900, nailSemiMs: 900,
        connectLineFadeMs: 900, holeGapMs: 280, nailPromptShowMs: 1800,
    },
    layout: {
        heightRatio: 0.80,
        cup: {
            before: { left: 50.26, top: 77.9, height: 95.04 },
            after:  { left: 50.26, top: 68.04, height: 95.04 },
        },
    },
    bases: [
        { src: '/image/游戏/上钉/image/梅花钉底图.webp',
          pos: { left: 40.14, top: 15.64, width: 19.95, aspect: 0.6342519685039371 } },
        { src: '/image/游戏/上钉/image/柳叶钉底图.webp',
          pos: { left: 39.06, top: 36.69, width: 22.51, aspect: 0.6342519685039371 } }
    ],
    prompts: {
        move:            { width: 92.47, top: 65.72, left: 49.98 },
        startExperience: { width: 92.19, top: 65.72, left: 49.82 },
        connectBefore:   { width: 9.42, top: 12.97, left: 49.74 },
        connectAfter:    { width: 9.42, top: 46.4, left: 50.37 },
        nail:            { width: 11.53, top: 45.05, left: 50.22 },
        connectLine:     { width: 42.77, top: 12.31, left: 49.9 },
    },
    hole: { width: 3.5, aspect: 1, zoneRadius: 4 },
    target: { width: 4 },
    nails: [
        {
            method: '梅花钉',
            holes: [
                { x: 50, y: 27.83 },
                { x: 55.93, y: 32.94 },
                { x: 44.3, y: 32.94 },
                { x: 55.42, y: 41.06 },
                { x: 44.53, y: 41.13 },
                { x: 50.17, y: 45.04 }
            ],
            segments: [[0, 2, 4, 5, 3, 1, 0]],
            achievement: {
                nails: [
                    { src: '/image/游戏/上钉/image/梅花钉.webp',
                      pos: { width: 27.3, left: 36.44, top: 18.57 }, initialScale: 1.5 }
                ],
                text: { src: '/image/游戏/上钉/image/成就——梅花钉文字.webp',
                        pos: { right: -16.97, top: 45.11, height: 41.5, offsetX: -6, aspect: 3.6504927975739196 } },
            },
        },
        {
            method: '柳叶钉',
            holes: [
                { x: 46.24, y: 54.74 },
                { x: 54.16, y: 54.67 },
                { x: 46.24, y: 64.37 },
                { x: 54.16, y: 64.67 }
            ],
            segments: [[0, 1], [2, 3]],
            achievement: {
                nails: [
                    { src: '/image/游戏/上钉/image/柳叶钉.webp',
                      pos: { width: 27.24, left: 36.38, top: 46.02 }, initialScale: 1.5 },
                    { src: '/image/游戏/上钉/image/柳叶钉.webp',
                      pos: { width: 27.24, left: 36.55, top: 55.72 }, initialScale: 1.5 }
                ],
                text: { src: '/image/游戏/上钉/image/成就——柳叶钉文字.webp',
                        pos: { right: -16.85, top: 46.46, height: 37.14, offsetX: -6, aspect: 4.184166666666667 } },
            },
        }
    ],
        complete: {
        timings: { bgMs: 1200, patternMs: 1600, levelMs: 700, scoreMs: 900, backMs: 900, congratsMs: 900 },
        components: {
            bg:       { src: '/image/游戏/上钉/image/结算背景.webp' },
            pattern:    { src: '/image/游戏/上钉/image/结算图案.webp', left: 24.57, top: 50.31, width: 46 },
            level:    { src: '/image/游戏/上钉/image/等级.webp', left: 71.68, top: 39.2, width: 44.17 },
            score:    { src: '/image/游戏/上钉/image/分数.webp', left: 71.79, top: 76.27, width: 44.45 },
            congrats:    { src: '/image/游戏/上钉/image/恭喜.webp', left: 23.91, top: 84.97, width: 47.08 },
        },
    },
    nailOrder: ['梅花钉', '柳叶钉'],
};

/* ---------------- DOM ---------------- */
const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const stage = $('stage');
const blackout = $('blackout');
const tableBg = $('table-bg');
const promptMove = $('prompt-move');
const promptStart = $('prompt-start');           // 提示——开始体验
const promptConnectNail = $('prompt-connect-nail'); // 提示——连孔上钉
const promptNail = $('prompt-nail');             // 提示——上钉
const playStage = $('play-stage');
const play = $('play');
const cupBox = $('cup-box');
const cup = $('cup');
const basesBox = $('bases');
const cupSvg = $('cup-svg');
const holesBox = $('holes');
const holeHint = $('hole-hint');
const achBox = $('achievements');
const promptConnect = $('prompt-connect');      // 提示——连线
const complete = $('complete');
const exitBtn = $('exit-btn');

/* ---------------- 视口适配 ---------------- */
function syncAppHeight() {
    const w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const root = document.documentElement;
    root.style.setProperty('--app-width', w + 'px');
    root.style.setProperty('--app-height', h + 'px');
}
syncAppHeight();
document.addEventListener('DOMContentLoaded', syncAppHeight, { once: true });
let _resizeTimer = null;
function _onResize() { if (_resizeTimer) clearTimeout(_resizeTimer); _resizeTimer = setTimeout(syncAppHeight, 60); }
window.addEventListener('resize', _onResize, { passive: true });
window.addEventListener('orientationchange', _onResize, { passive: true });
if (window.visualViewport) {
    visualViewport.addEventListener('resize', _onResize, { passive: true });
    visualViewport.addEventListener('scroll', _onResize, { passive: true });
}

/* ---------------- 状态 ---------------- */
let state = 'INTRO';
let endReady = false;
let progress = [];
let currentNailIdx = 0;  // 当前正在玩的钉索引（顺序：先梅花钉后柳叶钉）
let nailsDone = 0;       // 已完成的钉数量（用于按阶段判分）
const placedHoles = new Set();
let dragging = false;
let previewLine = null;

/* ---------------- 工具 ---------------- */
function svgEl(name, attrs) { const e = document.createElementNS(SVG_NS, name); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
function setStyle(el, obj) { for (const k in obj) el.style[k] = obj[k]; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
// 一次会话内用同一个版本号：同一张图多次 bust 会命中同一个 URL，不会重复下载。
const ASSET_VERSION = Date.now();
function bust(src) { return src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=' + ASSET_VERSION; }
function fmt(n) { return Math.round(n * 100) / 100; }

/* ---------------- 构建底图 ---------------- */
function buildBases() {
    basesBox.innerHTML = '';
    CONFIG.bases.forEach((b, i) => {
        const img = document.createElement('img');
        img.src = b.src;
        img.className = 'base';
        img.dataset.nail = String(i);
        const p = b.pos;
        setStyle(img, { left: p.left + '%', top: p.top + '%', width: p.width + '%', aspectRatio: String(p.aspect), height: 'auto', display: 'none', opacity: '0' });
        basesBox.appendChild(img);
    });
}

/* ---------------- 应用瓷杯位置（before/after 两套） ---------------- */
function applyCupLayout(which) {
    const c = CONFIG.layout.cup[which] || CONFIG.layout.cup.before;
    setStyle(cupBox, { left: c.left + '%', top: c.top + '%', height: c.height + '%', transform: 'translate(-50%, -50%)' });
}

/* ---------------- 应用所有提示位置 ---------------- */
function applyPrompts() {
    const p = CONFIG.prompts;
    promptMove.src = bust(promptMove.src);
    promptStart.src = bust(promptStart.src);
    promptConnectNail.src = bust(promptConnectNail.src);
    promptNail.src = bust(promptNail.src);
    promptConnect.src = bust(promptConnect.src);
    setStyle(promptMove, { width: p.move.width + '%', top: p.move.top + '%', left: p.move.left + '%', transform: 'translateX(-50%)' });
    setStyle(promptStart, { width: p.startExperience.width + '%', top: p.startExperience.top + '%', left: p.startExperience.left + '%', transform: 'translateX(-50%)' });
    setStyle(promptConnectNail, { width: p.connectBefore.width + '%', top: p.connectBefore.top + '%', left: p.connectBefore.left + '%', transform: 'translateX(-50%)' });
    setStyle(promptNail, { width: p.nail.width + '%', top: p.nail.top + '%', left: p.nail.left + '%', transform: 'translateX(-50%)' });
    setStyle(promptConnect, { width: p.connectLine.width + '%', top: p.connectLine.top + '%', left: p.connectLine.left + '%', transform: 'translateX(-50%)' });
}

/* ---------------- 构建成就图层 ---------------- */
function buildAchievements() {
    achBox.innerHTML = '';
    CONFIG.nails.forEach((nail, idx) => {
        const ach = nail.achievement;
        ach.nails.forEach((n, k) => {
            const nailImg = document.createElement('img');
            nailImg.src = n.src;
            nailImg.className = 'nail-ach';
            nailImg.dataset.method = nail.method;
            nailImg.dataset.idx = String(k);
            const np = n.pos;
            setStyle(nailImg, { position: 'absolute', width: np.width + '%', left: np.left + '%', top: np.top + '%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain', opacity: 0, display: 'none' });
            achBox.appendChild(nailImg);
        });
        const txt = document.createElement('div');
        txt.className = 'nail-text';
        txt.dataset.method = nail.method;
        const tp = ach.text.pos;
        setStyle(txt, { position: 'absolute', right: tp.right + '%', top: tp.top + '%', transform: `translateY(-50%) translateX(${tp.offsetX ?? -6}%)`, height: tp.height + '%', aspectRatio: String(tp.aspect ?? (1329 / 2860)), display: 'none', opacity: 0 });
        const tImg = document.createElement('img');
        tImg.src = ach.text.src;
        setStyle(tImg, { width: '100%', height: '100%', objectFit: 'contain' });
        txt.appendChild(tImg);
        achBox.appendChild(txt);
    });
}

/* ---------------- 连线 SVG ---------------- */
function clearLines() { cupSvg.innerHTML = ''; }
function clearLinesOf(idx) { Array.prototype.forEach.call(cupSvg.querySelectorAll(`line[data-nail="${idx}"], path[data-nail="${idx}"]`), (el) => el.remove()); }
function drawLineFromTo(nailIdx, ax, ay, bx, by) {
    cupSvg.appendChild(svgEl('line', { x1: ax, y1: ay, x2: bx, y2: by, class: 'connect-line', 'data-nail': String(nailIdx) }));
}

/* ---------------- 孔图层 ---------------- */
function clearHoles() { holesBox.innerHTML = ''; placedHoles.clear(); }
function clearHolesOf(idx) {
    Array.prototype.forEach.call(holesBox.querySelectorAll(`.hole[data-nail="${idx}"]`), (el) => { placedHoles.delete(el.dataset.cx + ',' + el.dataset.cy); el.remove(); });
}
function placeHole(nailIdx, x, y) {
    const key = x + ',' + y;
    if (placedHoles.has(key)) return;
    placedHoles.add(key);
    const img = document.createElement('img');
    img.src = '/image/游戏/上钉/image/孔.png';
    img.className = 'hole';
    img.dataset.nail = String(nailIdx);
    img.dataset.cx = String(x);
    img.dataset.cy = String(y);
    setStyle(img, { left: x + '%', top: y + '%', width: CONFIG.hole.width + '%', aspectRatio: String(CONFIG.hole.aspect), height: 'auto' });
    holesBox.appendChild(img);
}

/* ---------------- 目标圈 ---------------- */
function clearTargets() { holeHint.innerHTML = ''; }
function clearTarget(nailIdx) { const el = holeHint.querySelector('.hole-target[data-nail="' + nailIdx + '"]'); if (el) el.remove(); }
function showTarget(nailIdx, x, y, kind) {
    const t = document.createElement('div');
    t.className = 'hole-target' + (kind ? ' ' + kind : '');
    t.dataset.nail = String(nailIdx);
    setStyle(t, { left: x + '%', top: y + '%', width: CONFIG.target.width + '%', aspectRatio: '1 / 1', height: 'auto' });
    holeHint.appendChild(t);   // 仅作视觉引导，连接改为拖动
}

/* ============================================================
   流程
   ============================================================ */
function startIntro() {
    if (window.NailAudio) window.NailAudio.startGame();
    // 进入正式游戏：停掉「游戏初始界面」BGM，起「正式游戏」BGM（四个小游戏共用）
    if (window.GameBgm) window.GameBgm.start();
    endReady = false;
    // 移至操作台提示消失前先隐藏结束图标，避免和提示文字同屏影响观赏
    if (exitBtn) {
        exitBtn.classList.add('hidden');
        exitBtn.classList.remove('ready');
    }
    lightUp();
}

/* 1. 工作台亮起 + 移至操作台渐显 → 停留 → 渐暗 → 瓷杯上滑 */
function lightUp() {
    state = 'LIGHTUP';
    tableBg.classList.remove('hidden');
    requestAnimationFrame(() => tableBg.classList.add('show'));

    // 移至操作台渐显
    promptMove.classList.remove('hidden');
    promptMove.style.transition = `opacity ${CONFIG.timings.moveFadeMs}ms ease`;
    promptMove.style.pointerEvents = 'auto';
    promptMove.style.cursor = 'pointer';
    requestAnimationFrame(() => promptMove.style.opacity = '1');

    // 等待用户点击：点击后渐渐消失，再进入瓷杯上滑
    const onMoveClick = () => {
        promptMove.removeEventListener('click', onMoveClick);
        promptMove.style.pointerEvents = 'none';
        promptMove.style.opacity = '0';
        setTimeout(() => {
            promptMove.classList.add('hidden');
            // 文字提示彻底消失后，右下角再出现结束图标
            if (exitBtn) exitBtn.classList.remove('hidden', 'ready');
            slideInCup();
        }, CONFIG.timings.moveFadeMs);
    };
    promptMove.addEventListener('click', onMoveClick);
}

/* 2. 瓷杯上滑(渐显) + 开始体验渐显 + 连孔上钉渐显闪烁 */
function slideInCup() {
    state = 'SLIDE_IN';
    playStage.classList.remove('hidden');
    play.classList.remove('hidden');

    // 瓷杯从下方上滑（before 位置）+ 渐显
    applyCupLayout('before');
    play.classList.add('slide-in');
    if (window.NailAudio) window.NailAudio.cupMove();
    cupBox.style.opacity = '0';
    requestAnimationFrame(() => {
        cupBox.style.transition = `opacity ${CONFIG.timings.slideFadeMs}ms ease`;
        cupBox.style.opacity = '1';
    });

    // 开始体验渐显（下方）
    promptStart.classList.remove('hidden');
    promptStart.style.transition = `opacity ${CONFIG.timings.startExpFadeMs}ms ease`;
    requestAnimationFrame(() => promptStart.style.opacity = '1');

    // 连孔上钉渐显（上方，connectBefore 位置）
    promptConnectNail.classList.remove('hidden');
    promptConnectNail.style.transition = `opacity ${CONFIG.timings.connectFadeMs}ms ease`;
    requestAnimationFrame(() => promptConnectNail.style.opacity = '1');

    // 瓷杯上滑完成后，连孔上钉闪烁两下，然后等待用户点击它再下移
    setTimeout(() => {
        blinkConnectNail(CONFIG.timings.connectBlinks, () => {
            promptConnectNail.style.pointerEvents = 'auto';
            promptConnectNail.style.cursor = 'pointer';
            promptConnectNail.onclick = () => {
                promptConnectNail.onclick = null;
                promptConnectNail.style.pointerEvents = 'none';
                promptConnectNail.style.cursor = 'default';
                adjustCup();
            };
        });
    }, CONFIG.timings.slideInMs + CONFIG.timings.connectFadeMs);
}

/* 连孔上钉闪烁（实/虚交替） */
function blinkConnectNail(times, cb) {
    let i = 0;
    const total = times * 2;
    const step = () => {
        if (i >= total) { promptConnectNail.style.opacity = '1'; if (cb) cb(); return; }
        promptConnectNail.style.transition = `opacity ${CONFIG.timings.connectBlinkMs}ms ease`;
        promptConnectNail.style.opacity = (i % 2 === 0) ? '0.3' : '1';
        i++;
        setTimeout(step, CONFIG.timings.connectBlinkMs);
    };
    step();
}

/* 3. 开始体验消失 + 瓷杯上移(after) + 连孔上钉移位(after) → 渐暗 → 上钉替代 */
function adjustCup() {
    state = 'CUP_ADJUST';
    const t = CONFIG.timings;

    // 开始体验消失
    promptStart.style.opacity = '0';

    // 瓷杯上移到 after 位置
    setTimeout(() => {
        const ca = CONFIG.layout.cup.after;
        if (window.NailAudio) window.NailAudio.cupMove();
        cupBox.style.transition = `left ${t.cupMoveMs}ms ease, top ${t.cupMoveMs}ms ease, height ${t.cupMoveMs}ms ease`;
        setStyle(cupBox, { left: ca.left + '%', top: ca.top + '%', height: ca.height + '%' });
    }, t.startExpFadeMs / 2);

    // 连孔上钉移位到 connectAfter
    setTimeout(() => {
        const ca = CONFIG.prompts.connectAfter;
        promptConnectNail.style.transition = `top ${t.cupMoveMs}ms ease, left ${t.cupMoveMs}ms ease, width ${t.cupMoveMs}ms ease`;
        promptConnectNail.style.top = ca.top + '%';
        promptConnectNail.style.left = ca.left + '%';
        promptConnectNail.style.width = ca.width + '%';
    }, t.startExpFadeMs / 2);

    // 连孔上钉渐暗 → 上钉渐显 + 闪烁两下（实/虚交替）
    setTimeout(() => {
        promptConnectNail.style.transition = `opacity ${t.connectReplaceMs}ms ease`;
        promptConnectNail.style.opacity = '0';

        promptNail.classList.remove('hidden');
        promptNail.style.transition = `opacity ${t.connectReplaceMs}ms ease`;
        requestAnimationFrame(() => promptNail.style.opacity = '1');

        // ★ 上钉闪烁两下（实/虚交替），闪烁完成后保持显示（不消失）
        blinkNail(CONFIG.timings.connectBlinks, () => {
            // 闪烁完成，上钉保持显示，不再自动消失
            // 等待底图渐显完成后，进入打孔阶段
            setTimeout(() => {
                showBasesAndConnect();
            }, 600); // 给底图渐显留出时间
        });

    }, t.startExpFadeMs + t.cupMoveMs);
}

/* 上钉闪烁（实/虚交替），与连孔上钉一致 */
function blinkNail(times, cb) {
    let i = 0;
    const total = times * 2;
    const step = () => {
        if (i >= total) { 
            promptNail.style.opacity = '1'; 
            if (cb) cb(); 
            return; 
        }
        promptNail.style.transition = `opacity ${CONFIG.timings.connectBlinkMs}ms ease`;
        promptNail.style.opacity = (i % 2 === 0) ? '0.3' : '1';
        i++;
        setTimeout(step, CONFIG.timings.connectBlinkMs);
    };
    step();
}

/* 4. 底图渐显(梅花钉先,柳叶钉后) + 连线提示 */
function showBasesAndConnect() {
    state = 'BASES_SHOW';
    const t = CONFIG.timings;

    // 梅花钉底图渐显
    const base0 = basesBox.children[0];
    if (base0) {
        base0.style.display = 'block';
        if (window.NailAudio) window.NailAudio.silhouette();
        base0.style.transition = `opacity ${t.baseFadeMs}ms ease`;
        requestAnimationFrame(() => base0.style.opacity = '1');
    }

    // ★ 上钉保持显示，与底图共存

    // 柳叶钉底图随后渐显
    setTimeout(() => {
        const base1 = basesBox.children[1];
        if (base1) {
            base1.style.display = 'block';
            if (window.NailAudio) window.NailAudio.silhouette();
            base1.style.transition = `opacity ${t.baseFadeMs}ms ease`;
            requestAnimationFrame(() => base1.style.opacity = '1');
        }
    }, t.baseGapMs);

    // 连线提示渐显
    setTimeout(() => {
        promptConnect.classList.remove('hidden');
        promptConnect.style.transition = `opacity ${t.connectLineFadeMs}ms ease`;
        requestAnimationFrame(() => promptConnect.style.opacity = '1');
    }, t.baseFadeMs + t.baseGapMs);

    // 进入梅花钉打孔
    setTimeout(() => {
        promptConnect.style.opacity = '0';
        setTimeout(startNail, t.connectLineFadeMs, 0);
    }, t.baseFadeMs + t.baseGapMs + t.connectLineFadeMs + 800);
}

/* 5. 开始某种钉的连接：起点孔先就位，目标圈引导拖到下一个孔 */
function startNail(idx) {
    currentNailIdx = idx;
    state = 'DRILLING';
    progress = CONFIG.nails.map((_, i) => ({ segIdx: 0, stepIdx: 0, completed: false, started: false }));
    clearHoles(); clearLines(); clearTargets();
    const nail = CONFIG.nails[idx];
    const first = nail.holes[nail.segments[0][0]];
    placeHole(idx, first.x, first.y);
    showNextTarget(idx);
}

function currentHole(nailIdx) {
    const p = progress[nailIdx];
    const nail = CONFIG.nails[nailIdx];
    const seg = nail.segments[p.segIdx];
    return nail.holes[seg[p.stepIdx]];
}

function nextHole(nailIdx) {
    const p = progress[nailIdx];
    const nail = CONFIG.nails[nailIdx];
    const seg = nail.segments[p.segIdx];
    const nextIdx = p.stepIdx + 1;
    if (nextIdx >= seg.length) return null;
    return { idx: seg[nextIdx], hole: nail.holes[seg[nextIdx]] };
}

function showNextTarget(nailIdx) {
    // 空闲时提示圈落在“现在需要按住”的当前孔；开始拖动后再移到下一目标孔。
    const cur = currentHole(nailIdx);
    if (cur) showTarget(nailIdx, cur.x, cur.y, 'source');
}

/* 6. 拖动连线：从当前已就位的孔拖到目标圈附近即完成 */
function cupPoint(e) {
    const r = cupBox.getBoundingClientRect();
    return {
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
    };
}

function onCupPointerDown(e) {
    if (state !== 'DRILLING') return;
    const pt = cupPoint(e);
    const cur = currentHole(currentNailIdx);
    const r = CONFIG.hole.zoneRadius;
    if (dist2(pt.x, pt.y, cur.x, cur.y) > r * r) return;
    dragging = true;
    clearTarget(currentNailIdx);
    const nxt = nextHole(currentNailIdx);
    if (nxt) showTarget(currentNailIdx, nxt.hole.x, nxt.hole.y, 'target');
    previewLine = svgEl('line', {
        x1: cur.x, y1: cur.y, x2: pt.x, y2: pt.y,
        class: 'connect-line preview', 'data-nail': String(currentNailIdx),
    });
    cupSvg.appendChild(previewLine);
    try { cupBox.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
}

function onCupPointerMove(e) {
    if (!dragging || !previewLine) return;
    const pt = cupPoint(e);
    previewLine.setAttribute('x2', String(pt.x));
    previewLine.setAttribute('y2', String(pt.y));
    e.preventDefault();
}

function onCupPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    if (previewLine) { previewLine.remove(); previewLine = null; }
    try { cupBox.releasePointerCapture(e.pointerId); } catch (err) {}
    const nxt = nextHole(currentNailIdx);
    if (!nxt) return;
    const pt = cupPoint(e);
    const r = CONFIG.hole.zoneRadius;
    if (dist2(pt.x, pt.y, nxt.hole.x, nxt.hole.y) > r * r) {
        clearTarget(currentNailIdx);
        showNextTarget(currentNailIdx);
        return; // 未对准，可重试
    }
    onHoleConnect(currentNailIdx, nxt.idx);
}

/* 7. 连上一孔：落孔 + 连线 + 底图渐透，随后引导下一目标 */
function onHoleConnect(nailIdx, holeIdx) {
    if (state !== 'DRILLING') return;
    if (nailIdx !== currentNailIdx) return;
    const p = progress[nailIdx];
    if (!p || p.completed) return;
    const nail = CONFIG.nails[nailIdx];
    const seg = nail.segments[p.segIdx];
    const hole = nail.holes[holeIdx];

    clearTarget(nailIdx);
    placeHole(nailIdx, hole.x, hole.y);

    const prev = currentHole(nailIdx);
    drawLineFromTo(nailIdx, prev.x, prev.y, hole.x, hole.y);

    // ★ 每连一孔，底图变透明一些；同时上钉也同步变透明（梅花钉阶段）
    const baseEl = basesBox.querySelector(`.base[data-nail="${nailIdx}"]`);
    if (baseEl) {
        const totalHoles = nail.holes.length;
        const cur = parseFloat(baseEl.style.opacity) || 1;
        const next = Math.max(0, cur - 1 / totalHoles);
        baseEl.style.transition = 'opacity 0.3s ease';
        baseEl.style.opacity = String(next);

        if (nailIdx === 0) {
            promptNail.style.transition = 'opacity 0.3s ease';
            promptNail.style.opacity = String(next);
        }
    }

    p.stepIdx++;
    p.started = true;

    if (p.stepIdx >= seg.length - 1) {
        p.segIdx++;
        p.stepIdx = 0;
        if (p.segIdx >= nail.segments.length) {
            p.completed = true;
            clearTarget(nailIdx);
            setTimeout(onNailComplete, CONFIG.timings.holeGapMs, nailIdx);
            return;
        }
        // 下一条线段：先落起点孔
        const ns = nail.segments[p.segIdx];
        const first = nail.holes[ns[0]];
        placeHole(nailIdx, first.x, first.y);
    }

    setTimeout(() => showNextTarget(nailIdx), CONFIG.timings.holeGapMs);
}

function bindConnectGestures() {
    cupBox.addEventListener('pointerdown', onCupPointerDown);
    cupBox.addEventListener('pointermove', onCupPointerMove);
    cupBox.addEventListener('pointerup', onCupPointerUp);
    cupBox.addEventListener('pointercancel', onCupPointerUp);
}

/* 8. 某钉完成：清除孔+线 → 底图消失 → 钉图从大缩小渐显 + 文字渐显→渐暗 → 半透明 → 下一钉或结束 */
function onNailComplete(idx) {
    clearHolesOf(idx);
    clearLinesOf(idx);
    nailsDone = Math.max(nailsDone, idx + 1);

    const nail = CONFIG.nails[idx];
    const t = CONFIG.timings;
    const achImgs = achBox.querySelectorAll(`.nail-ach[data-method="${nail.method}"]`);
    const txt = achBox.querySelector(`.nail-text[data-method="${nail.method}"]`);

    // ★ 如果是梅花钉完成，上钉完全消失
    if (idx === 0) {
        promptNail.style.transition = `opacity ${t.baseFadeMs}ms ease`;
        promptNail.style.opacity = '0';
        setTimeout(() => { promptNail.classList.add('hidden'); }, t.baseFadeMs);
    }

    // 底图完全消失
    const baseEl = basesBox.querySelector(`.base[data-nail="${idx}"]`);
    if (baseEl) {
        baseEl.style.transition = `opacity ${t.baseFadeMs}ms ease`;
        baseEl.style.opacity = '0';
        setTimeout(() => { if (baseEl) baseEl.style.display = 'none'; }, t.baseFadeMs);
    }

    if (!achImgs.length || !txt) return;

    if (window.NailAudio) window.NailAudio.nailAppear();

    // 钉图从大 initialScale 渐显 + 渐渐缩小到 1
    achImgs.forEach(el => {
        const achCfg = nail.achievement.nails[parseInt(el.dataset.idx) || 0];
        const initScale = achCfg.initialScale || 1.4;
        el.style.display = 'block';
        el.style.transform = `scale(${initScale})`;
        el.style.transition = `opacity ${t.nailAppearMs}ms ease, transform ${t.nailShrinkMs}ms ease`;
        void el.offsetWidth;
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
    });

    // 文字渐显
    setTimeout(() => {
        txt.style.display = 'block';
        txt.style.transition = `opacity ${t.textFadeMs}ms ease`;
        void txt.offsetWidth;
        txt.style.opacity = '1';
    }, t.nailAppearMs);

    // 文字显示后渐暗
    setTimeout(() => {
        txt.style.opacity = '0';
        setTimeout(() => { txt.style.display = 'none'; }, t.textFadeOutMs);
    }, t.nailAppearMs + t.textFadeMs + t.textShowMs);

    // 钉图变半透明
    setTimeout(() => {
        achImgs.forEach(el => {
            el.style.transition = `opacity ${t.nailSemiMs}ms ease`;
            el.style.opacity = '0.5';
        });
    }, t.nailAppearMs + t.textFadeMs + t.textShowMs + t.textFadeOutMs);

    // 下一钉或结束
    const nextIdx = idx + 1;
    const transitionDelay = t.nailAppearMs + t.textFadeMs + t.textShowMs + t.textFadeOutMs + t.nailSemiMs;
    if (nextIdx < CONFIG.nails.length) {
        setTimeout(() => {
            promptConnect.classList.remove('hidden');
            promptConnect.style.transition = `opacity ${t.connectLineFadeMs}ms ease`;
            requestAnimationFrame(() => promptConnect.style.opacity = '1');
            setTimeout(() => {
                promptConnect.style.opacity = '0';
                setTimeout(() => startNail(nextIdx), t.connectLineFadeMs);
            }, t.connectLineFadeMs + 800);
        }, transitionDelay);
    } else {
        setTimeout(finishGame, transitionDelay);
    }
}

/* 结算层：背景渐显 → 图案左滑入 → 等级弹出 → 分数渐显 → 返回右滑入 + 恭喜 */
function buildComplete() {
    const cc = CONFIG.complete;
    const t = cc.timings;
    complete.innerHTML = '';
    // 全部结算元素都放在边框内部的 16:9 内容框里
    const box = document.createElement('div');
    box.className = 'complete-play';
    complete.appendChild(box);
    const mk = (key, parent) => {
        const cfg = cc.components[key];
        if (!cfg || !cfg.src) return null;
        const el = document.createElement('img');
        el.className = 'complete-comp complete-' + key;
        el.src = bust(cfg.src);
        el.alt = '';
        parent.appendChild(el);
        return el;
    };

    const bg = mk('bg', box);
    if (bg) {
        setStyle(bg, { left: '0%', top: '0%', width: '100%', height: '100%', opacity: '0', transition: `opacity ${t.bgMs}ms ease` });
        requestAnimationFrame(() => { bg.style.opacity = '1'; });
    }

    const comps = {};
    ['pattern', 'level', 'score', 'congrats'].forEach((key) => {
        const cfg = cc.components[key];
        if (!cfg || !cfg.src) return;
        const el = mk(key, box);
        setStyle(el, {
            left: cfg.left + '%',
            top: cfg.top + '%',
            width: cfg.width + '%',
            transform: 'translate(-50%, -50%)',
            opacity: '0',
        });
        comps[key] = el;
    });

    const start = t.bgMs + 150;
    if (comps.pattern) {
        const el = comps.pattern;
        if (window.SettleAudio) window.SettleAudio.jump();
        el.style.transition = 'none';
        el.style.transform = 'translate(-50%, -50%) translateX(-130%)';
        el.style.opacity = '1';
        void el.offsetWidth;
        el.style.transition = `transform ${t.patternMs}ms cubic-bezier(0.22,1,0.36,1)`;
        requestAnimationFrame(() => { el.style.transform = 'translate(-50%, -50%) translateX(0)'; });
    }
    setTimeout(() => {
        if (comps.level) {
            const el = comps.level;
            if (window.SettleAudio) window.SettleAudio.grade();
            el.style.transition = 'none';
            el.style.transform = 'translate(-50%, -50%) scale(0.3)';
            el.style.opacity = '1';
            void el.offsetWidth;
            el.style.transition = `transform ${t.levelMs}ms cubic-bezier(0.34,1.56,0.64,1)`;
            requestAnimationFrame(() => { el.style.transform = 'translate(-50%, -50%) scale(1)'; });
        }
    }, start + t.patternMs + 100);
    setTimeout(() => {
        if (comps.score) {
            if (window.SettleAudio) window.SettleAudio.score();
            comps.score.style.transition = `opacity ${t.scoreMs}ms ease`;
            comps.score.style.opacity = '1';
        }
    }, start + t.patternMs + t.levelMs + 250);
    if (comps.congrats) {
        setTimeout(() => {
            const el = comps.congrats;
            if (window.SettleAudio) window.SettleAudio.hint();
            el.style.transition = 'none';
            el.style.transform = 'translate(-50%, -50%) scale(0.6)';
            el.style.opacity = '0';
            void el.offsetWidth;
            el.style.transition = `opacity ${t.congratsMs}ms ease, transform ${t.congratsMs}ms cubic-bezier(0.34,1.56,0.64,1)`;
            requestAnimationFrame(() => {
                el.style.transform = 'translate(-50%, -50%) scale(1)';
                el.style.opacity = '1';
            });
        }, start + t.patternMs + t.levelMs + t.scoreMs + 250);
    }
}

/* ---------------- 结算：阶段评分 + 上报桌面端 ---------------- */
// 按完成阶段判分：两颗钉每颗 50 分，全部完成给 99.9（不满分），
// 中途点「退出」也能得到有差异的分数。
function computeNailScore() {
    const done = Math.min(nailsDone, CONFIG.nails.length);
    if (window.stageScore) return window.stageScore(done, CONFIG.nails.length);
    return Math.min(99.9, Math.round(done * (100 / CONFIG.nails.length) * 10) / 10);
}

function reportComplete() {
    const score = computeNailScore();
    // 一颗钉都没打完就退出，不算通关，后面的小游戏仍然锁定。
    if (score <= 0) return score;
    try {
        fetch('/api/complete?node=n04_nail&score=' + encodeURIComponent(score), { method: 'POST' }).catch(() => {});
    } catch (err) {
        /* 忽略旧服务进程不支持的接口 */
    }
    return score;
}

// 屏幕渐渐变黑，边框和 logo 与黑屏同步渐隐，再显示结算背景
function showCompleteScreen() {
    if (exitBtn) exitBtn.classList.add('hidden');
    if (exitBtn) exitBtn.classList.remove('ready');
    const frame = document.getElementById('frame-img');
    const logo = document.getElementById('intro-logo');
    blackout.classList.add('settle-dim');
    if (frame) frame.classList.add('settle-hide');
    if (logo) logo.classList.add('settle-hide');
    setTimeout(() => {
        if (frame) frame.classList.add('hidden');
        if (logo) logo.classList.add('hidden');
        blackout.classList.remove('settle-dim');
        complete.classList.remove('hidden');
        complete.classList.add('show');
        buildComplete();
    }, 1200);
}

function finishGame() {
    if (endReady) return;
    endReady = true;
    state = 'COMPLETE';
    if (exitBtn) {
        exitBtn.classList.remove('hidden', 'ready');
        void exitBtn.offsetWidth;
        exitBtn.classList.add('ready');
    }
}

// 右下角「结束游戏」：提前结束或完成后点击，进入结算。
function exitGame() {
    if (complete.classList.contains('show')) return;
    state = 'COMPLETE';
    endReady = true;
    reportComplete();
    showCompleteScreen();
}

/* ---------------- 启动 ---------------- */
if (exitBtn) {
    exitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exitGame();
    });
}

applyCupLayout('before');
applyPrompts();
buildBases();
buildAchievements();
bindConnectGestures();
if (window.startPreIntro) {
    window.startPreIntro('nail', startIntro);
} else {
    startIntro();
}

/* ---------------- 调试接口 ---------------- */
window._NAIL = {
    get state() { return state; },
    get progress() { return progress; },
    startAll: () => { playStage.classList.remove('hidden'); play.classList.remove('hidden'); applyCupLayout('after'); startNail(0); },
    startNail: (i) => { playStage.classList.remove('hidden'); play.classList.remove('hidden'); applyCupLayout('after'); startNail(i); },
    reveal: (methodName) => {
        const nail = CONFIG.nails.find(n => n.method === methodName);
        if (!nail) return;
        onNailComplete(CONFIG.nails.indexOf(nail));
    },
};
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'm') window._NAIL.reveal('梅花钉');
    else if (k === 'l') window._NAIL.reveal('柳叶钉');
});

})();
