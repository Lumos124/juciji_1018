/* ============================================================
   绑扎定型 · 手机/平板端游戏逻辑
   - 状态机：INTRO → LIGHTUP(亮起+移至操作台) → START_PROMPT(闪烁点击)
             → SLIDE_IN(瓷杯旋转渐显+四瓣花+底图+滑动icon) → TYING(滑动绑扎)
             → 成就(四瓣花+文字渐显渐消) → COMPLETE
   - 5 条路径顺序：1,2=井字；3,4=十字；5=绕底
   - 所有坐标集中在 CONFIG，便于按 README 微调
   ============================================================ */
(function () {
'use strict';

/* ---------------- 配置：调整位置/颜色/坐标都在这里 ---------------- */
const CONFIG = {
    timings: {
        moveShowMs: 1800,        // 移至操作台停留
        moveFadeMs: 800,         // 移至操作台渐消
        startPromptBlinkMs: 500, // 开始绑扎定型闪烁间隔
        startPromptFadeMs: 600,  // 开始绑扎定型渐消
        cupRotateMs: 1200,       // 瓷杯旋转摆正时长
        flowerAnimMs: 800,       // 四瓣花单次动画时长
        bottomFadeMs: 2000,      // 右侧底图一起渐显时长
        slideIconSlideMs: 2200,  // 滑动icon从左侧滑入时长（匀速、不渐显）
        slideIconEnterGapMs: 900, // 底图出现后到滑动icon进入的间隔
        slideIconHoldMs: 420,     // 滑动icon滑入后停留再淡出
        endpointDelayMs: 550,     // 终点比起点晚出现
        swipeDoneMs: 400,        // 点击后消失时长
        goldPulseMs: 2000,
        pathGapMs: 700,
        methodGapMs: 1400,
        achShowMs: 2800,         // 成就显示停留（兼容保留）
        achFadeMs: 600,          // 成就渐消
        flowerAchMs: 800,        // 成就时的四瓣花动画
        textGapMs: 250,          // 成就图渐显后到文字1的间隔
        textBetweenMs: 350,      // 文字1与文字2之间的短间隔
        textFallMs: 1100,        // 成就文字下坠渐显时长
        achHoldMs: 1600,         // 三者一起消失前的停留
        slideInMs: 900,
    },
    layout: { heightRatio: 0.76 },
    components: {
        background: { src: '/image/游戏/绑扎/image/操作台背景.webp', left:0, top:0, width:100, height:100 },
        promptMove: { src: '/image/游戏/绑扎/image/提示——移至操作台.webp', left:5.2, top:64.5, width:90.56, height:29.08 },
        promptStart: { src: '/image/游戏/绑扎/image/提示——开始绑扎定型.webp', left:22.05, top:67.5, width:12.87, offsetX:-50, offsetY:-50 },
        flower: { src: '/image/游戏/绑扎/image/四瓣花.webp', left:28.37, top:48.04, width:60, offsetX:-50, offsetY:-50, scaleStart:0.3, scalePeak:1.6, animDuration:1800 },
        bottomImgs: {
            jing: { src: '/image/游戏/绑扎/image/井底图.webp', left:73.6, top:7.63, width:23.11 },
            shi:  { src: '/image/游戏/绑扎/image/十底图.webp', left:70.09, top:30.94, width:26.09 },
            rao:  { src: '/image/游戏/绑扎/image/绕底图.webp', left:73.05, top:55.02, width:22.71 },
        },
        slideIcon: { src: '/image/游戏/绑扎/image/提示——滑动icon.webp', left:8, top:9.7, width:70.42, slideDuration:1200 },
        cup: { src: '/image/游戏/绑扎/image/瓷杯底图.webp', left:2, top:4, height:97.49, aspect:1.093178519593614 },
        panel: { left:73.37, top:-1.2, height:84.89, aspect:0.5830572645527686 },
        endpoints: {
            start: { src: '/image/游戏/绑扎/image/提示——起点.webp', width:8.5 },
            end: { src: '/image/游戏/绑扎/image/提示——终点.png', width:11 },
        },
    },
    pathStyle: {
        color: '#ff827b', opacity: 1, width: 2.4, dash: '6 5', zoneRadius: 10,
        startWidthRatio: 0.55, endWidthRatio: 0.75,
    },
    highlight: {
        gold: '#e6c886', restOpacity: 0.92, glowPx: 18,
    },
    paths: [
        { id:1, method:'井字', type: 'line', sx:44.03, sy:15.29, ex:68.9, ey:52.01 },
        { id:2, method:'井字', type: 'line', sx:82.68, sy:21.97, ex:10.93, ey:35.61 },
        { id:3, method:'十字', type: 'curve', sx:23.9, sy:51.65, qx:52.11, qy:74.02, ex:77.62, ey:52.99 },
        { id:4, method:'十字', type: 'line', sx:57.98, sy:56.11, ex:50.96, ey:86.59 },
        { id:5, method:'绕底', type: 'arc', cx:49.99, cy:71.43, rx:14.68, ry:7 }
    ],
    highlights: {
        1: { left:17.29, top:-0.22, width:73.3, aspect:0.7954841511072515 },
        2: { left:-0.24, top:0.85, width:100.61, aspect:1.1061674008810574 },
        3: { left:12.56, top:37.21, width:84.47, aspect:2.5903614457831323 },
        4: { left:35.47, top:43.72, height:48.84, aspect:0.7016918967052538 },
        5: { left:30.5, top:67.96, width:34, aspect:2.422222222222222 }
    },
    slots: [
        {
            method: '井字', top: 10.18, height: 31,
            slotBox: { left: 6.94, right: 5 },
            achievement: { layers: [
                    { src: '/image/游戏/绑扎/image/成就——井字绑扎.webp', pos: { width:113.45, left:-18.52, top:1.65 } }
            ] },
            text: { layers: [
                { src: '/image/游戏/绑扎/image/成就——井字绑扎文字1.png', pos: { right: 120.89, top: 80.29, height: 187.21, offsetX: -6, aspect: 0.4646853146853147 } },
                { src: '/image/游戏/绑扎/image/成就——井字绑扎文字2.png', pos: { right: 127.03, top: 172.88, height: 133.34, offsetX: -6, aspect: 0.4646853146853147 } }
            ] },
        },
        {
            method: '十字', top: 43.52, height: 30,
            slotBox: { left: -6.63, right: 5 },
            achievement: { layers: [
                    { src: '/image/游戏/绑扎/image/成就——十字绑扎.webp', pos: { width:93.75, left:0.24, top:-11.64 } }
            ] },
            text: { layers: [
                { src: '/image/游戏/绑扎/image/成就——十字绑扎文字1.png', pos: { right: 97.03, top: -30.29, height: 200.24, offsetX: -6, aspect: 0.4646853146853147 } },
                { src: '/image/游戏/绑扎/image/成就——十字绑扎文字2.png', pos: { right: 108.71, top: 64.65, height: 140.24, offsetX: -6, aspect: 0.4646853146853147 } }
            ] },
        },
        {
            method: '绕底', top: 77.19, height: 31,
            slotBox: { left: -15.3, right: 5 },
            achievement: { layers: [
                    { src: '/image/游戏/绑扎/image/成就——绕底绑扎.webp', pos: { width:86.75, right:31.3, top:-19.33 } }
            ] },
            text: { layers: [
                { src: '/image/游戏/绑扎/image/成就——绕底绑扎文字1.png', pos: { right: 95.03, top: -140.29, height: 180.24, offsetX: -6, aspect: 0.4646853146853147 } },
                { src: '/image/游戏/绑扎/image/成就——绕底绑扎文字2.png', pos: { right: 100.21, top: -40.89, height: 140.24, offsetX: -6, aspect: 0.4646853146853147 } }
            ] },
        }
    ],
        complete: {
        timings: { bgMs: 1200, patternMs: 1600, levelMs: 700, scoreMs: 900, backMs: 900 },
        components: {
            bg:      { src: '/image/游戏/绑扎/image/结算背景.webp' },
            pattern:    { src: '/image/游戏/绑扎/image/结算图案.webp', left: 48.8, top: 48.4, width: 47.39 },
            level:    { src: '/image/游戏/绑扎/image/等级.webp', left: 48.45, top: 44.26, width: 89.72 },
            score:    { src: '/image/游戏/绑扎/image/分数.webp', left: 50.06, top: 82.75, width: 67.91 },
            back:    { src: '/image/游戏/绑扎/image/返回.webp', left: 91.49, top: 69, width: 34.72 },
        },
    },
    methodOrder: ['井字', '十字', '绕底'],
};

/* ---------------- DOM ---------------- */
const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const FLOWER_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // 四瓣花柔和放大
const stage = $('stage');
const blackout = $('blackout');
const tableBg = $('table-bg');
const promptMove = $('prompt-move');
const promptStartNail = $('prompt-start-nail');
const flowerEl = $('flower');
const bottomJing = $('bottom-jing');
const bottomShi = $('bottom-shi');
const bottomRao = $('bottom-rao');
const slideIcon = $('slide-icon');
const playStage = $('play-stage');
const play = $('play');
const cupBox = $('cup-box');
const panelBox = $('panel-box');
const cupImg = $('cup');
const cupSvg = $('cup-svg');
const inkSvg = $('ink-svg');
const inkPath = $('ink-path');
const highlightsBox = $('highlights');
const endpointsBox = $('endpoints');
const slotsBox = $('slots');
const complete = $('complete');
const exitBtn = $('exit-btn');

/* ---------------- 移动端真实视口适配 ---------------- */
function syncAppHeight() {
    const w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const root = document.documentElement;
    root.style.setProperty('--app-width',  w + 'px');
    root.style.setProperty('--app-height', h + 'px');
}
syncAppHeight();
document.addEventListener('DOMContentLoaded', syncAppHeight, { once: true });
let _resizeTimer = null;
function _onResize() {
    if (_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(syncAppHeight, 60);
}
window.addEventListener('resize', _onResize, { passive: true });
window.addEventListener('orientationchange', _onResize, { passive: true });
if (window.visualViewport) {
    visualViewport.addEventListener('resize', _onResize, { passive: true });
    visualViewport.addEventListener('scroll', _onResize, { passive: true });
}

/* ---------------- 状态 ---------------- */
let state = 'INTRO';
let endReady = false;
let currentPath = 0;
let swiping = false;
let inkPoints = [];
let flowerLoopToken = 0;
let activeStartEl = null;
let startPromptBlinkToken = 0;
let hlClipPathEl = null;

/* ---------- 各绑扎方式的路径计数 ---------- */
const methodTotal = {};
const methodDone  = {};
let methodRevealed = {};
function initMethodCounters() {
    methodTotal['井字'] = 0; methodTotal['十字'] = 0; methodTotal['绕底'] = 0;
    methodDone['井字']  = 0; methodDone['十字']  = 0; methodDone['绕底']  = 0;
    methodRevealed = { '井字':false, '十字':false, '绕底':false };
    CONFIG.paths.forEach(p => { methodTotal[p.method] = (methodTotal[p.method] || 0) + 1; });
}

/* ---------------- 工具 ---------------- */
function svgEl(name, attrs) {
    const e = document.createElementNS(SVG_NS, name);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
}
function dist2(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function setStyle(el, obj) { for (const k in obj) el.style[k] = obj[k]; }
// 一次会话内用同一个版本号：同一张图多次 bust 会命中同一个 URL，不会重复下载。
const ASSET_VERSION = Date.now();
function bust(src) { return src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=' + ASSET_VERSION; }

/* ---------------- 应用所有 PNG 组件的位置/大小 ---------------- */
function applyComponentLayout() {
    const c = CONFIG.components;
    const pos = (el, cfg) => setStyle(el, {
        left: cfg.left + '%',
        top: cfg.top + '%',
        width: cfg.width + '%',
        height: (cfg.height !== undefined) ? cfg.height + '%' : 'auto',
    });

    if (c.background.src) tableBg.src = bust(c.background.src);
    pos(tableBg, c.background);
    tableBg.style.objectFit = 'cover';

    if (c.promptMove.src) promptMove.src = bust(c.promptMove.src);
    pos(promptMove, c.promptMove);
    promptMove.style.objectFit = 'cover';

    if (c.promptStart.src) promptStartNail.src = bust(c.promptStart.src);
    pos(promptStartNail, c.promptStart);
    promptStartNail.style.transform = `translate(${c.promptStart.offsetX ?? -50}%, ${c.promptStart.offsetY ?? -50}%)`;

    if (c.flower.src) flowerEl.src = bust(c.flower.src);
    if (c.bottomImgs.jing.src) bottomJing.src = bust(c.bottomImgs.jing.src);
    if (c.bottomImgs.shi.src) bottomShi.src = bust(c.bottomImgs.shi.src);
    if (c.bottomImgs.rao.src) bottomRao.src = bust(c.bottomImgs.rao.src);
    if (c.slideIcon.src) slideIcon.src = bust(c.slideIcon.src);
    if (c.cup.src) cupImg.src = bust(c.cup.src);

    applyFlowerLayout();
    applyBottomLayout();
    applySlideIconLayout();

    setStyle(cupBox, {
        position: 'absolute',
        left: c.cup.left + '%',
        top: c.cup.top + '%',
        height: c.cup.height + '%',
        aspectRatio: String(c.cup.aspect),
        width: 'auto',
    });
    setStyle(panelBox, {
        position: 'absolute',
        left: c.panel.left + '%',
        top: c.panel.top + '%',
        height: c.panel.height + '%',
        aspectRatio: String(c.panel.aspect),
        width: 'auto',
    });

}

function pathStart(p) {
    if (p.type === 'arc') return { x: p.cx - p.rx, y: p.cy };
    return { x: p.sx, y: p.sy };
}
function pathEnd(p) {
    if (p.type === 'arc') return { x: p.cx + p.rx, y: p.cy };
    return { x: p.ex, y: p.ey };
}
function samplePath(p, t) {
    const pts = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
        const tt = Math.min(1, Math.max(0, (i / steps) * t));
        let pt;
        if (p.type === 'arc') pt = evalArcT(p, tt);
        else if (p.type === 'curve') pt = evalCurveT(p, tt);
        else pt = { x: p.sx + (p.ex - p.sx) * tt, y: p.sy + (p.ey - p.sy) * tt };
        pts.push(pt);
    }
    return pts;
}

function closestOnSegment(ax, ay, bx, by, px, py) {
    const abx = bx - ax, aby = by - ay;
    const len2 = abx*abx + aby*aby || 1e-9;
    let t = ((px - ax)*abx + (py - ay)*aby) / len2;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    return { t, x: ax + t*abx, y: ay + t*aby };
}
function evalCurveT(p, t) {
    const u = 1 - t;
    return {
        x: u*u*p.sx + 2*u*t*p.qx + t*t*p.ex,
        y: u*u*p.sy + 2*u*t*p.qy + t*t*p.ey,
    };
}
function evalArcT(p, t) {
    const th = (1 - t) * Math.PI;  // t=0 → 左端起点，t=1 → 右端终点
    return { x: p.cx + p.rx * Math.cos(th), y: p.cy + p.ry * Math.sin(th) };
}
function pathPoint(p, t) {
    if (p.type === 'arc') return evalArcT(p, t);
    if (p.type === 'curve') return evalCurveT(p, t);
    return { x: p.sx + (p.ex - p.sx) * t, y: p.sy + (p.ey - p.sy) * t };
}
function pathClosest(p, pt) {
    if (p.type === 'arc') {
        const dx = pt.x - p.cx;
        const dy = pt.y - p.cy;
        let theta = Math.atan2(dy, dx);
        if (theta < 0) theta = -theta;
        if (theta > Math.PI) theta = Math.PI;
        const t = 1 - theta / Math.PI;
        const a = evalArcT(p, t);
        return { t: Math.max(0, Math.min(1, t)), x: a.x, y: a.y };
    }
    if (p.type === 'curve') {
        const a1 = closestOnSegment(p.sx, p.sy, p.qx, p.qy, pt.x, pt.y);
        const a2 = closestOnSegment(p.qx, p.qy, p.ex, p.ey, pt.x, pt.y);
        let t, x, y;
        if (dist2(a1.x, a1.y, pt.x, pt.y) <= dist2(a2.x, a2.y, pt.x, pt.y)) {
            t = a1.t / 2;
            x = a1.x; y = a1.y;
        } else {
            t = 0.5 + a2.t / 2;
            x = a2.x; y = a2.y;
        }
        const best = evalCurveT(p, t);
        return { t, x: best.x, y: best.y };
    }
    const a = closestOnSegment(p.sx, p.sy, p.ex, p.ey, pt.x, pt.y);
    return { t: a.t, x: a.x, y: a.y };
}

/* ---------------- 构建高亮层 ---------------- */
function buildHighlights() {
    CONFIG.paths.forEach((p) => {
        const cfg = CONFIG.highlights[p.id];
        const img = document.createElement('img');
        img.src = bust(`/image/游戏/绑扎/image/高亮${p.id}.webp`);
        img.className = 'highlight';
        img.dataset.id = p.id;
        if (cfg.width !== undefined) {
            setStyle(img, {
                left: cfg.left + '%',
                top: cfg.top + '%',
                width: cfg.width + '%',
                aspectRatio: String(cfg.aspect),
            });
        } else {
            const obj = {
                top: cfg.top + '%',
                height: cfg.height + '%',
                aspectRatio: String(cfg.aspect),
            };
            if (cfg.centerX) { obj.left = '50%'; obj.transform = 'translateX(-50%)'; }
            else obj.left = cfg.left + '%';
            setStyle(img, obj);
        }
        // 井字：高亮2 放在高亮1 的下层
        if (p.id === 1) img.style.zIndex = '2';
        else if (p.id === 2) img.style.zIndex = '1';
        highlightsBox.appendChild(img);
    });
}

/* 高亮沿路径逐渐亮起：用 objectBoundingBox 裁剪遮罩，遮罩沿游戏路径从起点生长 */
function highlightBox(cfg) {
    if (cfg.width !== undefined) {
        return { left: cfg.left, top: cfg.top, width: cfg.width, height: cfg.width / cfg.aspect };
    }
    const w = cfg.height * cfg.aspect;
    return {
        left: cfg.centerX ? 50 - w / 2 : cfg.left,
        top: cfg.top,
        width: w,
        height: cfg.height,
    };
}
function initHighlightClip() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.overflow = 'hidden';
    const clip = svgEl('clipPath', { id: 'bind-hl-clip', clipPathUnits: 'objectBoundingBox' });
    hlClipPathEl = svgEl('path', {
        d: '', fill: 'none', stroke: '#fff',
        'stroke-width': 0.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
    clip.appendChild(hlClipPathEl);
    svg.appendChild(clip);
    document.body.appendChild(svg);
}
function updateHighlightClip(t) {
    if (!hlClipPathEl) return;
    const p = CONFIG.paths[currentPath];
    const box = highlightBox(CONFIG.highlights[p.id]);
    if (!box.width || !box.height) return;
    const pts = samplePath(p, Math.max(0.02, t));
    const norm = (pt) => ({
        x: (pt.x - box.left) / box.width,
        y: (pt.y - box.top) / box.height,
    });
    let d = `M ${norm(pts[0]).x.toFixed(4)} ${norm(pts[0]).y.toFixed(4)}`;
    for (let i = 1; i < pts.length; i++) {
        const n = norm(pts[i]);
        d += ` L ${n.x.toFixed(4)} ${n.y.toFixed(4)}`;
    }
    hlClipPathEl.setAttribute('d', d);
    hlClipPathEl.setAttribute('stroke-width', String((26 / box.width).toFixed(3)));
}

/* ---------------- 构建成就槽位 ---------------- */
function buildSlots() {
    CONFIG.slots.forEach((slot) => {
        const sb = slot.slotBox || { left: 5, right: 5 };
        const wrap = document.createElement('div');
        wrap.className = 'slot';
        setStyle(wrap, {
            top: slot.top + '%',
            height: slot.height + '%',
            left: sb.left + '%',
            right: sb.right + '%',
            width: 'auto',
            display: 'block',
            alignItems: 'normal',
            justifyContent: 'normal',
        });

        const ach = document.createElement('div');
        ach.className = 'slot-achievement';
        ach.dataset.method = slot.method;
        setStyle(ach, {
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'none',
        });
        const lyrs = slot.achievement?.layers || [];
        lyrs.forEach((ly, i) => {
            const im = document.createElement('img');
            im.src = bust(ly.src);
            const pos = ly.pos || { width: 96, left: 2, top: 2 };
            setStyle(im, {
                position: 'absolute',
                width: pos.width + '%',
                left: (pos.left ?? 0) + '%',
                top: (pos.top ?? 0) + '%',
                maxWidth: 'none',
                maxHeight: 'none',
                objectFit: 'contain',
                zIndex: i === lyrs.length - 1 ? 2 : 1,
            });
            ach.appendChild(im);
        });
        wrap.appendChild(ach);

        const t = slot.text || {};
        const textLayers = (t.layers && t.layers.length) ? t.layers : (t.src ? [{ src: t.src, pos: t.pos }] : []);
        textLayers.forEach((ly) => {
            const txt = document.createElement('div');
            txt.className = 'slot-text';
            const tp = ly.pos || { right: 104, top: 50, height: 96, offsetX: -6, aspect: 1329 / 2860 };
            setStyle(txt, {
                position: 'absolute',
                right: tp.right + '%',
                top: tp.top + '%',
                transform: `translateY(-50%) translateX(${tp.offsetX ?? -6}%)`,
                height: tp.height + '%',
                aspectRatio: String(tp.aspect ?? (1329 / 2860)),
                display: 'none',
                opacity: 0,
            });
            const tim = document.createElement('img');
            tim.src = bust(ly.src);
            setStyle(tim, { width: '100%', height: '100%', objectFit: 'contain' });
            txt.appendChild(tim);
            wrap.appendChild(txt);
        });

        slotsBox.appendChild(wrap);
    });
}

/* ---------------- 横屏提示 ---------------- */
function buildRotateHint() {
    const d = document.createElement('div');
    d.id = 'rotate-hint';
    d.textContent = '请横屏使用以获得最佳体验';
    stage.appendChild(d);
}

/* ---------------- 路径绘制 ----------------
   粉色路径是“起点细、终点粗”的渐变带状（类似棒球棒），
   两端用半圆帽贴合起/终点图标；t0~t1 只绘制剩余未走过的部分。 */
function drawPath(p, t0, t1) {
    clearPath();
    const tA = Math.max(0, Math.min(1, t0 ?? 0));
    const tB = Math.max(tA, Math.min(1, t1 ?? 1));
    const r = cupBox.getBoundingClientRect();
    if (!r.width || !r.height) return;

    const ecfg = CONFIG.components.endpoints;
    const startRatio = CONFIG.pathStyle.startWidthRatio ?? 1;
    const hwStart = (ecfg.start.width / 100) * r.width / 2 * startRatio;
    const endRatio = CONFIG.pathStyle.endWidthRatio ?? 1;
    const hwEnd   = (ecfg.end.width   / 100) * r.width / 2 * endRatio;

    const n = Math.max(2, Math.round(26 * Math.max(0.06, tB - tA)));
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const tt = tA + (tB - tA) * i / n;
        const u = pathPoint(p, tt);
        pts.push({
            x: (u.x / 100) * r.width,
            y: (u.y / 100) * r.height,
            t: tt,
        });
    }

    const side = [];
    for (let i = 0; i <= n; i++) {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(n, i + 1)];
        let tx = b.x - a.x, ty = b.y - a.y;
        const len = Math.hypot(tx, ty) || 1e-6;
        tx /= len; ty /= len;
        const nx = -ty, ny = tx;
        const hw = lerp(hwStart, hwEnd, pts[i].t);
        side.push({
            cx: pts[i].x, cy: pts[i].y, hw,
            px: pts[i].x + nx * hw, py: pts[i].y + ny * hw,
            mx: pts[i].x - nx * hw, my: pts[i].y - ny * hw,
        });
    }

    const toX = (px) => (px / r.width) * 100;
    const toY = (py) => (py / r.height) * 100;

    let d = `M ${toX(side[0].px).toFixed(3)} ${toY(side[0].py).toFixed(3)}`;
    for (let i = 1; i <= n; i++) d += ` L ${toX(side[i].px).toFixed(3)} ${toY(side[i].py).toFixed(3)}`;
    for (let i = n - 1; i >= 0; i--) d += ` L ${toX(side[i].mx).toFixed(3)} ${toY(side[i].my).toFixed(3)}`;
    d += ' Z';

    const g = svgEl('g', { class: 'tip-path' });

    // 固定左上光源：决定哪条边是暗部，让不同路径有不同光影方向
    const LIGHT = { x: -0.62, y: -0.78 };
    let tx0 = side[n].cx - side[0].cx, ty0 = side[n].cy - side[0].cy;
    const len0 = Math.hypot(tx0, ty0) || 1e-6;
    tx0 /= len0; ty0 /= len0;
    const nx0 = -ty0, ny0 = tx0;
    const plusLit = (nx0 * LIGHT.x + ny0 * LIGHT.y) >= 0;

    const poly = (pick) => {
        let e = `M ${toX(side[0][pick].x).toFixed(3)} ${toY(side[0][pick].y).toFixed(3)}`;
        for (let i = 1; i <= n; i++) e += ` L ${toX(side[i][pick].x).toFixed(3)} ${toY(side[i][pick].y).toFixed(3)}`;
        return e;
    };
    // 底部白色柔化层：垫在粉色光带下方，自身带投影形成立体厚度
    const TH = Math.max(1.5, r.height / 700);
    let thD = `M ${toX(side[0].px).toFixed(3)} ${toY(side[0].py + TH).toFixed(3)}`;
    for (let i = 1; i <= n; i++) thD += ` L ${toX(side[i].px).toFixed(3)} ${toY(side[i].py + TH).toFixed(3)}`;
    for (let i = n - 1; i >= 0; i--) thD += ` L ${toX(side[i].mx).toFixed(3)} ${toY(side[i].my + TH).toFixed(3)}`;
    thD += ' Z';
    g.appendChild(svgEl('path', { d: thD, class: 'tip-thick' }));

    // 曲面渐变：暗边 → 中心亮 → 另一侧稍暗（沿带子横截面）
    const mid = Math.max(0, Math.min(n, Math.round(n / 2)));
    const eA = plusLit ? side[mid].mx : side[mid].px;
    const eB = plusLit ? side[mid].px : side[mid].mx;
    const defs = svgEl('defs', {});
    const grad = svgEl('linearGradient', {
        id: 'bind-band-grad',
        gradientUnits: 'userSpaceOnUse',
        x1: toX(eA.x), y1: toY(eA.y), x2: toX(eB.x), y2: toY(eB.y),
    });
    [['0%', '#b84a43'], ['30%', '#f07970'], ['50%', '#ff9c92'], ['70%', '#f07970'], ['100%', '#d96a60']].forEach(([offset, color]) => {
        grad.appendChild(svgEl('stop', { offset, 'stop-color': color }));
    });
    defs.appendChild(grad);
    g.appendChild(defs);

    const band = svgEl('path', { d });
    band.style.fill = 'url(#bind-band-grad)';
    g.appendChild(band);
    const cap = (s) => {
        const el = svgEl('ellipse', {
            cx: toX(s.cx).toFixed(3),
            cy: toY(s.cy).toFixed(3),
            rx: ((s.hw / r.width) * 100).toFixed(3),
            ry: ((s.hw / r.height) * 100).toFixed(3),
        });
        el.style.fill = 'url(#bind-band-grad)';
        return el;
    };
    g.appendChild(cap(side[0]));
    g.appendChild(cap(side[n]));

    cupSvg.appendChild(g);
}
function clearPath() { cupSvg.innerHTML = ''; }

function showEndpoints(p, idx) {
    clearEndpoints();
    const s = pathStart(p), e = pathEnd(p);
    const cfg = CONFIG.components.endpoints;
    const delay = CONFIG.timings.endpointDelayMs || 0;
    const mk = (cls, x, y, ecfg) => {
        const d = document.createElement('div');
        d.className = 'endpoint ' + cls;
        d.style.backgroundImage = `url('${bust(ecfg.src)}')`;
        setStyle(d, { left: x + '%', top: y + '%', width: ecfg.width + '%' });
        if (cls === 'start') {
            activeStartEl = d;
            d.style.pointerEvents = 'auto';
            d.style.cursor = 'grab';
            d.style.touchAction = 'none';
            d.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                onPointerDown(e);
            });
        }
        endpointsBox.appendChild(d);
        return d;
    };
    mk('start', s.x, s.y, cfg.start);
    const endEl = mk('end', e.x, e.y, cfg.end);
    if (delay && endEl) {
        endEl.style.opacity = '0';
        endEl.style.animationDelay = delay + 'ms';
    }
}
function clearEndpoints() { activeStartEl = null; endpointsBox.innerHTML = ''; }

/* ---------------- 手势墨迹 ---------------- */
function updateInk() {
    if (inkPoints.length < 2) { inkPath.setAttribute('d', ''); return; }
    let d = `M ${inkPoints[0].x} ${inkPoints[0].y}`;
    for (let i = 1; i < inkPoints.length; i++) d += ` L ${inkPoints[i].x} ${inkPoints[i].y}`;
    inkPath.setAttribute('d', d);
}
function clearInk() {
    inkPoints = [];
    inkPath.setAttribute('d', '');
    inkSvg.classList.add('hidden');
}

/* ---------------- 指针→杯盒坐标 ---------------- */
function cupPoint(e) {
    const r = cupBox.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    return { x, y };
}

/* ============================================================
   流程
   ============================================================ */

function startIntro() {
    if (window.BindAudio) window.BindAudio.startGame();
    endReady = false;
    if (exitBtn) exitBtn.classList.remove('hidden', 'ready');
    lightUp();
}

/* 1. 工作台亮起 + 移至操作台渐显 → 停留 → 消失 */
function lightUp() {
    state = 'LIGHTUP';
    tableBg.classList.remove('hidden');
    requestAnimationFrame(() => tableBg.classList.add('show'));

    promptMove.classList.remove('hidden');
    promptMove.style.transition = `opacity ${CONFIG.timings.moveFadeMs}ms ease`;
    promptMove.style.pointerEvents = 'auto';
    promptMove.style.cursor = 'pointer';
    requestAnimationFrame(() => promptMove.style.opacity = '1');

    // 等待用户点击：点击后渐渐消失，再进入开始提示
    const onMoveClick = () => {
        promptMove.removeEventListener('click', onMoveClick);
        promptMove.style.pointerEvents = 'none';
        promptMove.style.opacity = '0';
        setTimeout(() => {
            promptMove.classList.add('hidden');
            showStartPrompt();
        }, CONFIG.timings.moveFadeMs);
    };
    promptMove.addEventListener('click', onMoveClick);
}

/* 2. 提示——开始绑扎定型（闪烁，点击后渐消） */
function showStartPrompt() {
    state = 'START_PROMPT';
    promptStartNail.classList.remove('hidden');
    promptStartNail.style.opacity = '1';
    // 闪烁过程中即可点击，单击直接进入游戏
    promptStartNail.style.pointerEvents = 'auto';
    promptStartNail.style.cursor = 'pointer';
    promptStartNail.addEventListener('click', onStartPromptClick, { once: true });

    // 闪烁：实/虚交替；被点击后由 token 取消后续闪烁
    blinkStartPrompt();
}

function blinkStartPrompt() {
    const token = ++startPromptBlinkToken;
    let i = 0;
    const total = 4; // 闪烁4次（实→虚→实→虚→实）
    const step = () => {
        if (token !== startPromptBlinkToken) return; // 已点击进入，停止闪烁
        if (i >= total) {
            promptStartNail.style.opacity = '1';
            return;
        }
        promptStartNail.style.transition = `opacity ${CONFIG.timings.startPromptBlinkMs}ms ease`;
        promptStartNail.style.opacity = (i % 2 === 0) ? '0.3' : '1';
        i++;
        setTimeout(step, CONFIG.timings.startPromptBlinkMs);
    };
    step();
}

function onStartPromptClick() {
    startPromptBlinkToken++;   // 取消剩余闪烁
    promptStartNail.style.transition = `opacity ${CONFIG.timings.startPromptFadeMs}ms ease`;
    promptStartNail.style.opacity = '0';
    setTimeout(() => {
        promptStartNail.classList.add('hidden');
        enterPlay();
    }, CONFIG.timings.startPromptFadeMs);
}

/* 3. 进入主玩区：瓷杯旋转渐显 + 四瓣花 + 右侧底图 + 滑动icon */
function enterPlay() {
    state = 'SLIDE_IN';
    playStage.classList.remove('hidden');
    play.classList.remove('hidden');

    // ★ 应用四瓣花位置
    applyFlowerLayout();
    // ★ 应用右侧底图位置
    applyBottomLayout();
    // ★ 应用滑动icon位置
    applySlideIconLayout();

    // 3a. 瓷杯逆时针旋转10°渐显 + 摆正
    cupBox.style.opacity = '0';
    cupBox.style.transform = 'rotate(-10deg)';
    cupBox.style.transition = `opacity ${CONFIG.timings.cupRotateMs}ms ease, transform ${CONFIG.timings.cupRotateMs}ms ease`;
    requestAnimationFrame(() => {
        cupBox.style.opacity = '1';
        cupBox.style.transform = 'rotate(0deg)';
    });

    // 3b. 四瓣花：由小变大 → 快速消失（一直重复，直到点击屏幕）
    setTimeout(() => {
        playFlowerLoop();
    }, 300);

    // 3c. 井/十/绕底图一起渐渐出现
    setTimeout(() => {
        if (window.BindAudio) window.BindAudio.cupsUI();
        [bottomJing, bottomShi, bottomRao].forEach((el) => {
            el.classList.remove('hidden');
            el.style.transition = `opacity ${CONFIG.timings.bottomFadeMs}ms ease`;
        });
        requestAnimationFrame(() => {
            [bottomJing, bottomShi, bottomRao].forEach((el) => el.style.opacity = '1');
        });
    }, CONFIG.timings.cupRotateMs + 200);

    // 3d. 滑动icon从左侧滑入（与成就后的节奏一致）
    setTimeout(() => {
        if (window.BindAudio) window.BindAudio.slideHint();
        const dur = CONFIG.timings.slideIconSlideMs;
        slideIcon.classList.remove('hidden');
        slideIcon.style.transition = 'none';
        slideIcon.style.transform = 'translateX(-130%)';
        slideIcon.style.opacity = '1';
        void slideIcon.offsetWidth;   // 强制回流，提交“屏外起点”状态
        slideIcon.style.transition = `transform ${dur}ms linear`;
        requestAnimationFrame(() => {
            slideIcon.style.transform = 'translateX(0)';
        });
    }, CONFIG.timings.cupRotateMs + 200 + CONFIG.timings.slideIconEnterGapMs);

    // 3e. 点击屏幕 → 四瓣花 + 滑动icon消失（等滑动icon完整滑入后才允许点击）
    const clickHandler = () => {
        document.removeEventListener('click', clickHandler);
        bindGestures();
        startTying();      // 起终点渐显
        fadeSlideHint();   // 同时四瓣花 + 滑动icon渐渐消失
    };
    setTimeout(() => {
        document.addEventListener('click', clickHandler, { once: true });
    }, CONFIG.timings.cupRotateMs + 200 + CONFIG.timings.slideIconEnterGapMs + CONFIG.timings.slideIconSlideMs + 200);
}

/* ★ 应用四瓣花位置 */
function applyFlowerLayout() {
    const f = CONFIG.components.flower;
    setStyle(flowerEl, {
        width: f.width + '%',
        top: f.top + '%',
        left: f.left + '%',
        transform: `translate(${f.offsetX ?? -50}%, ${f.offsetY ?? -50}%) scale(${f.scaleStart})`,
        opacity: '0',
    });
}

/* ★ 应用右侧底图位置 */
function applyBottomLayout() {
    const b = CONFIG.components.bottomImgs;
    setStyle(bottomJing, { width: b.jing.width + '%', top: b.jing.top + '%', left: b.jing.left + '%', opacity: '0' });
    setStyle(bottomShi,  { width: b.shi.width + '%',  top: b.shi.top + '%',  left: b.shi.left + '%',  opacity: '0' });
    setStyle(bottomRao,  { width: b.rao.width + '%',  top: b.rao.top + '%',  left: b.rao.left + '%',  opacity: '0' });
}

/* ★ 应用滑动icon位置 */
function applySlideIconLayout() {
    const s = CONFIG.components.slideIcon;
    setStyle(slideIcon, {
        width: s.width + '%',
        top: s.top + '%',
        left: s.left + '%',
        opacity: '0',
        transform: 'translateX(-120%)',
    });
}

/* 四瓣花动画：柔和放大 → 停留 → 渐渐消失（完成一次） */
function playFlowerAnim(times, cb) {
    let count = 0;
    const f = CONFIG.components.flower;
    const anim = () => {
        if (window.BindAudio) window.BindAudio.flower();
        flowerEl.classList.remove('hidden');
        flowerEl.style.opacity = '0';
        flowerEl.style.transform = `translate(${f.offsetX ?? -50}%, ${f.offsetY ?? -50}%) scale(${f.scaleStart})`;
        flowerEl.style.transition = 'none';
        // 强制回流
        void flowerEl.offsetWidth;
        const fade = Math.round(f.animDuration * 0.45);
        flowerEl.style.transition = `transform ${f.animDuration}ms ${FLOWER_EASE}, opacity ${Math.round(f.animDuration * 0.55)}ms ease`;
        requestAnimationFrame(() => {
            flowerEl.style.transform = `translate(${f.offsetX ?? -50}%, ${f.offsetY ?? -50}%) scale(${f.scalePeak})`;
            flowerEl.style.opacity = '1';
        });
        setTimeout(() => {
            flowerEl.style.transition = `transform ${fade}ms ease-in, opacity ${fade}ms ease`;
            flowerEl.style.transform = `translate(${f.offsetX ?? -50}%, ${f.offsetY ?? -50}%) scale(${f.scalePeak * 1.04})`;
            flowerEl.style.opacity = '0';
            setTimeout(() => {
                flowerEl.classList.add('hidden');
                count++;
                if (count < times) {
                    setTimeout(anim, 240);
                } else {
                    if (cb) cb();
                }
            }, fade);
        }, f.animDuration);
    };
    anim();
}

/* 四瓣花循环：滑入阶段一直重复，点击后由 fadeSlideHint 停止并渐消 */
function playFlowerLoop() {
    const f = CONFIG.components.flower;
    const token = ++flowerLoopToken;
    const anim = () => {
        if (token !== flowerLoopToken) return;
        if (window.BindAudio) window.BindAudio.flower();
        flowerEl.classList.remove('hidden');
        flowerEl.style.opacity = '0';
        flowerEl.style.transform = `translate(${f.offsetX ?? -50}%, ${f.offsetY ?? -50}%) scale(${f.scaleStart})`;
        flowerEl.style.transition = 'none';
        void flowerEl.offsetWidth;
        const fade = Math.round(f.animDuration * 0.45);
        flowerEl.style.transition = `transform ${f.animDuration}ms ${FLOWER_EASE}, opacity ${Math.round(f.animDuration * 0.55)}ms ease`;
        requestAnimationFrame(() => {
            if (token !== flowerLoopToken) return;
            flowerEl.style.transform = `translate(${f.offsetX ?? -50}%, ${f.offsetY ?? -50}%) scale(${f.scalePeak})`;
            flowerEl.style.opacity = '1';
        });
        setTimeout(() => {
            if (token !== flowerLoopToken) return;
            flowerEl.style.transition = `transform ${fade}ms ease-in, opacity ${fade}ms ease`;
            flowerEl.style.transform = `translate(${f.offsetX ?? -50}%, ${f.offsetY ?? -50}%) scale(${f.scalePeak * 1.04})`;
            flowerEl.style.opacity = '0';
            setTimeout(() => {
                if (token !== flowerLoopToken) return;
                flowerEl.classList.add('hidden');
                setTimeout(anim, 220);
            }, fade);
        }, f.animDuration);
    };
    anim();
}

function stopFlowerLoop() {
    flowerLoopToken++;
}

/* 点击屏幕后：四瓣花 + 滑动icon 一起渐渐消失 */
function fadeSlideHint(cb) {
    stopFlowerLoop();
    flowerEl.classList.remove('hidden');
    flowerEl.style.transition = `opacity ${CONFIG.timings.swipeDoneMs}ms ease`;
    flowerEl.style.opacity = '0';
    slideIcon.style.transition = `opacity ${CONFIG.timings.swipeDoneMs}ms ease`;
    slideIcon.style.opacity = '0';
    setTimeout(() => {
        slideIcon.classList.add('hidden');
        flowerEl.classList.add('hidden');
        if (cb) cb();
    }, CONFIG.timings.swipeDoneMs);
}

/* 绑定手势 */
function bindGestures() {
    cupBox.addEventListener('pointerdown', onPointerDown);
    cupBox.addEventListener('pointermove', onPointerMove);
    cupBox.addEventListener('pointerup', onPointerUp);
    cupBox.addEventListener('pointercancel', onPointerUp);
}

/* 4. 开始绑扎 */
function startTying() {
    state = 'TYING';
    currentPath = 0;
    startPath(0);
}

function startPath(i) {
    state = 'TYING';
    currentPath = i;
    const p = CONFIG.paths[i];
    clearInk();
    drawPath(p);
    showEndpoints(p, i);
    if (!slideIcon.classList.contains('hidden')) fadeSlideHint();
    // 准备当前高亮：沿路径从起点逐渐亮起
    const hl = highlightsBox.querySelector(`.highlight[data-id="${p.id}"]`);
    if (hl) {
        hl.classList.remove('shown');
        hl.style.opacity = '0';
        hl.style.clipPath = 'url(#bind-hl-clip)';
        updateHighlightClip(0.02);
    }
}

/* ---------------- 滑动检测（起点→终点重合触发高亮） ---------------- */
const PROGRESS_PASS = 0.85;

function onPointerDown(e) {
    if (state !== 'TYING') return;
    const p = CONFIG.paths[currentPath];
    const s = pathStart(p);
    const pt = cupPoint(e);
    const r = CONFIG.pathStyle.zoneRadius;
    if (dist2(pt.x, pt.y, s.x, s.y) > r * r) return;
    swiping = true;
    if (window.BindAudio) window.BindAudio.ropeDragStart();
    drawPath(p, 0, 1);
    const pathEl = cupSvg.querySelector('.tip-path');
    if (pathEl) pathEl.style.opacity = '1';
    const hl = highlightsBox.querySelector(`.highlight[data-id="${p.id}"]`);
    if (hl) {
        hl.classList.remove('shown');
        hl.style.opacity = '0';
        hl.style.clipPath = 'url(#bind-hl-clip)';
        updateHighlightClip(0.02);
    }
    try { cupBox.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
}

function onPointerMove(e) {
    if (!swiping) return;
    const pt = cupPoint(e);

    const p = CONFIG.paths[currentPath];
    const en = pathEnd(p);
    const d2 = dist2(pt.x, pt.y, en.x, en.y);
    const cp = pathClosest(p, pt);
    const t = Math.max(0, Math.min(1, cp.t));
    // 起点图标吸附在路径上（沿路径拖动，不能满屏乱跑）
    if (activeStartEl) {
        activeStartEl.style.left = cp.x + '%';
        activeStartEl.style.top = cp.y + '%';
    }
    // 粉色路径保留当前位置到终点；往回拖时已消失部分恢复
    drawPath(p, t, 1);
    // 高亮从起点到当前位置逐段亮起；往回拖时随之熄灭
    const hl = highlightsBox.querySelector(`.highlight[data-id="${p.id}"]`);
    if (hl) {
        hl.style.opacity = String(CONFIG.highlight.restOpacity * t);
        updateHighlightClip(t);
    }
    // ★ 判定：手指到达终点附近（距离 ≤ zoneRadius * 1.5）就算完成
    if (d2 <= (CONFIG.pathStyle.zoneRadius * 1.5) ** 2 ||
        dist2(cp.x, cp.y, en.x, en.y) <= (CONFIG.pathStyle.zoneRadius * 1.5) ** 2) {
        swiping = false;
        try { cupBox.releasePointerCapture(e.pointerId); } catch (err) {}
        if (window.BindAudio) window.BindAudio.ropeDragEnd();
        onPathDone(currentPath);
        return;
    }
    e.preventDefault();
}

function onPointerUp(e) {
    if (!swiping) return;
    swiping = false;
    if (window.BindAudio) window.BindAudio.ropeDragEnd();
    const p = CONFIG.paths[currentPath];
    const en = pathEnd(p);
    const pt = cupPoint(e);
    const r = CONFIG.pathStyle.zoneRadius;
    try { cupBox.releasePointerCapture(e.pointerId); } catch (err) {}
    const cp = pathClosest(p, pt);
    const hitEnd = dist2(pt.x, pt.y, en.x, en.y) <= (r * 1.5) ** 2;
    if (hitEnd || cp.t >= PROGRESS_PASS || dist2(cp.x, cp.y, en.x, en.y) <= (r * 1.5) ** 2) {
        onPathDone(currentPath);
    } else {
        clearInk();
        // 未完成：起点图标回到原位，粉色路径恢复完整
        const p2 = CONFIG.paths[currentPath];
        if (activeStartEl) {
            const s2 = pathStart(p2);
            activeStartEl.style.left = s2.x + '%';
            activeStartEl.style.top = s2.y + '%';
        }
        drawPath(p2, 0, 1);
        const hl = highlightsBox.querySelector(`.highlight[data-id="${p2.id}"]`);
        if (hl) {
            hl.style.opacity = '0';
            updateHighlightClip(0.02);
        }
    }
}

/* ---------------- 路径完成 ---------------- */
// 完成瞬间高亮还会渐显到常驻亮度（bind.css 里 .highlight 的 opacity 过渡），
// 点亮音效要等这步真正结束、整条绳子亮起后再响。
const HIGHLIGHT_FADE_FALLBACK_MS = 600;

function highlightFadeMs(hl) {
    const raw = getComputedStyle(hl).transitionDuration || '';
    const first = parseFloat(raw);
    if (!isFinite(first) || first <= 0) return HIGHLIGHT_FADE_FALLBACK_MS;
    return raw.indexOf('ms') >= 0 ? first : first * 1000;
}

function playRopeLitWhenFullyLit(hl, beforeOpacity) {
    if (!window.BindAudio) return;
    const rest = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--highlight-rest-opacity')
    ) || CONFIG.highlight.restOpacity;
    // 已经接近常驻亮度 → 整条已亮，立刻响；还有明显渐亮 → 等过渡结束再响。
    if (Math.abs(rest - beforeOpacity) > 0.05) {
        setTimeout(() => window.BindAudio.ropeLit(), highlightFadeMs(hl));
    } else {
        window.BindAudio.ropeLit();
    }
}

function onPathDone(i) {
    clearInk();
    clearEndpoints();
    clearPath();

    // 完成时高亮渐显到常驻透明度
    const hl = highlightsBox.querySelector(`.highlight[data-id="${CONFIG.paths[i].id}"]`);
    if (hl) {
        const beforeOpacity = hl.style.opacity === ''
            ? CONFIG.highlight.restOpacity
            : parseFloat(hl.style.opacity);
        hl.style.opacity = '';
        hl.style.clipPath = 'none';
        hl.classList.add('shown');
        playRopeLitWhenFullyLit(hl, beforeOpacity);
    } else if (window.BindAudio) {
        window.BindAudio.ropeLit();
    }

    const method = CONFIG.paths[i].method;
    methodDone[method] = (methodDone[method] || 0) + 1;
    const needCount = methodTotal[method] || 1;
    const methodFinished = methodDone[method] >= needCount && !methodRevealed[method];
    const isLast = i === CONFIG.paths.length - 1;
    const goNext = (withAchievement) => {
        if (isLast) {
            setTimeout(finishGame, CONFIG.timings.methodGapMs);
            return;
        }
        setTimeout(() => {
            if (withAchievement) {
                // 只有成就完成时才出现滑动icon + 四瓣花提示
                showSlideIconForNext(() => startPath(i + 1));
            } else {
                startPath(i + 1); // 普通路径直接进入下一条
            }
        }, CONFIG.timings.pathGapMs);
    };
    if (methodFinished) {
        state = 'ACHIEVING';   // 成就展示期间禁止拖动，防止路径被误触重画
        methodRevealed[method] = true;
        revealSlot(method, () => goNext(true));
    } else {
        goNext(false);
    }
}

/* ★ 显示滑动icon（成就完成时：icon 滑入 + 四瓣花闪一次） */
function showSlideIconForNext(cb) {
    slideIcon.classList.remove('hidden');
    slideIcon.style.transition = 'none';
    slideIcon.style.transform = 'translateX(-130%)';
    slideIcon.style.opacity = '1';
    void slideIcon.offsetWidth;   // 强制回流，提交“屏外起点”状态
    const dur = CONFIG.timings.slideIconSlideMs;
    slideIcon.style.transition = `transform ${dur}ms linear`;
    requestAnimationFrame(() => {
        slideIcon.style.transform = 'translateX(0)';
    });

    // icon 滑入后四瓣花柔和闪一次
    setTimeout(() => playFlowerAnim(1), dur + 120);

    // 等用户看到 icon 后点击屏幕，再进入下一条并渐出提示
    setTimeout(() => {
        const go = () => {
            document.removeEventListener('click', go);
            if (cb) cb();       // 下一个起终点渐显
            fadeSlideHint();    // 滑动icon + 四瓣花渐渐消失
        };
        document.addEventListener('click', go, { once: true });
    }, dur + 200);
}

/* ★ 成就显示 + 四瓣花动画 */
function revealSlotWithFlower(methodName, cb) {
    // 先播放四瓣花动画，再：成就渐显 → 文字1 → 文字2 → 三者一起渐消
    playFlowerAnim(1, () => {
        revealSlot(methodName, cb);
    });
}

function fadeIn(el, cb) {
    el.classList.remove('shown', 'flash-brief', 'celebrate');
    el.style.display = 'block';
    el.style.opacity = '0';
    el.style.transition = `opacity ${CONFIG.timings.achFadeMs}ms ease`;
    requestAnimationFrame(() => {
        el.style.opacity = '1';
    });
    if (cb) setTimeout(cb, CONFIG.timings.achFadeMs);
}

function fadeOutAll(els, cb) {
    els.forEach((el) => {
        el.style.transition = `opacity ${CONFIG.timings.achFadeMs}ms ease`;
        el.style.opacity = '0';
    });
    setTimeout(() => {
        els.forEach((el) => { el.style.display = 'none'; });
        if (cb) cb();
    }, CONFIG.timings.achFadeMs);
}

/* 成就结束后：隐藏该绑扎方式对应的全部高亮 */
function hideHighlightsOfMethod(methodName) {
    CONFIG.paths.forEach((p) => {
        if (p.method !== methodName) return;
        const hl = highlightsBox.querySelector(`.highlight[data-id="${p.id}"]`);
        if (hl) {
            hl.classList.remove('shown');
            hl.style.opacity = '0';
            hl.style.clipPath = 'none';
        }
    });
}

/* 成就文字：从上方下坠到原位，下坠过程中渐显 */
function fadeInText(el, cb) {
    const ms = CONFIG.timings.textFallMs || 1100;
    el.classList.remove('shown', 'flash-brief');
    el.style.display = 'block';
    el.style.transition = 'none';
    el.style.opacity = '0';
    const base = el.style.transform || 'translateY(-50%)';
    const from = base.replace(/translateY\(([^)]*)\)/, 'translateY(-150%)');
    el.style.transform = from;
    void el.offsetWidth;
    el.style.transition = `opacity ${ms}ms ease, transform ${ms}ms cubic-bezier(0.33, 0, 0.6, 1)`;
    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = base;
    });
    if (cb) setTimeout(cb, ms);
}

