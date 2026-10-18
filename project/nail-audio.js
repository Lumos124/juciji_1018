/* ============================================================
   焗瓷记 · 打孔上钉 游戏音效
   音频位于 ../audio/打孔上钉/，由 server.js 的 /audio/ 别名挂载。

     点击                → 1.点击时的音效
     刚进入正式游戏       → 2.游戏画面出现时播放的音效
     瓷杯底图移动         → 4.杯子的移动音效
     钉子底图（剪影）出现   → 5.钉子剪影出现时的音效
     完成钉子、出现 xx 钉子 → 3.锔钉出现音效
   ============================================================ */
(function () {
    'use strict';

    const DIR = '/audio/打孔上钉/';
    const FILES = {
        click: DIR + '1.点击时的音效.mp3',
        appear: DIR + '2.游戏画面出现时播放的音效.mp3',
        nailAppear: DIR + '3.锔钉出现音效.mp3',
        cupMove: DIR + '4.杯子的移动音效.mp3',
        silhouette: DIR + '5.钉子剪影出现时的音效.mp3',
    };

    function make(src) {
        const a = new Audio();
        a.src = src;
        a.preload = 'auto';
        return a;
    }

    const sfx = {
        click: make(FILES.click),
        appear: make(FILES.appear),
        nailAppear: make(FILES.nailAppear),
        cupMove: make(FILES.cupMove),
        silhouette: make(FILES.silhouette),
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

    /* ---------------- 进入正式游戏 ---------------- */
    let gameStarted = false;
    function startGame() {
        if (gameStarted) return;
        gameStarted = true;
        play(sfx.appear);   // 游戏画面出现
    }

    /* ---------------- 点击音效：按下即响 ---------------- */
    // click 要等抬手才触发，触屏更晚；pointerdown 在按下瞬间响。
    // 键盘激活（Enter/Space）没有 pointerdown，用 click 兜底并去重。
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

    window.NailAudio = {
        startGame,
        cupMove: () => play(sfx.cupMove),
        silhouette: () => play(sfx.silhouette),
        nailAppear: () => play(sfx.nailAppear),
        sfx,
    };
})();
