/* ============================================================
   焗瓷记 · 小游戏结算音效（名瓷鉴定 / 找碴对缝 / 绑扎定型 / 打孔上钉 共用）
   音频位于 ../audio/游戏结算/，由 server.js 的 /audio/ 别名挂载。

     1.结算跳转开头的音效  → 结算图像滑入（跳转开头）
     2.等级出现音效        → 等级出现
     3.分数滚动音效        → 分数出现
     4.提示划入            → 返回 / 提示滑入

   名瓷鉴定、找碴对缝的结算是 CSS 动画驱动的：这里监听 animationstart，
   动画延时结束后真正开始时自动触发，无需改各自的页面脚本。
   绑扎定型、打孔上钉的结算是 JS 驱动的：由 buildComplete() 调用 SettleAudio.*。
   ============================================================ */
(function () {
    'use strict';

    const DIR = '/audio/游戏结算/';
    const FILES = {
        jump: DIR + '1.结算跳转开头的音效.mp3',
        grade: DIR + '2.等级出现音效.mp3',
        score: DIR + '3.分数滚动音效.mp3',
        hint: DIR + '4.提示划入.mp3',
    };

    function make(src) {
        const a = new Audio();
        a.src = src;
        a.preload = 'auto';
        return a;
    }

    const sfx = {
        jump: make(FILES.jump),
        grade: make(FILES.grade),
        score: make(FILES.score),
        hint: make(FILES.hint),
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

    const SettleAudio = {
        jump: () => play(sfx.jump),
        grade: () => play(sfx.grade),
        score: () => play(sfx.score),
        hint: () => play(sfx.hint),
        sfx,
    };
    window.SettleAudio = SettleAudio;

    // CSS 动画驱动的结算（名瓷鉴定 / 找碴对缝）：按结算组件的动画开始时刻触发。
    // animationstart 会在 animation-delay 结束后才触发，天然与视觉同步。
    const MAP = [
        ['.settle-scene', 'jump'],
        ['.settle-grade', 'grade'],
        ['.settle-score', 'score'],
        ['.settle-back', 'hint'],
    ];
    // 找碴对缝有两个分数元素同时动画，去重避免同一时刻重复播放。
    const lastFired = {};
    document.addEventListener('animationstart', (e) => {
        const el = e.target;
        if (!el || typeof el.matches !== 'function') return;
        for (let i = 0; i < MAP.length; i++) {
            if (el.matches(MAP[i][0])) {
                const name = MAP[i][1];
                const now = performance.now();
                if (lastFired[name] !== undefined && now - lastFired[name] < 300) return;
                lastFired[name] = now;
                SettleAudio[name]();
                return;
            }
        }
    }, true);
})();
