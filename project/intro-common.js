/* ============================================================
   焗瓷记 · 起始选段动画 + 持久边框（绑扎定型 / 打孔上钉 共用模块）
   - 持久边框：#frame-img，全屏 fixed，z-index 50，从始至终常驻
   - 起始动画：#intro-overlay，背景.mp4 视频 + 4 个段位字（鉴/对/绑/钉）
     两阶段流程：
       阶段1（charsAllBrightMs）：4 字全亮，按 layoutStage1 布局
       阶段2：active 字放大保持亮，其余切到 _暗 版，按 layoutStage2 布局
     用户点击 active 字 → 整层淡出 → 进入游戏 onComplete()

   ★ 绑扎定型（bind）与打孔上钉（nail）使用各自独立的配置：
       PRE_INTRO_CONFIG.bind 和 PRE_INTRO_CONFIG.nail
     两套布局参数（layoutStage1 / layoutStage2）可分别调整。
   ============================================================ */
(function () {
'use strict';

// 一次会话内用同一个版本号：同一张图多次引用命中同一 URL，不会重复下载。
const ASSET_VERSION = Date.now();

/* ---------------- 共享配置（背景/边框/字图源） ---------------- */
const SHARED = {
    background: { src: '/image/背景.mp4', poster: '/image/背景.webp' },
    frame:      { src: '/image/边框.webp' },
    logo:       { src: '/image/logo.webp', pos: { left: 2, top: 78, width: 18, height: 20 } },
    chars: {
        jian: { bright: '/image/鉴.webp', dim: '/image/鉴_暗.webp' },
        dui:  { bright: '/image/对.webp', dim: '/image/对_暗.webp' },
        bang: { bright: '/image/绑.webp', dim: '/image/绑_暗.webp' },
        ding: { bright: '/image/钉.webp', dim: '/image/钉_暗.webp' },
    },
};

/* 默认布局：4 字竖排右侧
   stage1（4 字全亮）：top 10/30/50/70, height 18, left 78, width 14
   stage2（高亮+暗）：默认与 stage1 相同，active 字加 scale 1.18
   用户可在 intro-edit.html 中分别调整两阶段参数 */
function defaultLayout() {
    return {
        jian: { top: 10, height: 18, left: 78, width: 14 },
        dui:  { top: 30, height: 18, left: 78, width: 14 },
        bang: { top: 50, height: 18, left: 78, width: 14 },
        ding: { top: 70, height: 18, left: 78, width: 14 },
    };
}
function defaultStage2Layout(activeKey) {
    const l = defaultLayout();
    l[activeKey].scale = 1.18;
    return l;
}

/* ---------------- 完整配置 ---------------- */
const PRE_INTRO_CONFIG = {
    ...SHARED,
    // 绑扎定型独立配置
    // === 绑扎定型 起始选段 CONFIG ===
    bind: {
        activeKey: 'bang',
        timings: {
            fadeInMs: 800,
            charsAllBrightMs: 1000,
            readyDelayMs: 600,
            blackoutMs: 800,
            fadeOutMs: 800,
        },
        // 阶段1：4 字全亮
        layoutStage1: {
            jian : { top: 11.71, height: 20.66, left: 66.54, width: 28.40, scale: 1.547 },
            dui  : { top: 30.64, height: 19.92, left: 66.82, width: 27.07 },
            bang : { top: 48.79, height: 20.42, left: 67.29, width: 26.40 },
            ding : { top: 64.72, height: 25.17, left: 68.27, width: 24.44 },
        },
        // 阶段2：active 字放大保持亮，其余切到 _暗 版（layoutStage2 独立可调）
        layoutStage2: {
            jian : { top: 11.71, height: 20.66, left: 66.54, width: 28.40, scale: 1.547 },
            dui  : { top: 30.64, height: 19.92, left: 66.82, width: 27.07, scale: 1.547 },
            bang : { top: 48.22, height: 20.46, left: 64.11, width: 27.69, scale: 1.180 },
            ding : { top: 64.72, height: 25.17, left: 68.27, width: 24.44 },
        },
    },
        // 打孔上钉独立配置
        // === 打孔上钉 起始选段 CONFIG ===
    // 贴回 intro-common.js 的 PRE_INTRO_CONFIG.nail
    nail: {
        activeKey: 'ding',
        timings: {
            fadeInMs: 800,
            charsAllBrightMs: 1000,
            readyDelayMs: 600,
            blackoutMs: 800,
            fadeOutMs: 800,
        },
        // 阶段1：4 字全亮
        layoutStage1: {
            jian : { top: 11.71, height: 20.66, left: 66.54, width: 28.40, scale: 1.547 },
            dui  : { top: 30.64, height: 19.92, left: 66.82, width: 27.07, scale: 1.547 },
            bang : { top: 48.79, height: 20.42, left: 67.29, width: 26.40, scale: 1.547 },
            ding : { top: 64.72, height: 25.17, left: 68.27, width: 24.44, scale: 1.547 },
        },
        // 阶段2：active 字放大保持亮，其余切到 _暗 版（layoutStage2 独立可调）
        layoutStage2: {
            jian : { top: 11.71, height: 20.66, left: 66.54, width: 28.40, scale: 1.547 },
            dui  : { top: 30.64, height: 19.92, left: 66.82, width: 27.07, scale: 1.547 },
            bang : { top: 48.79, height: 20.42, left: 67.29, width: 26.40, scale: 1.547 },
            ding : { top: 69.85, height: 13.07, left: 70.23, width: 16.75, scale: 1.917 },
        },
    },
    // logo（共享配置，贴回 PRE_INTRO_CONFIG.logo）
    logo: { src: '/image/logo.webp', pos: { left: -16.09, top: 72.08, width: 43.27, height: 27.42 } },   
};

/* ---------------- 工具 ---------------- */
const $ = (id) => document.getElementById(id);
function applyLayout(el, cfg) {
    el.style.top = cfg.top + '%';
    el.style.left = cfg.left + '%';
    el.style.width = cfg.width + '%';
    el.style.height = cfg.height + '%';
    el.style.setProperty('--char-scale', String(cfg.scale || 1));
}

/* 背景视频循环：播完一遍后停 4 秒再播（同 check(1).html 的节奏） */
function setupIntroVideo(video) {
    let playTimer = null;
    let retryTimer = null;
    let stopped = false;
    const scheduleNext = () => {
        clearTimeout(playTimer);
        const waitMs = ((video.duration || 4) * 1000) + 4000;
        playTimer = setTimeout(() => {
            if (stopped) return;
            video.currentTime = 0;
            const p = video.play();
            if (p && p.catch) p.catch(() => {});
            scheduleNext();
        }, waitMs);
    };
    const start = () => {
        if (stopped) return;
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
        scheduleNext();
    };
    // 平板 / 微信里 autoplay 常被拦截：首次手势 + 前几秒轮询都补一次播放，
    // 保证开场背景视频一定看得到。
    const retry = () => {
        if (stopped || !video.paused) return;
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
    };
    const onVis = () => {
        if (document.hidden) {
            clearTimeout(playTimer);
            video.pause();
        } else {
            start();
        }
    };
    video.addEventListener('loadedmetadata', start, { once: true });
    ['loadeddata', 'canplay', 'canplaythrough'].forEach((ev) => video.addEventListener(ev, retry));
    ['pointerdown', 'touchstart', 'click'].forEach((ev) => document.addEventListener(ev, retry, true));
    document.addEventListener('visibilitychange', onVis);
    retryTimer = setInterval(() => {
        retry();
        if (stopped || !video.paused) {
            clearInterval(retryTimer);
            retryTimer = null;
        }
    }, 1000);
    video._cleanupIntro = () => {
        stopped = true;
        clearTimeout(playTimer);
        if (retryTimer !== null) { clearInterval(retryTimer); retryTimer = null; }
        ['pointerdown', 'touchstart', 'click'].forEach((ev) => document.removeEventListener(ev, retry, true));
        document.removeEventListener('visibilitychange', onVis);
        video.pause();
    };
    start();
}
function setSrc(el, src) {
    if (el.src !== location.origin + src) el.src = src;
}

/* ---------------- DOM 构建 ----------------
   要求 HTML 中已存在：
     <img id="frame-img">
     <div id="intro-overlay"><img id="intro-bg"></div>

   buildChars(gameType, stage)：按指定阶段的 layout 构建 4 字
     stage = 1：4 字全亮版、scale 1、无 .active/.dim
     stage = 2：active 字 bright + .active + scale，其余 _暗 + .dim
---------------------------------------------------------------- */
function buildChars(gameType, stage) {
    const overlay = $('intro-overlay');
    if (!overlay) return;
    const gameCfg = PRE_INTRO_CONFIG[gameType];
    if (!gameCfg) return;

    // 背景视频（破缓存；编辑器里若还是旧 img 会先替换成 video）
    let bg = $('intro-bg');
    if (!bg || bg.tagName !== 'VIDEO') {
        if (bg && bg._cleanupIntro) bg._cleanupIntro();
        if (bg) bg.remove();
        bg = document.createElement('video');
        bg.id = 'intro-bg';
        bg.muted = true;
        bg.autoplay = true;
        bg.preload = 'auto';
        bg.setAttribute('playsinline', '');
        bg.setAttribute('webkit-playsinline', '');
        bg.setAttribute('x5-playsinline', '');
        bg.setAttribute('muted', '');
        overlay.appendChild(bg);
    }
    bg.src = PRE_INTRO_CONFIG.background.src + '?v=' + ASSET_VERSION;
    bg.loop = false;   // 循环节奏由 setupIntroVideo 控制（播完停 4 秒）
    if (PRE_INTRO_CONFIG.background.poster) bg.poster = PRE_INTRO_CONFIG.background.poster;
    setupIntroVideo(bg);

    const layout = stage === 1 ? gameCfg.layoutStage1 : gameCfg.layoutStage2;
    const activeKey = gameCfg.activeKey;
    const order = ['jian', 'dui', 'bang', 'ding'];

    let charsBox = overlay.querySelector('#intro-chars');
    if (!charsBox) {
        charsBox = document.createElement('div');
        charsBox.id = 'intro-chars';
        overlay.appendChild(charsBox);
    }
    charsBox.querySelectorAll('.intro-char').forEach(el => el.remove());

    order.forEach(key => {
        const cfg = layout[key];
        const charCfg = PRE_INTRO_CONFIG.chars[key];
        const img = document.createElement('img');
        img.className = 'intro-char';
        img.dataset.key = key;
        img.alt = '';
        if (stage === 1) {
            // 阶段1：全亮版，当前段先带高亮 + 滑入动效
            setSrc(img, charCfg.bright);
            if (key === activeKey) img.classList.add('active');
        } else {
            // 阶段2：active 亮+放大可点击；其余全亮，悬停轻微放大+高光，不可点击
            if (key === activeKey) {
                setSrc(img, charCfg.bright);
                img.classList.add('active');
                img.style.transform = `scale(${cfg.scale || 1})`;
            } else {
                setSrc(img, charCfg.bright);
                img.classList.add('idle');
            }
        }
        applyLayout(img, cfg);
        charsBox.appendChild(img);
    });

    // 阶段1：当前段从右侧滑入（同 check(1).html 的 compSlideIn）
    if (stage === 1) {
        const activeEl = charsBox.querySelector('.intro-char.active');
        if (activeEl) {
            void activeEl.offsetWidth;
            activeEl.classList.add('slide-in');
        }
    }
}

/* 从 stage1 切换到 stage2：更新 src/class/transform/layout */
function switchToStage2(gameType) {
    const overlay = $('intro-overlay');
    if (!overlay) return;
    const gameCfg = PRE_INTRO_CONFIG[gameType];
    if (!gameCfg) return;
    const layout = gameCfg.layoutStage2;
    const activeKey = gameCfg.activeKey;

    overlay.querySelectorAll('.intro-char').forEach(el => {
        const key = el.dataset.key;
        const cfg = layout[key];
        const charCfg = PRE_INTRO_CONFIG.chars[key];
        if (key === activeKey) {
            setSrc(el, charCfg.bright);
            el.classList.remove('dim');
            el.classList.add('active');
            el.style.transform = `scale(${cfg.scale || 1})`;
        } else {
            setSrc(el, charCfg.bright);
            el.classList.remove('active', 'dim');
            el.classList.add('idle');
            el.style.transform = '';
        }
        applyLayout(el, cfg);
    });
}

/* ---------------- 启动入口 ----------------
   gameType: 'bind' | 'nail'
   onComplete: 用户点击高亮字、闪黑后调用（直接 lightUp，跳过原开幕）

   流程：
     1. 整层淡入（fadeInMs）
     2. 4 字按 layoutStage1 全亮显示，停留 charsAllBrightMs
     3. 切换到 layoutStage2：active 字放大保持亮，其余切到 _暗 版变暗
     4. readyDelayMs 后绑定点击事件
     5. 用户点击 active 字 → 闪黑（overlay 变黑，停留 blackoutMs）→ 调用 onComplete + overlay 淡出
------------------------------------------------- */
function startPreIntro(gameType, onComplete) {
    // 破缓存：用户换了图片能立刻看到（背景/边框/logo 加时间戳）
    const bust = (src) => src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=' + ASSET_VERSION;

    // 持久边框（全屏 fixed，z-index 200，常驻）
    const frame = $('frame-img');
    if (frame) frame.src = bust(PRE_INTRO_CONFIG.frame.src);

    // logo（左下角，z-index 201，高于边框）
    let logo = $('intro-logo');
    if (!logo) {
        logo = document.createElement('img');
        logo.id = 'intro-logo';
        document.body.appendChild(logo);
    }
    logo.src = bust(PRE_INTRO_CONFIG.logo.src);
    const lp = PRE_INTRO_CONFIG.logo.pos;
    logo.style.cssText = `position:fixed; z-index:201; pointer-events:none;
        left:${lp.left}%; top:${lp.top}%; width:${lp.width}%; height:${lp.height}%;
        object-fit:contain;`;

    const overlay = $('intro-overlay');
    if (!overlay) {
        onComplete && onComplete();
        return;
    }

    const gameCfg = PRE_INTRO_CONFIG[gameType];
    if (!gameCfg) {
        onComplete && onComplete();
        return;
    }

    // 阶段1：4 字全亮
    buildChars(gameType, 1);

    const activeKey = gameCfg.activeKey;
    const t = gameCfg.timings;
    let clicked = false;

    // 整层淡入
    requestAnimationFrame(() => overlay.classList.add('show'));

    // 阶段1 → 阶段2：停留 charsAllBrightMs 后切换
    setTimeout(() => {
        switchToStage2(gameType);

        // 阶段2 后 readyDelayMs 再允许点击
        setTimeout(() => {
            overlay.querySelectorAll('.intro-char').forEach(el => {
                el.addEventListener('click', onCharClick);
                el.addEventListener('pointerdown', onCharClick);
            });
        }, t.readyDelayMs);
    }, t.charsAllBrightMs);

    function onCharClick(ev) {
        if (clicked) return;
        const target = ev.currentTarget;
        if (target.dataset.key !== activeKey) return;
        clicked = true;
        // 进入正式游戏：停止「初始界面」背景音乐
        if (window.IntroAudio) window.IntroAudio.stopBgm();
        target.classList.add('clicked');
        // 闪黑：overlay 变黑，背景图和字淡出
        overlay.classList.add('blackout');
        // 停留 blackoutMs 后调用 onComplete + overlay 淡出
        setTimeout(() => {
            onComplete && onComplete();
            overlay.classList.remove('show');
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.classList.remove('fade-out', 'blackout');
                const video = $('intro-bg');
                if (video && video._cleanupIntro) video._cleanupIntro();
            }, t.fadeOutMs);
        }, t.blackoutMs);
    }
}

/* ---------------- 暴露 ---------------- */
window.PRE_INTRO_CONFIG = PRE_INTRO_CONFIG;
window.startPreIntro = startPreIntro;
// 暴露给编辑器使用
window._INTRO = { buildChars, switchToStage2, applyLayout, setSrc };

})();
