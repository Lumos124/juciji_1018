/* ============================================================
   焗瓷记 · 正式游戏背景音乐（四个小游戏共用）
   - 进入任意一个小游戏（点击对应段位字/组件）后调用 GameBgm.start()：
       1) 停止「游戏初始界面」的循环背景音乐（intro-audio.js 的 IntroAudio）
       2) 开始循环播放「绑扎定型/1.背景音乐分贝率变化版」（玩家开始正式交互时音量变低）
   - 浏览器自动播放策略拦截时，等首次用户手势再补播，保证音乐一定会响。
   ============================================================ */
(function () {
    'use strict';

    const SRC = '/audio/绑扎定型/1.背景音乐分贝率变化版（当玩家开始正式交互时，背景音乐分贝变低）.mp3';
    const VOLUME = 0.55;

    const audio = new Audio();
    audio.src = SRC;
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = VOLUME;

    let requested = false;   // 是否已经进入正式游戏
    let playing = false;     // 是否真的在播
    let armed = false;       // 是否正在等首次手势补播
    let stopped = false;

    function onGesture() {
        if (requested && !playing && !stopped) tryPlay();
    }

    function arm() {
        if (armed) return;
        armed = true;
        ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((ev) => {
            document.addEventListener(ev, onGesture, true);
        });
    }

    function disarm() {
        if (!armed) return;
        armed = false;
        ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((ev) => {
            document.removeEventListener(ev, onGesture, true);
        });
    }

    function tryPlay() {
        if (stopped) return;
        let p = null;
        try {
            p = audio.play();
        } catch (err) {
            arm();
            return;
        }
        if (p && p.then) {
            p.then(() => { playing = true; disarm(); })
                .catch(() => { playing = false; arm(); });
        } else {
            playing = true;
            disarm();
        }
    }

    // 进入正式游戏：停初始界面 BGM，起正式游戏 BGM。
    function start() {
        stopped = false;
        if (requested && playing) return;
        requested = true;
        if (window.IntroAudio && typeof window.IntroAudio.stopBgm === 'function') {
            window.IntroAudio.stopBgm();
        }
        tryPlay();
    }

    // 结算/离开页面时使用（可选）。
    function stop() {
        stopped = true;
        playing = false;
        disarm();
        if (!audio.paused) audio.pause();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (!audio.paused) audio.pause();
        } else if (requested && !playing && !stopped) {
            tryPlay();
        }
    });

    window.GameBgm = {
        start,
        stop,
        get audio() { return audio; },
        get isPlaying() { return playing; },
    };
})();
