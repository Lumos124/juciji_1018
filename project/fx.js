/* 视频网页动效层：与主视频同一条滚动时间轴联动，全部由 fx.js 逐帧设置 */
(function () {
    'use strict';

    // 前 7.15 秒只播放网页动效，之后才进入故事视频。
    const INTRO_END = 7.15;
    const FX = {
        video: { in0: 0.35, in1: 1.35 },
        mask: { in0: 0.35, in1: 1.25, out0: 6.75, out1: 7.15, max: 0.82 },
        processReveal: { in0: 6.75, in1: 7.55 },
        boy: { in0: 0.95, in1: 1.95, out0: 4.25, out1: 4.75 },
        mono1: { in0: 1.60, in1: 3.00 },
        mono2: { in0: 2.90, in1: 4.25 },
        heroOut: { in0: 4.30, in1: 4.75 },
        logo: { in0: 4.95, in1: 5.25 },
        bar: { in0: 5.05, in1: 5.40 },
        token: { in0: 5.20, in1: 5.55 },
        text1: { in0: 5.35, in1: 5.65 },
        text2: { in0: 5.70, in1: 6.00 },
        text3: { in0: 6.05, in1: 6.45 },
        text4: { in0: 6.50, in1: 6.75 },
        fadeOut: { in0: 6.80, in1: 7.15 },
    };

    // 流程条横条连续向右推进；图标在各自时间点直接弹入。
    const PROCESS_TIMES = [0, 8, 21, 67, 80, 91];
    const PROCESS_PROGRESS = [
        { time: 0, x: 8.1 },
        { time: 8, x: 25.3 },
        { time: 21, x: 42.0 },
        { time: 67, x: 59.8 },
        { time: 80, x: 76.8 },
        { time: 91, x: 91.5 },
        { time: 92.5, x: 100 },
    ];
    const PAGE_SEGMENT = {
        enterStart: 20.4,
        enterEnd: 21.15,
        barStart: 21.05,
        barEnterEnd: 21.7,
        leftMaskOutStart: 22.2,
        leftMaskOutEnd: 22.55,
        leftVideoStart: 22.55,
        leftVideoEnd: 33.07,
        leftEffectStart: 33.07,
        leftEffectEnd: 39.27,
        rightMaskOutStart: 40.97,
        rightMaskOutEnd: 41.32,
        rightVideoStart: 41.32,
        rightVideoEnd: 50.86,
        rightEffectStart: 50.86,
        rightEffectEnd: 56.5,
        effectUndoStart: 56.5,
        effectUndoEnd: 58,
        sideExitStart: 58,
        sideExitEnd: 58.65,
        videoFadeStart: 58.65,
        exitEnd: 60.65,
    };

    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    function ramp(t, a, b) {
        if (b <= a) return t >= b ? 1 : 0;
        return clamp01((t - a) / (b - a));
    }

    function smooth(t, a, b) {
        const p = ramp(t, a, b);
        return p * p * (3 - 2 * p);
    }

    function backOut(p) {
        const c = 1.70158;
        const v = p - 1;
        return 1 + (c + 1) * v * v * v + c * v * v;
    }

    function revealStep(p, steps) {
        if (!steps) return clamp01(p);
        return Math.ceil(clamp01(p) * steps) / steps;
    }

    class FxRenderer {
        constructor() {
            this.main = document.getElementById('main-video');
            this.proxy = document.getElementById('proxy-video');
            this.root = document.querySelector('.fx-root');
            this.frame = document.getElementById('fx-frame');
            this.frameImg = document.getElementById('fx-frame-img');
            this.videoBox = document.querySelector('#fx-frame .video-container');
            this.mask = document.getElementById('fx-mask');
            this.boy = document.getElementById('fx-boy');
            this.mono1 = document.getElementById('fx-monologue-1');
            this.mono2 = document.getElementById('fx-monologue-2');
            this.process = document.getElementById('fx-process');
            this.processLogos = Array.from(document.querySelectorAll('#fx-process .process-logo'));
            this.processShortLines = Array.from(document.querySelectorAll('#fx-process .process-short-line'));
            this.pageStage = document.getElementById('page-stage');
            this.pageLeft = document.getElementById('page-left');
            this.pageRight = document.getElementById('page-right');
            this.pageBarLeft = document.getElementById('page-bar-left');
            this.pageBarRight = document.getElementById('page-bar-right');
            this.pageMaskLeft = document.getElementById('page-mask-left');
            this.pageMaskRight = document.getElementById('page-mask-right');
            this.pageBorderLeft = document.getElementById('page-border-left');
            this.pageBorderRight = document.getElementById('page-border-right');
            this.pageSideLeft = document.getElementById('page-side-left');
            this.pageSideRight = document.getElementById('page-side-right');
            this.lastInputActive = null;
            this.bar = document.getElementById('fx-vertical-bar');
            this.logo = document.getElementById('fx-logo');
            this.token = document.getElementById('fx-token');
            this.text1 = document.getElementById('fx-text-1');
            this.text2 = document.getElementById('fx-text-2');
            this.text3 = document.getElementById('fx-text-3');
            this.text4 = document.getElementById('fx-text-4');
            this.frameLogo = document.getElementById('fx-frame-logo');
            this.lastFrame = -1;
            if (typeof window.PAGE_STAGE_COMPONENT_LAYOUT_APPLY === 'function') {
                window.PAGE_STAGE_COMPONENT_LAYOUT_APPLY(document);
            }
            if (typeof window.PROCESS_BAR_LAYOUT_APPLY === 'function') {
                window.PROCESS_BAR_LAYOUT_APPLY(document);
            }
            this.tick = this.tick.bind(this);
            this.tick();
        }

        currentTime() {
            if (Number.isFinite(window.__timelineTime)) {
                return window.__timelineTime;
            }
            if (!this.main || !this.proxy) return 0;
            if (!this.main.classList.contains('active') && !this.proxy.classList.contains('active')) return 0;
            const story = this.main.classList.contains('active') ? this.main.currentTime : this.proxy.currentTime;
            return INTRO_END + story;
        }

        tick() {
            requestAnimationFrame(this.tick);
            if (!this.frame) return;
            const t = this.currentTime();
            const inputActive = this.isInputActive();
            if (inputActive !== this.lastInputActive) {
                this.lastInputActive = inputActive;
                this.lastFrame = -1;
            }
            if (Math.abs(t - this.lastFrame) < 0.0004) return;
            this.lastFrame = t;
            this.update(t);
        }

        isInputActive() {
            const controller = window.__videoScrollController;
            if (!controller) return false;
            const state = controller.state;
            if (state === 'scrubbing' || state === 'coasting' || state === 'presenting') {
                return true;
            }
            return (performance.now() - (controller.lastWheelAt || 0)) < 600;
        }

        update(t) {
            const F = FX;
            const introTime = Math.min(t, INTRO_END);
            const storyTime = Math.max(0, t - INTRO_END);

            // 边框与常驻 logo 从网页打开起就在；视频窗在序章保持黑底。
            this.frame.style.opacity = '1';
            const chromeOpacity = this.getChromeOpacity(storyTime);
            const pageSegmentActive = storyTime >= PAGE_SEGMENT.enterStart && storyTime < PAGE_SEGMENT.exitEnd;
            this.root.classList.toggle('page-segment-active', pageSegmentActive);
            this.frameImg.style.opacity = chromeOpacity.toFixed(4);
            if (this.frameLogo) this.frameLogo.style.opacity = chromeOpacity.toFixed(4);
            this.frame.style.transform = 'none';

            if (this.videoBox) {
                const videoIn = introTime >= INTRO_END ? 1 : smooth(introTime, F.video.in0, F.video.in1);
                const mainStoryOpacity = Math.max(
                    1 - smooth(storyTime, PAGE_SEGMENT.enterStart, PAGE_SEGMENT.enterEnd),
                    smooth(storyTime, PAGE_SEGMENT.videoFadeStart, PAGE_SEGMENT.exitEnd)
                );
                this.videoBox.style.opacity = (videoIn * mainStoryOpacity).toFixed(4);
            }

            const maskIn = smooth(introTime, F.mask.in0, F.mask.in1);
            const maskOut = 1 - smooth(introTime, F.mask.out0, F.mask.out1);
            const introMask = maskIn * maskOut * F.mask.max;
            this.mask.style.opacity = introMask.toFixed(4);
            this.updatePageVideos(storyTime, pageSegmentActive);

            const effectFade = 1 - smooth(introTime, F.fadeOut.in0, F.fadeOut.in1);
            const heroOut = smooth(introTime, F.heroOut.in0, F.heroOut.in1);

            const boyIn = smooth(introTime, F.boy.in0, F.boy.in1);
            let boy = boyIn * (1 - heroOut);
            if (boy > 0 && introTime < F.boy.out0) {
                const phase = Math.max(0, introTime - F.boy.in1);
                const blink = 0.55 + 0.45 * Math.max(0, Math.sin(phase * 5.2));
                boy *= blink;
            }
            this.boy.style.opacity = boy.toFixed(4);

            const mono = 1 - heroOut;
            this.revealHorizontal(this.mono1, introTime, F.mono1.in0, F.mono1.in1);
            this.revealHorizontal(this.mono2, introTime, F.mono2.in0, F.mono2.in1);
            this.mono1.style.opacity = mono.toFixed(4);
            this.mono2.style.opacity = mono.toFixed(4);

            const processReveal = smooth(t, F.processReveal.in0, F.processReveal.in1) * 100;
            this.process.style.opacity = (processReveal / 100).toFixed(4);
            this.updateProcess(storyTime);

            const barIn = smooth(introTime, F.bar.in0, F.bar.in1);
            const barShift = (1 - barIn) * 1.45;
            this.bar.style.opacity = (barIn * effectFade).toFixed(4);
            this.bar.style.transform = `translateX(-50%) translateY(${(-barShift * 100).toFixed(2)}%)`;

            const logoIn = smooth(introTime, F.logo.in0, F.logo.in1);
            const logoShift = (1 - logoIn) * 1.35;
            this.logo.style.opacity = (logoIn * effectFade).toFixed(4);
            this.logo.style.transform = `translateX(${(-logoShift * 100).toFixed(2)}%)`;

            const tokenIn = smooth(introTime, F.token.in0, F.token.in1);
            const tokenScale = 1.12 - tokenIn * 0.12;
            this.token.style.opacity = (tokenIn * effectFade).toFixed(4);
            this.token.style.transform = `scale(${tokenScale.toFixed(4)})`;

            this.revealText(this.text1, introTime, F.text1.in0, F.text1.in1);
            this.revealText(this.text2, introTime, F.text2.in0, F.text2.in1);
            this.revealText(this.text3, introTime, F.text3.in0, F.text3.in1);
            this.revealText(this.text4, introTime, F.text4.in0, F.text4.in1);
            if (this.text1) this.text1.style.opacity = effectFade.toFixed(4);
            if (this.text2) this.text2.style.opacity = effectFade.toFixed(4);
            if (this.text3) this.text3.style.opacity = effectFade.toFixed(4);
            if (this.text4) this.text4.style.opacity = effectFade.toFixed(4);
        }

        updateProcess(storyTime) {
            this.processLogos.forEach((el, index) => {
                const start = PROCESS_TIMES[index];
                const visible = storyTime >= start - 0.001;
                const wasVisible = el.classList.contains('is-visible');
                el.style.opacity = visible ? '1' : '0';
                if (visible === wasVisible) return;
                el.classList.toggle('is-visible', visible);
                if (visible) {
                    // 回到节点前再进入时重新触发弹动，图标仍严格在节点时刻出现。
                    el.style.animation = 'none';
                    void el.offsetWidth;
                    el.style.animation = '';
                }
            });
            this.processShortLines.forEach((el, index) => {
                const start = PROCESS_TIMES[index];
                const end = PROCESS_TIMES[index + 1];
                const progress = smooth(storyTime, start, end);
                el.style.opacity = progress > 0.001 ? '0.88' : '0';
                el.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(2)}% 0 0)`;
            });
            this.process.style.setProperty('--process-progress', this.getProcessProgress(storyTime).toFixed(3) + '%');
        }

        getProcessProgress(storyTime) {
            if (storyTime <= PROCESS_PROGRESS[0].time) return PROCESS_PROGRESS[0].x;
            for (let i = 1; i < PROCESS_PROGRESS.length; i++) {
                const prev = PROCESS_PROGRESS[i - 1];
                const next = PROCESS_PROGRESS[i];
                if (storyTime <= next.time) {
                    const p = (storyTime - prev.time) / Math.max(0.001, next.time - prev.time);
                    return prev.x + (next.x - prev.x) * p;
                }
            }
            return 100;
        }

        updatePageVideos(storyTime, active) {
            this.pageStage.classList.toggle('active', active);
            if (!active) {
                [this.pageLeft, this.pageRight, this.pageBarLeft, this.pageBarRight].forEach((video) => video.pause());
                this.pageLeft.style.opacity = '0';
                this.pageRight.style.opacity = '0';
                this.pageMaskLeft.style.opacity = '0';
                this.pageMaskRight.style.opacity = '0';
                this.pageBorderLeft.style.opacity = '0';
                this.pageBorderRight.style.opacity = '0';
                this.pageBarLeft.style.opacity = '0';
                this.pageBarRight.style.opacity = '0';
                this.pageSideLeft.style.opacity = '0';
                this.pageSideRight.style.opacity = '0';
                return;
            }

            const pageFadeIn = smooth(storyTime, PAGE_SEGMENT.enterStart, PAGE_SEGMENT.enterEnd);
            const pageFadeOut = 1 - smooth(storyTime, PAGE_SEGMENT.videoFadeStart, PAGE_SEGMENT.exitEnd);
            const pageVideoOpacity = pageFadeIn * pageFadeOut;

            // 先让左右视频层和遮罩一起渐显；之后左侧遮罩先撤除，右侧遮罩继续保留。
            this.pageLeft.style.opacity = pageVideoOpacity.toFixed(4);
            this.pageRight.style.opacity = pageVideoOpacity.toFixed(4);
            const leftMaskOut = 1 - smooth(storyTime, PAGE_SEGMENT.leftMaskOutStart, PAGE_SEGMENT.leftMaskOutEnd);
            const rightMaskOut = 1 - smooth(storyTime, PAGE_SEGMENT.rightMaskOutStart, PAGE_SEGMENT.rightMaskOutEnd);
            this.pageMaskLeft.style.opacity = (pageVideoOpacity * leftMaskOut).toFixed(4);
            this.pageMaskRight.style.opacity = (pageVideoOpacity * rightMaskOut).toFixed(4);

            // 活动边框自带 logo，从各自视频开始一直保持到上层动效撤销结束。
            const effectUndoFade = 1 - smooth(storyTime, PAGE_SEGMENT.effectUndoStart, PAGE_SEGMENT.effectUndoEnd);
            const leftBorderVisible = storyTime >= PAGE_SEGMENT.leftVideoStart;
            const rightBorderVisible = storyTime >= PAGE_SEGMENT.rightVideoStart;
            this.pageBorderLeft.style.opacity = (leftBorderVisible ? pageVideoOpacity * effectUndoFade : 0).toFixed(4);
            this.pageBorderRight.style.opacity = (rightBorderVisible ? pageVideoOpacity * effectUndoFade : 0).toFixed(4);

            const barsVisible = storyTime >= PAGE_SEGMENT.barStart && storyTime < PAGE_SEGMENT.sideExitEnd;
            const barEntry = smooth(storyTime, PAGE_SEGMENT.barStart, PAGE_SEGMENT.barEnterEnd);
            const barExit = smooth(storyTime, PAGE_SEGMENT.sideExitStart, PAGE_SEGMENT.sideExitEnd);
            const barTransform = `translateY(${((-112 + barEntry * 112) + barExit * 124).toFixed(2)}%)`;
            const barOpacity = barsVisible ? pageFadeOut : 0;

            // 左右侧边条共用同一条入场/退场曲线，始终同时出现、同时消失。
            this.pageBarLeft.style.opacity = barOpacity.toFixed(4);
            this.pageBarRight.style.opacity = barOpacity.toFixed(4);
            this.pageSideLeft.style.opacity = barOpacity.toFixed(4);
            this.pageSideRight.style.opacity = barOpacity.toFixed(4);
            this.pageBarLeft.style.transform = barTransform;
            this.pageBarRight.style.transform = barTransform;
            this.pageSideLeft.style.transform = barTransform;
            this.pageSideRight.style.transform = barTransform;

            // 左边视频播完后开始左动效；左边动效结束时，才结束右侧遮罩等待。
            const leftEffectVisible = storyTime >= PAGE_SEGMENT.leftEffectStart
                && storyTime < PAGE_SEGMENT.effectUndoEnd;
            const rightEffectVisible = storyTime >= PAGE_SEGMENT.rightEffectStart
                && storyTime < PAGE_SEGMENT.effectUndoEnd;
            const undoProgress = smooth(storyTime, PAGE_SEGMENT.effectUndoStart, PAGE_SEGMENT.effectUndoEnd);
            this.pageBarLeft.style.opacity = leftEffectVisible ? '1' : '0';
            this.pageBarRight.style.opacity = rightEffectVisible ? '1' : '0';

            if (storyTime >= PAGE_SEGMENT.effectUndoStart) {
                this.syncReverseEffect(this.pageBarLeft, undoProgress, 4.95, leftEffectVisible);
                this.syncReverseEffect(this.pageBarRight, undoProgress, 4.29, rightEffectVisible);
            } else {
                const leftProgress = (storyTime - PAGE_SEGMENT.leftEffectStart)
                    / Math.max(0.001, PAGE_SEGMENT.leftEffectEnd - PAGE_SEGMENT.leftEffectStart);
                const rightProgress = (storyTime - PAGE_SEGMENT.rightEffectStart)
                    / Math.max(0.001, PAGE_SEGMENT.rightEffectEnd - PAGE_SEGMENT.rightEffectStart);
                this.syncScrubVideoProgress(this.pageBarLeft, leftProgress, leftEffectVisible);
                this.syncScrubVideoProgress(this.pageBarRight, rightProgress, rightEffectVisible);
            }

            const leftVideoActive = storyTime >= PAGE_SEGMENT.leftVideoStart && storyTime <= PAGE_SEGMENT.exitEnd;
            const rightVideoActive = storyTime >= PAGE_SEGMENT.rightVideoStart && storyTime <= PAGE_SEGMENT.exitEnd;
            this.syncScrubVideo(this.pageLeft, storyTime - PAGE_SEGMENT.leftVideoStart, leftVideoActive);
            this.syncScrubVideo(this.pageRight, storyTime - PAGE_SEGMENT.rightVideoStart, rightVideoActive);
        }

        syncReverseEffect(video, undoProgress, fallbackDuration, active) {
            if (!active) {
                video.pause();
                return;
            }
            if (!Number.isFinite(video.duration) || video.readyState < 1 || video.seeking) return;
            const duration = video.duration > 0 ? video.duration : fallbackDuration;
            const target = Math.max(0, Math.min(duration - 0.04, duration * (1 - undoProgress)));
            if (Math.abs(video.currentTime - target) > 0.035) {
                video.currentTime = target;
            }
        }

        syncScrubVideoProgress(video, progress, active) {
            if (!active) {
                video.pause();
                return;
            }
            if (!Number.isFinite(video.duration) || video.readyState < 1 || video.seeking) return;
            const p = Math.max(0, Math.min(1, progress));
            const target = Math.max(0, Math.min(video.duration - 0.04, video.duration * p));
            if (Math.abs(video.currentTime - target) > 0.035) {
                video.currentTime = target;
            }
        }

        syncScrubVideo(video, time, active) {
            if (!active) {
                video.pause();
                return;
            }
            if (!Number.isFinite(video.duration) || video.readyState < 1 || video.seeking) return;
            const target = Math.max(0, Math.min(video.duration - 0.04, time));
            if (Math.abs(video.currentTime - target) > 0.035) {
                video.currentTime = target;
            }
        }

        getChromeOpacity(storyTime) {
            const hide = smooth(storyTime, PAGE_SEGMENT.enterStart, PAGE_SEGMENT.enterEnd);
            const show = smooth(storyTime, PAGE_SEGMENT.videoFadeStart, PAGE_SEGMENT.exitEnd);
            return Math.max(1 - hide, show);
        }

        revealText(el, t, a, b) {
            if (!el) return;
            const p = smooth(t, a, b);
            const steps = Number(el.dataset.steps || 1);
            const shown = revealStep(p, steps);
            el.style.clipPath = `inset(0 0 ${((1 - shown) * 100).toFixed(2)}% 0)`;
        }

        revealHorizontal(el, t, a, b) {
            if (!el) return;
            const shown = smooth(t, a, b);
            el.style.clipPath = `inset(0 ${((1 - shown) * 100).toFixed(2)}% 0 0)`;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.__fxRenderer = new FxRenderer();
    });
})();