/* ★ 成就显示：成就 → 文字1 → 文字2 → 三者一起渐消 */
function revealSlot(methodName, cb) {
    const ach = slotsBox.querySelector(`.slot-achievement[data-method="${methodName}"]`);
    if (!ach) { if (cb) cb(); return; }
    if (window.BindAudio) window.BindAudio.achievement();
    const slot = ach.parentElement;
    const txts = Array.from(slot.querySelectorAll('.slot-text'));
    fadeIn(ach, () => {
        setTimeout(() => {
            if (window.BindAudio) window.BindAudio.achievementText(methodName);
            fadeInText(txts[0], () => {
                setTimeout(() => {
                    fadeInText(txts[1], () => {
                        setTimeout(() => {
                            fadeOutAll([ach, txts[0], txts[1]], () => {
                                hideHighlightsOfMethod(methodName);
                                if (cb) cb();
                            });
                        }, CONFIG.timings.achHoldMs);
                    });
                }, CONFIG.timings.textBetweenMs);
            });
        }, CONFIG.timings.textGapMs);
    });
}

/* ---------------- 完成 ---------------- */
/* 结算层：背景渐显 → 图案左滑入 → 等级弹出 → 分数渐显 → 返回右滑入 */
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
    ['pattern', 'level', 'score', 'back'].forEach((key) => {
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
    setTimeout(() => {
        if (comps.back) {
            const el = comps.back;
            if (window.SettleAudio) window.SettleAudio.hint();
            el.style.transition = 'none';
            el.style.transform = 'translate(-50%, -50%) translateX(130%)';
            el.style.opacity = '1';
            void el.offsetWidth;
            el.style.transition = `transform ${t.backMs}ms cubic-bezier(0.22,1,0.36,1)`;
            requestAnimationFrame(() => { el.style.transform = 'translate(-50%, -50%) translateX(0)'; });
        }
    }, start + t.patternMs + t.levelMs + t.scoreMs + 350);
}

/* ---------------- 结算：阶段评分 + 上报桌面端 ---------------- */
// 按完成阶段判分：5 条绑扎路径每条 20 分，全部完成给 99.9（不满分），
// 中途点「退出」也能得到有差异的分数。
function computeBindScore() {
    const done = Object.keys(methodDone).reduce((sum, key) => sum + (methodDone[key] || 0), 0);
    const total = CONFIG.paths.length;
    if (window.stageScore) return window.stageScore(done, total);
    return Math.min(99.9, Math.round(done * (100 / total) * 10) / 10);
}

function reportComplete() {
    const score = computeBindScore();
    // 一条路径都没绑完就退出，不算通关，后面的小游戏仍然锁定。
    if (score <= 0) return score;
    try {
        fetch('/api/complete?node=n03_bind&score=' + encodeURIComponent(score), { method: 'POST' }).catch(() => {});
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
    if (window.BindAudio) window.BindAudio.achievement();
    // 三个槽位成就一起渐显，保持显示（不高光放大）
    Array.from(slotsBox.children).forEach((slot) => {
        const ach = slot.querySelector('.slot-achievement');
        if (!ach) return;
        ach.classList.remove('shown', 'flash-brief', 'celebrate');
        ach.style.display = 'block';
        ach.style.opacity = '0';
        ach.style.transition = `opacity ${CONFIG.timings.achFadeMs}ms ease`;
        requestAnimationFrame(() => { ach.style.opacity = '1'; });
    });
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

applyComponentLayout();
initMethodCounters();
buildHighlights();
initHighlightClip();
buildSlots();
buildRotateHint();

if (window.startPreIntro) {
    window.startPreIntro('bind', startIntro);
} else {
    startIntro();
}

/* ========================================================================
   调试入口
   ======================================================================== */
window._BIND = {
    revealSlot,
    revealSlotWithFlower,
    playFlowerAnim,
    getMethodCounters: () => ({methodTotal: {...methodTotal}, methodDone: {...methodDone}, methodRevealed: {...methodRevealed}}),
};
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'j') revealSlotWithFlower('井字');
    else if (k === 's') revealSlotWithFlower('十字');
    else if (k === 'r') revealSlotWithFlower('绕底');
    else if (k === 'f') playFlowerAnim(1);
});

})();
