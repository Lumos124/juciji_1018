/* ============================================================
   焗瓷记 · 小游戏开场音频（名瓷鉴定 / 找碴对缝 / 绑扎定型 / 打孔上钉 共用）
   - 进入小游戏的初始界面即循环播放背景音乐（不点击也一直循环）
   - 点击任意按键 / 高亮字符时，叠加播放一次「主页点击 UI 音效」
   音频文件位于项目旁的 ../audio/游戏初始界面/，由 server.js 的 /audio/ 别名挂载。
   ============================================================ */
(function () {
    'use strict';

    const BGM_SRC = '/audio/游戏初始界面/1.小游戏初始界面的背景音乐循环播放.mp3';
    const CLICK_SRC = '/audio/游戏初始界面/主页点击UI的音效.mp3';

    const bgm = new Audio();
    bgm.src = BGM_SRC;
    bgm.loop = true;
    bgm.preload = 'auto';

    const clickSfx = new Audio();
    clickSfx.src = CLICK_SRC;
    clickSfx.preload = 'auto';

    // 可点击“按键”：按钮、链接、下拉/输入，以及绑扎/上钉开场里的高亮字。
    const CLICKABLE = 'button, a, [role="button"], input, select, .intro-char, .intro-comp-btn';

    let bgmStarted = false;
    let armed = false;
    let stopped = false;
    let fadeRaf = null;
    let clickEnabled = true;

    function playBgm() {
        if (stopped) return;
        const p = bgm.play();
        if (!p || !p.catch) {
            bgmStarted = true;
            return;
        }
        p.then(() => {
            bgmStarted = true;
            disarm();
        }).catch(() => {
            // 浏览器自动播放策略拦截：等首次用户手势再启动。
            arm();
        });
    }

    // 进入正式游戏时调用：淡出并停止「初始界面」背景音乐，之后不再自动恢复。
    function stopBgm() {
        stopped = true;
        bgmStarted = false;
        disarm();
        if (bgm.paused) return;

        const startVol = bgm.volume;
        const t0 = performance.now();
        const fadeMs = 500;
        const tick = () => {
            const k = Math.min(1, (performance.now() - t0) / fadeMs);
            bgm.volume = Math.max(0, startVol * (1 - k));
            if (k >= 1) {
                fadeRaf = null;
                bgm.pause();
                bgm.volume = startVol;
                return;
            }
            fadeRaf = requestAnimationFrame(tick);
        };
        if (fadeRaf !== null) cancelAnimationFrame(fadeRaf);
        fadeRaf = requestAnimationFrame(tick);
    }

    function onFirstGesture() {
        if (!bgmStarted && !stopped) playBgm();
    }

    function arm() {
        if (armed) return;
        armed = true;
        // 捕获阶段监听首次手势：即使页面组件对 click 调用了 stopPropagation，
        // 这里也能先启动背景音乐。
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((ev) => {
            document.addEventListener(ev, onFirstGesture, true);
        });
    }

    function disarm() {
        if (!armed) return;
        armed = false;
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((ev) => {
            document.removeEventListener(ev, onFirstGesture, true);
        });
    }

    function playClick() {
        if (!clickEnabled) return;
        try {
            clickSfx.currentTime = 0;
            const p = clickSfx.play();
            if (p && p.catch) p.catch(() => {});
        } catch (err) {
            /* 忽略播放异常 */
        }
    }

    // 捕获阶段监听，确保先于页面自身的点击逻辑拿到事件。
    // 绑扎/上钉的开场高亮字是在 pointerdown 里立即进入游戏的，往往不会再有 click，
    // 因此 pointerdown / click 都要接管，并用时间戳避免同一次操作播两遍。
    let lastPointerAt = 0;
    document.addEventListener('pointerdown', (e) => {
        const el = e.target;
        if (el && el.closest && el.closest(CLICKABLE)) {
            lastPointerAt = performance.now();
            playClick();
        }
    }, true);
    document.addEventListener('click', (e) => {
        if (performance.now() - lastPointerAt < 600) return;
        const el = e.target;
        if (el && el.closest && el.closest(CLICKABLE)) playClick();
    }, true);

    // 切到后台时暂停背景音乐，回到页面再继续循环。
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (!bgm.paused) bgm.pause();
        } else if (stopped) {
            /* 已进入正式游戏，不再恢复初始界面背景音乐 */
        } else if (bgmStarted) {
            const p = bgm.play();
            if (p && p.catch) p.catch(() => {});
        } else {
            playBgm();
        }
    });

    window.IntroAudio = {
        bgm,
        clickSfx,
        playClick,
        stopBgm,
        setClickEnabled(value) {
            clickEnabled = !!value;
        },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', playBgm, { once: true });
    } else {
        playBgm();
    }
})();
