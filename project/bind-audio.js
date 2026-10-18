/* ============================================================
   焗瓷记 · 绑扎定型 游戏音效
   音频位于 ../audio/绑扎定型/，由 server.js 的 /audio/ 别名挂载。

   事件对应：
     进入正式游戏        → BGM「1.背景音乐分贝率变化版」循环 + 「3.入场环境音」一次
     点击                → 「4.点击时的音效」
     四瓣花每次扩散       → 「5.单次装饰花纹扩散动画的伴随音效」
     右侧三个底图出现     → 「7.右侧三个瓷杯UI出现的影像」
     滑动icon第一次出现   → 「7.左上角横条提示出现的声音」（仅第一次）
     拖动绳子            → 「8.短音效」/「10.长音效」（按拖动时长选一个）
     绳子被点亮           → 「9.绳子被第一次点亮时的音效」
     触发成就            → 「11.瓷杯被激活时的音效」
     文字成就出现         → 「12.井字的滑动音效」/「15.十字的滑动音效」
   ============================================================ */
(function () {
    'use strict';

    const DIR = '/audio/绑扎定型/';
    const FILES = {
        bgm: DIR + '1.背景音乐分贝率变化版（当玩家开始正式交互时，背景音乐分贝变低）.mp3',
        ambient: DIR + '3.入场时的环境音不用循环.mp3',
        click: DIR + '4.点击时的音效.mp3',
        flower: DIR + '5.单次装饰花纹扩散动画的伴随音效.mp3',
        cupsUI: DIR + '7.右侧三个瓷杯UI出现的影像.mp3',
        slideHint: DIR + '7.左上角横条提示出现的声音仅播放第一次.mp3',
        ropeShort: DIR + '8.拖动绳子的短音效.mp3',
        ropeLong: DIR + '10.拖动绳子的长音效.mp3',
        ropeLit: DIR + '9.绳子被第一次点亮时的音效.mp3',
        achievement: DIR + '11.瓷杯被激活时的音效.mp3',
        textJing: DIR + '12.井字的滑动音效.mp3',
        textShi: DIR + '15.十字的滑动音效.mp3',
    };

    function make(src, loop) {
        const a = new Audio();
        a.src = src;
        a.preload = 'auto';
        a.loop = !!loop;
        return a;
    }

    // 正式游戏 BGM 统一由 game-bgm.js 提供（四个小游戏共用同一首）；
    // 仅在共享模块缺席时，才用这份自带实例兜底。
    let fallbackBgm = null;
    function getBgm() {
        if (window.GameBgm && window.GameBgm.audio) return window.GameBgm.audio;
        if (!fallbackBgm) fallbackBgm = make(FILES.bgm, true);
        return fallbackBgm;
    }
    const sfx = {
        ambient: make(FILES.ambient),
        click: make(FILES.click),
        flower: make(FILES.flower),
        cupsUI: make(FILES.cupsUI),
        slideHint: make(FILES.slideHint),
        ropeShort: make(FILES.ropeShort),
        ropeLong: make(FILES.ropeLong),
        ropeLit: make(FILES.ropeLit),
        achievement: make(FILES.achievement),
        textJing: make(FILES.textJing),
        textShi: make(FILES.textShi),
    };

    function play(a) {
        if (!a) return;
        try {
            a.currentTime = 0;
            const p = a.play();
            if (p && p.catch) p.catch(() => {});
        } catch (err) {
            /* 忽略播放异常 */
        }
    }

    function stop(a) {
        if (!a || a.paused) return;
        try {
            a.pause();
        } catch (err) {
            /* 忽略播放异常 */
        }
    }

    /* ---------------- 进入正式游戏 ---------------- */
    let gameStarted = false;
    let slideHintPlayed = false;

    // 停掉「游戏初始界面」BGM、起「正式游戏」BGM 的动作在 game-bgm.js 里统一处理。
    function startBgm() {
        if (window.GameBgm && typeof window.GameBgm.start === 'function') {
            window.GameBgm.start();
            return;
        }
        const a = getBgm();
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
    }

    function startGame() {
        if (gameStarted) return;
        gameStarted = true;
        startBgm();
        play(sfx.ambient);   // 入场环境音：一次，不循环
    }

    /* ---------------- 点击音效 ---------------- */
    // 用 pointerdown 而不是 click：click 要等抬手才触发，触屏上更晚；
    // pointerdown 在按下瞬间就响，做到即时响应。键盘激活（Enter/Space）没有
    // pointerdown，用 click 兜底，并用时间戳避免同一次操作播两遍。
    let lastPointerAt = 0;
    document.addEventListener('pointerdown', () => {
        if (!gameStarted) return;
        lastPointerAt = performance.now();
        play(sfx.click);
    }, true);
    document.addEventListener('click', () => {
        if (!gameStarted) return;
        if (performance.now() - lastPointerAt < 600) return;
        play(sfx.click);
    }, true);

    /* ---------------- 拖动绳子：按拖动时长选长/短音效 ---------------- */
    // 拖动一开始就出声，避免“拖的时候没声、松手才响”的滞后感；
    // 拖得久（超过短音效时长）再续上长音效，跟随拖动过程。
    const DRAG_LONG_MS = 900;   // ≈ 短音效时长 0.86s
    let dragTimer = null;
    let dragActive = false;

    function ropeDragStart() {
        clearDrag();
        dragActive = true;
        play(sfx.ropeShort);
        dragTimer = setTimeout(() => {
            dragTimer = null;
            if (dragActive) play(sfx.ropeLong);
        }, DRAG_LONG_MS);
    }
    function ropeDragEnd() {
        dragActive = false;
        if (dragTimer !== null) { clearTimeout(dragTimer); dragTimer = null; }
        // 松开即停，音效长度跟随实际拖动时长，不拖尾。
        stop(sfx.ropeShort);
        stop(sfx.ropeLong);
    }
    function clearDrag() {
        dragActive = false;
        if (dragTimer !== null) { clearTimeout(dragTimer); dragTimer = null; }
    }

    /* ---------------- 文字成就音效（井 / 十） ---------------- */
    const TEXT_SFX = { '井字': sfx.textJing, '十字': sfx.textShi };

    window.BindAudio = {
        startGame,
        flower: () => play(sfx.flower),
        cupsUI: () => play(sfx.cupsUI),
        slideHint: () => {
            if (slideHintPlayed) return;   // 仅第一次出现时播放
            slideHintPlayed = true;
            play(sfx.slideHint);
        },
        ropeDragStart,
        ropeDragEnd,
        ropeLit: () => play(sfx.ropeLit),
        achievement: () => play(sfx.achievement),
        achievementText: (method) => play(TEXT_SFX[method]),
        // 调试用
        get bgm() { return getBgm(); },
        sfx,
    };
})();
