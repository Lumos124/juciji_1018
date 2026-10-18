/* ============================================================
   焗瓷记 · 名瓷鉴定 游戏音效
   音频位于 ../audio/名瓷鉴定/，由 server.js 的 /audio/ 别名挂载。

   事件对应：
     进入正式游戏          → 2.游戏画面出现时播放的音效
     点击「识瓷介绍」      → 1.点击UI时的音效
     瓷器图片闪现提示      → 3.瓷器图片每闪现一次就播放一次音效
     第一个瓷器被激活      → 6.第一个瓷器图片被激活时的音效
     后面瓷器被激活        → 8.后面几个瓷器图片被激活时的音效
     点击瓷器              → 4.点击瓷器时播放的音效
     第一个瓷器介绍动画     → 7.第一个瓷器介绍动画的音效
     后面瓷器介绍动画       → 9.后面几个瓷器介绍动画的音效
   ============================================================ */
(function () {
    'use strict';

    const DIR = '/audio/名瓷鉴定/';
    const FILES = {
        clickUi: DIR + '1.点击UI时的音效.mp3',
        appear: DIR + '2.游戏画面出现时播放的音效.mp3',
        flash: DIR + '3.瓷器图片每闪现一次就播放一次音效.mp3',
        clickPorcelain: DIR + '4.点击瓷器时播放的音效.mp3',
        firstActivate: DIR + '6.第一个瓷器图片被激活时的音效.mp3',
        firstIntro: DIR + '7.第一个瓷器介绍动画的音效.mp3',
        laterActivate: DIR + '8.后面几个瓷器图片被激活时的音效.mp3',
        laterIntro: DIR + '9.后面几个瓷器介绍动画的音效.mp3',
    };

    function make(src) {
        const a = new Audio();
        a.src = src;
        a.preload = 'auto';
        return a;
    }

    const sfx = {
        clickUi: make(FILES.clickUi),
        appear: make(FILES.appear),
        flash: make(FILES.flash),
        clickPorcelain: make(FILES.clickPorcelain),
        firstActivate: make(FILES.firstActivate),
        firstIntro: make(FILES.firstIntro),
        laterActivate: make(FILES.laterActivate),
        laterIntro: make(FILES.laterIntro),
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

    let started = false;

    const CLICKABLE = 'button, a, [role="button"], input, select, .intro-comp-btn';
    let lastPointerAt = 0;
    document.addEventListener('pointerdown', (e) => {
        if (!started) return;
        const el = e.target;
        if (!el || !el.closest) return;
        if (el.closest('#active-hotkey')) return;   // 瓷器热点由 clickPorcelain 单独接管
        if (el.closest(CLICKABLE)) {
            lastPointerAt = performance.now();
            play(sfx.clickUi);
        }
    }, true);
    document.addEventListener('click', (e) => {
        if (!started) return;
        if (performance.now() - lastPointerAt < 600) return;
        const el = e.target;
        if (!el || !el.closest) return;
        if (el.closest('#active-hotkey')) return;
        if (el.closest(CLICKABLE)) play(sfx.clickUi);
    }, true);

    window.CheckAudio = {
        startGame() {
            if (started) return;
            started = true;
            play(sfx.appear);
        },
        clickUi() {
            play(sfx.clickUi);
        },
        flash(pos) {
            play(sfx.flash);
            play(pos === 0 ? sfx.firstActivate : sfx.laterActivate);
        },
        clickPorcelain() {
            play(sfx.clickPorcelain);
        },
        intro(pos) {
            play(pos === 0 ? sfx.firstIntro : sfx.laterIntro);
        },
        sfx,
    };
})();
