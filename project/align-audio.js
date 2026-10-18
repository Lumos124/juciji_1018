/* ============================================================
   焗瓷记 · 找碴对缝 游戏音效
   音频位于 ../audio/找碴对缝/，由 server.js 的 /audio/ 别名挂载。

   事件对应：
     点击「找碴对缝」icon       → 1.点击UI时的音效
     文字图.png 出现/消失       → 2.游戏画面出现时播放的音效
     中心大瓷器开场出现          → 3.中心大瓷器出现时的动画音效
     提示小条滑入 + 4 个碎片出现 → 4.提示小条滑入，与4个小碎片出现
     按下碎片开始拖动           → 5.点击瓷器时播放的音效
     拼合成功、大瓷器出现        → 6.大瓷器碎片出现时的音效
     拼合完成动画 webp 播放      → 9.瓷器旋转变化的音效

   背景音乐由 game-bgm.js 管理，本文件不处理背景音乐。
   ============================================================ */
(function () {
    'use strict';

    const DIR = '/audio/找碴对缝/';
    const FILES = {
        uiClick: DIR + '1.点击UI时的音效.mp3',
        screen: DIR + '2.游戏画面出现时播放的音效.mp3',
        center: DIR + '3.中心大瓷器出现时的动画音效.mp3',
        fragments: DIR + '4.提示小条滑入，与4个小碎片出现.mp3',
        click: DIR + '5.点击瓷器时播放的音效.mp3',
        bigFragment: DIR + '6.大瓷器碎片出现时的音效.mp3',
        rotate: DIR + '9.瓷器旋转变化的音效.mp3',
    };

    function make(src) {
        const a = new Audio();
        a.src = src;
        a.preload = 'auto';
        return a;
    }

    const sfx = {
        uiClick: make(FILES.uiClick),
        screen: make(FILES.screen),
        center: make(FILES.center),
        fragments: make(FILES.fragments),
        click: make(FILES.click),
        bigFragment: make(FILES.bigFragment),
        rotate: make(FILES.rotate),
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

    // 进入找碴对缝后，初始界面的通用 UI 点击音停用，改用本游戏的音效。
    if (window.IntroAudio && typeof window.IntroAudio.setClickEnabled === 'function') {
        window.IntroAudio.setClickEnabled(false);
    }

    window.AlignAudio = {
        uiClick() { play(sfx.uiClick); },
        screen() { play(sfx.screen); },
        center() { play(sfx.center); },
        fragments() { play(sfx.fragments); },
        click() { play(sfx.click); },
        bigFragment() { play(sfx.bigFragment); },
        rotate() { play(sfx.rotate); },
        sfx,
    };
})();
