(function () {
    'use strict';

    // 与 docs/nodes.json 保持一致，便于和甲方核对四个硬停节点。
    const NODES = [
        {
            id: 'n01_identify',
            time: 8,
            step: '第一环节',
            title: '名瓷鉴定',
            desc: '博古架场景定格，识别眼前瓷器的年代与窑口。',
            page: 'check.html',
            fxImage: '/image/名瓷鉴定.webp',
            qrImage: '/image/扫码/二维码_名瓷鉴定.png',
            qrCodeImage: '/image/扫码/二维码码面_名瓷鉴定.png',
            tipImage: '/image/扫码/提示条_名瓷鉴定.png'
        },
        {
            id: 'n02_align',
            time: 67,
            step: '第二环节',
            title: '找碴对缝',
            desc: '案头碎瓷定格，将散落的碎片对齐拼回碗身。',
            page: 'align.html',
            fxImage: '/image/找碴对缝.webp',
            qrImage: '/image/扫码/二维码_找碴对缝.png',
            qrCodeImage: '/image/扫码/二维码码面_找碴对缝.png',
            tipImage: '/image/扫码/提示条_找碴对缝.png'
        },
        {
            id: 'n03_bind',
            time: 80,
            step: '第三环节',
            title: '绑扎定型',
            desc: '拼合后的碗定格，绕线绑扎，让碎片就此定型。',
            page: 'bind.html',
            fxImage: '/image/绑扎定型.webp',
            qrImage: '/image/扫码/二维码_绑扎定型.png',
            qrCodeImage: '/image/扫码/二维码码面_绑扎定型.png',
            tipImage: '/image/扫码/提示条_绑扎定型.png'
        },
        {
            id: 'n04_nail',
            time: 91,
            step: '第四环节',
            title: '打孔上钉',
            desc: '聚光特写定格，进入打孔与锔钉的最后一步。',
            page: 'nail.html',
            fxImage: '/image/打孔上钉.webp',
            qrImage: '/image/扫码/二维码_打孔上钉.png',
            qrCodeImage: '/image/扫码/二维码码面_打孔上钉.png',
            tipImage: '/image/扫码/提示条_打孔上钉.png'
        }
    ];

    // 鼠标滚轮推进速度：按体验反馈再放慢一点，滚动同样距离推进得更少。
    const WHEEL_SENSITIVITY = 0.0025;
    const MIN_WHEEL_STEP = 0.008;
    const PAGE_TRANSITION_SLOW_ZONES = [
        { start: 17.8, end: 20.9, scale: 0.34 },
        { start: 32.8, end: 39.6, scale: 0.26 },
        { start: 50.6, end: 56.7, scale: 0.24 },
        { start: 59.0, end: 61.1, scale: 0.55 },
    ];
    const SCRUB_EASE = 0.12;
    const SCRUB_STOP_EPSILON = 0.004;
    const COAST_DELAY = 120;
    const COAST_MS = 1500;
    const SEEK_MIN_STEP = 0.02;
    const WARMUP_THRESHOLD = 0.15;
    // 网页动效与故事视频使用独立阶段：前 7.15 秒只推进动效，结束后视频才从 0 秒开始。
    const INTRO_END = 7.15;
    const MEDIA_SOURCES = {
        promo: [
            '/audio/宣传视频.mp4?v=20261019-lfs-restore',
            // 宣传片未单独放入交付包时，用完整视频兜底，入口不会变成死链。
            '/root/完整视频.mp4',
        ],
        documentary: ['/audio/结尾纪录片视频.mp4?v=20261019-lfs-restore'],
    };

    // 节点动效：底条划入 → 游戏标题渐显渐隐 → 棕色卡片（二维码 + 继续）。
    // 全部在边框下层、视频上层，见 fx.css 的 #node-fx。
    const NODE_FX = {
        barInMs: 900,
        titleDelayMs: 250,
        titleInMs: 500,
        titleHoldMs: 1400,
        titleOutMs: 500,
        assetInMs: 620,
        tipDelayMs: 60,
        tipInMs: 900,
        qrDelayMs: 1000,
        qrInMs: 1500,
        qrBlinkEveryMs: 5000,
        flipDelayMs: 2600,
        exitMs: 900,
    };
    // 卡片下方文案：可扫码 / 前置未完成 / 本环节已完成
    const NODE_TIP = {
        ready: '扫码进入小游戏',
        locked: '请先完成前面的环节',
        done: '本环节已完成',
    };

    // 四个节点的标题图先预加载，避免出场那一下才下载导致闪一下。
    function preloadNodeFxImages() {
        NODES.forEach((node) => {
            if (!node.fxImage) return;
            const img = new Image();
            img.src = node.fxImage;
            [node.qrImage, node.tipImage].forEach((src) => {
                if (!src) return;
                const asset = new Image();
                asset.src = src;
            });
        });
        ['/image/扫码/二维码_未解锁.png', '/image/扫码/提示条_未解锁.png',
            '/image/扫码/提示条_已完成.png', '/image/扫码/翻页_未点亮.png',
            '/image/扫码/翻页_点亮.png', '/image/扫码/书页透明.webp',
            '/image/扫码/书页最后一帧.webp'].forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    }

    const State = {
        LOADING: 'loading',
        READY: 'ready',
        SCRUBBING: 'scrubbing',
        COASTING: 'coasting',
        PRESENTING: 'presenting',
        LOCKED: 'locked',
        ENDED: 'ended'
    };

    class VideoScrollController {
        constructor() {
            this.main = document.getElementById('main-video');
            this.proxy = document.getElementById('proxy-video');
            this.loadingOverlay = document.getElementById('loading-overlay');
            this.hint = document.getElementById('scroll-hint');
            this.nodeFx = document.getElementById('node-fx');
            this.nodeFxTitle = document.getElementById('node-fx-title');
            this.nodeFxCard = document.getElementById('node-fx-card');
            this.nodeFxBook = document.getElementById('node-fx-book');
            this.nodeFxQrArt = document.getElementById('node-fx-qr-art');
            this.nodeFxQrDecoration = this.nodeFxQrArt ? this.nodeFxQrArt.querySelector('.node-qr-decoration') : null;
            this.nodeFxQrCode = document.getElementById('node-fx-qr-code');
            this.nodeFxTipArt = document.getElementById('node-fx-tip-art');
            this.nodeFxFlip = document.getElementById('node-fx-flip');
            this.endOverlay = document.getElementById('end-overlay');
            this.documentaryBtn = document.getElementById('documentary-btn');
            this.replayBtn = document.getElementById('replay-btn');
            this.introGate = document.getElementById('intro-gate');
            this.mediaViewer = document.getElementById('media-viewer');
            this.mediaVideo = document.getElementById('media-video');
            this.mediaClose = document.getElementById('media-close');
            this.mediaContext = null;
            this.mediaSources = [];
            this.mediaSourceIndex = 0;
            this.fxToken = 0;
            this.fxTimers = [];

            // passed：本次会话里已经点过「继续」的节点，往回滚时不再重复拦截。
            // seen：本次会话里已经播放过节点动效；回退后再次进入时直接出示二维码。
            this.nodes = NODES.map((node) => ({ ...node, completed: false, passed: false, seen: false }));
            // 底部流程条图标 → 故事时间（秒）与对应游戏节点。
            this.processStages = {
                'icon-0': { time: 0, nodeId: null },
                'icon-1': { time: 8, nodeId: 'n01_identify' },
                'icon-2': { time: 21, nodeId: null },
                'icon-3': { time: 67, nodeId: 'n02_align' },
                'icon-4': { time: 80, nodeId: 'n03_bind' },
                'icon-5': { time: 91, nodeId: 'n04_nail' },
            };
            // 手机端上报的完成状态（/api/state），决定后续节点的小游戏是否解锁。
            this.serverState = {};
            this.duration = 0;
            this.state = State.LOADING;
            this.targetTime = 0;
            this.lastTime = 0;
            this.lastWheelAt = 0;
            this.coastDirection = 1;
            this.coastTimer = null;
            this.coastUntil = 0;
            this.lockedNode = null;
            this.touchStartY = null;
            this.mainReady = false;
            this.proxyReady = false;
            this.proxySwitching = false;
            this.proxySeekInFlight = false;
            this.pendingProxySeek = null;
            this.presenting = false;
            this.switchId = 0;
            this.introActive = true;
            this.introTime = 0;
            this.introTarget = 0;
            this.lanHost = null;
            this.lanPort = null;
            this.lanProtocol = null;
            this.qrDetectStarted = false;
            this.storyBgm = document.getElementById('story-bgm');
            this.storyBgmStarted = false;
            this.completionPollTimer = null;
            this.hasSeenIntroVideo = false;
            this.mediaPlaying = false;
            this.nodeAssetsReady = false;
            this.qrBlinkTimer = null;
            this.qrBlinkFadeTimer = null;
            if (typeof window.QR_STAGE_LAYOUT_APPLY === 'function') {
                window.QR_STAGE_LAYOUT_APPLY(document);
            }

            preloadNodeFxImages();
            this.fetchLanInfo();  // 取服务器局域网地址，保证二维码手机能进
            this.fetchCompletionState();   // 取已完成环节，决定节点解锁状态
            this.bindEvents();
            this.raf = requestAnimationFrame((now) => this.animate(now));
        }

        bindEvents() {
            this.main.addEventListener('loadedmetadata', () => {
                this.duration = Number.isFinite(this.main.duration) ? this.main.duration : 0;
                this.main.currentTime = 0;
                this.proxy.currentTime = 0;
                this.lastTime = 0;
            });

            this.main.addEventListener('canplay', () => {
                this.mainReady = true;
                this.tryStart();
            });

            this.proxy.addEventListener('canplay', () => {
                this.proxyReady = true;
                this.tryStart();
            });

            this.proxy.addEventListener('seeked', () => this.onProxySeeked());
            this.main.addEventListener('ended', () => this.handleEnd());

            window.addEventListener('wheel', (e) => {
                e.preventDefault();
                const multiplier = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 100 : 1;
                this.applyScrollDelta(e.deltaY * multiplier);
            }, { passive: false });

            document.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    this.touchStartY = e.touches[0].clientY;
                    if (this.state !== State.LOCKED) {
                        e.preventDefault();
                    }
                }
            }, { passive: false });

            document.addEventListener('touchmove', (e) => {
                if (e.touches.length !== 1 || this.touchStartY === null) return;
                const y = e.touches[0].clientY;
                const delta = this.touchStartY - y;
                this.touchStartY = y;
                if (this.state !== State.LOCKED) {
                    e.preventDefault();
                }
                // 触摸上滑 = 向前推进，与滚轮方向保持一致。
                this.applyScrollDelta(-delta * 1.5);
            }, { passive: false });

            document.addEventListener('touchend', () => {
                this.touchStartY = null;
            }, { passive: true });

            this.nodeFxFlip.addEventListener('click', () => this.continueFromNode());
            const processBar = document.getElementById('fx-process');
            if (processBar) {
                processBar.addEventListener('click', (e) => {
                    const icon = e.target.closest('.process-logo-icon');
                    if (!icon) return;
                    if (icon.style.opacity === '0') return;
                    const stage = this.processStages[icon.getAttribute('data-layout-key')];
                    if (!stage) return;
                    this.jumpToStage(stage);
                });
            }
            if (this.replayBtn) this.replayBtn.addEventListener('click', () => this.replay());
            this.introGate.addEventListener('click', () => this.playIntroVideo());
            this.documentaryBtn.addEventListener('click', () => this.playDocumentary());
            this.mediaClose.addEventListener('click', () => this.finishMediaPlayback());
            this.mediaVideo.addEventListener('ended', () => this.finishMediaPlayback());
            this.mediaVideo.addEventListener('error', () => this.handleMediaError());

            // 全流程背景音乐：浏览器要求有声播放必须先有用户手势，第一次滚轮/触摸/按键即可启动。
            const startStoryBgm = () => this.startStoryBgm();
            window.addEventListener('pointerdown', startStoryBgm);
            window.addEventListener('touchstart', startStoryBgm);
            window.addEventListener('wheel', startStoryBgm, { once: true });
            window.addEventListener('keydown', startStoryBgm, { once: true });
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    if (this.storyBgm && !this.storyBgm.paused) this.storyBgm.pause();
                } else if (this.storyBgmStarted) {
                    const p = this.storyBgm.play();
                    if (p && p.catch) p.catch(() => {});
                }
            });
        }

        startStoryBgm() {
            if (!this.storyBgm || this.storyBgmStarted) return;
            this.storyBgmStarted = true;
            this.storyBgm.volume = 0.5;
            const p = this.storyBgm.play();
            if (p && p.catch) {
                p.catch(() => {
                    this.storyBgmStarted = false;
                });
            }
        }

        async tryStart() {
            if (this.state !== State.LOADING || !this.mainReady || !this.proxyReady) return;
            this.state = State.READY;
            const id = ++this.switchId;
            await this.ensureFrame(this.main, 0);
            if (id !== this.switchId || this.state !== State.READY) return;
            this.loadingOverlay.classList.add('hidden');
            this.showVideo(this.main);
            this.syncTimelineExposure();
            this.showIntroGate();
        }

        showVideo(video) {
            const showMain = video === this.main;
            this.main.classList.toggle('active', showMain);
            this.proxy.classList.toggle('active', !showMain);
        }

        waitPainted() {
            return new Promise((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            });
        }

        ensureFrame(video, time) {
            return new Promise((resolve) => {
                const target = Math.max(0, Math.min(this.duration || time, time));
                const needSeek = Math.abs(video.currentTime - target) > 0.02 || video.seeking;

                const painted = () => {
                    if (typeof video.requestVideoFrameCallback === 'function') {
                        Promise.race([
                            new Promise((r) => video.requestVideoFrameCallback(() => r())),
                            this.waitPainted()
                        ]).then(resolve);
                    } else {
                        this.waitPainted().then(resolve);
                    }
                };

                if (!needSeek) {
                    this.waitPainted().then(resolve);
                    return;
                }

                const done = () => {
                    video.removeEventListener('seeked', done);
                    painted();
                };
                video.addEventListener('seeked', done);
                try {
                    video.currentTime = target;
                } catch (err) {
                    video.removeEventListener('seeked', done);
                    resolve();
                }
            });
        }

        applyScrollDelta(deltaY) {
            if (this.state === State.LOADING || this.state === State.ENDED) {
                return;
            }
            if (!this.hasSeenIntroVideo || this.mediaPlaying) return;
            if (!this.duration) return;

            // 向下滚 = 前进播放，向上滚 = 后退播放。
            const rawAmount = deltaY * WHEEL_SENSITIVITY;
            if (Math.abs(rawAmount) < MIN_WHEEL_STEP) return;

            // 节点锁定期间：向前滚动仍保持锁定；向上滚可以回拨，
            // 回拨后再往前滚动会重新出示二维码，便于重玩或第一次体验。
            if (this.state === State.LOCKED) {
                if (rawAmount < 0) {
                    const base = this.lockedNode ? this.lockedNode.time : this.lastTime;
                    this.lockedNode = null;
                    this.stopCompletionPoll();
                    this.stopNodeFx();
                    this.stopCoastPlayback();
                    this.coastDirection = -1;
                    this.lastTime = base;
                    this.targetTime = Math.max(0, base + rawAmount);
                    this.hint.classList.add('dimmed');
                    this.lastWheelAt = performance.now();
                    this.beginScrub(base);
                    clearTimeout(this.coastTimer);
                    this.coastTimer = setTimeout(() => this.startCoast(), COAST_DELAY);
                }
                return;
            }

            if (this.introActive) {
                this.stopCoastPlayback();
                this.introTarget = Math.max(0, Math.min(INTRO_END, this.introTarget + rawAmount));
                this.hint.classList.add('dimmed');
                this.lastWheelAt = performance.now();
                return;
            }

            const currentStory = this.state === State.COASTING
                ? this.proxy.currentTime
                : this.state === State.SCRUBBING
                    ? this.lastTime
                    : this.main.currentTime;
            const amount = rawAmount * this.getPageTransitionWheelScale(currentStory);
            if (amount < 0 && currentStory <= 0.001) {
                this.stopCoastPlayback();
                this.state = State.READY;
                this.introActive = true;
                this.introTime = INTRO_END;
                this.introTarget = Math.max(0, INTRO_END + amount);
                this.showVideo(this.main);
                this.syncTimelineExposure();
                return;
            }

            this.coastDirection = amount >= 0 ? 1 : -1;

            // 惯性播放中再次滚动：立刻停住播放，回到手动寻帧。
            if (this.state === State.COASTING) {
                this.stopCoastPlayback();
                // 以上一次惯性结束的时刻为新的起点，避免回跳。
                this.lastTime = this.proxy.currentTime;
                this.state = State.SCRUBBING;
            } else if (this.state !== State.SCRUBBING) {
                this.lastTime = this.main.currentTime;
                this.beginScrub(this.lastTime);
            }

            const base = this.state === State.SCRUBBING ? this.lastTime : this.main.currentTime;
            this.targetTime = Math.max(0, Math.min(this.duration, base + amount));
            this.hint.classList.add('dimmed');
            this.lastWheelAt = performance.now();

            clearTimeout(this.coastTimer);
            this.coastTimer = setTimeout(() => this.startCoast(), COAST_DELAY);

            // 单次大幅滚动直接越过节点时，立即精准定位并锁定。
            const node = this.findNodeToLock(base, this.targetTime);
            if (node) {
                this.lockNode(node);
            }
        }

        getPageTransitionWheelScale(storyTime) {
            for (const zone of PAGE_TRANSITION_SLOW_ZONES) {
                if (storyTime < zone.start || storyTime > zone.end) continue;
                const edgeDistance = Math.min(storyTime - zone.start, zone.end - storyTime);
                const blend = Math.max(0, Math.min(1, edgeDistance / 0.8));
                return 1 - (1 - zone.scale) * blend;
            }
            return 1;
        }

        async beginScrub(base) {
            this.presenting = false;
            this.switchId++;
            this.proxySwitching = true;
            this.state = State.SCRUBBING;
            this.lastWheelAt = performance.now();
            const id = this.switchId;

            await this.ensureFrame(this.proxy, base);
            if (id !== this.switchId || this.state !== State.SCRUBBING) return;
            this.proxySwitching = false;
            this.showVideo(this.proxy);
        }

        requestProxySeek(time) {
            if (this.proxySeekInFlight) {
                this.pendingProxySeek = time;
                return;
            }
            if (Math.abs(this.proxy.currentTime - time) < SEEK_MIN_STEP) return;
            this.proxySeekInFlight = true;
            this.proxy.currentTime = time;
        }

        onProxySeeked() {
            this.proxySeekInFlight = false;
            if (this.state === State.SCRUBBING && this.pendingProxySeek !== null) {
                const next = this.pendingProxySeek;
                this.pendingProxySeek = null;
                this.requestProxySeek(next);
            }
        }

        warmUpMain(time) {
            if (this.main.seeking) return;
            if (Math.abs(this.main.currentTime - time) < SEEK_MIN_STEP) return;
            this.main.currentTime = time;
        }

        syncProxyTo(time) {
            if (Math.abs(this.proxy.currentTime - time) < SEEK_MIN_STEP) return;
            this.proxy.currentTime = time;
        }

        getStoryTime() {
            if (this.state === State.SCRUBBING) return this.lastTime;
            if (this.state === State.COASTING) return this.proxy.currentTime;
            if (this.state === State.LOCKED) return this.lastTime;
            return this.main.currentTime;
        }

        syncTimelineExposure() {
            if (this.introActive) {
                window.__storyTime = 0;
                window.__timelineTime = this.introTime;
                return;
            }
            const story = this.getStoryTime();
            window.__storyTime = story;
            window.__timelineTime = INTRO_END + story;
        }

        // 底部流程条图标点击：跳到对应阶段；游戏节点在“动效开始前”定位（回退直接出二维码）。
        jumpToStage(stage) {
            if (this.state === State.LOADING || this.state === State.ENDED) return;
            if (!this.hasSeenIntroVideo || this.mediaPlaying) return;

            const current = this.getStoryTime();
            this.stopCoastPlayback();
            this.stopCompletionPoll();
            this.stopNodeFx();
            this.proxySeekInFlight = false;
            this.pendingProxySeek = null;
            this.presenting = false;
            this.introActive = false;
            this.introTime = INTRO_END;
            this.introTarget = INTRO_END;
            this.lockedNode = null;
            this.hint.classList.add('dimmed');
            this.lastWheelAt = performance.now();

            const time = Math.max(0, Math.min(this.duration, stage.time));

            if (stage.nodeId) {
                const node = this.nodes.find((n) => n.id === stage.nodeId);
                if (node) {
                    const backward = time <= current - 0.001;
                    this.state = State.READY;
                    this.lastTime = time;
                    this.targetTime = time;
                    this.lockNode(node, { skipFx: backward || !!node.seen });
                    return;
                }
            }

            this.state = State.READY;
            this.lastTime = time;
            this.targetTime = time;
            window.__storyTime = time;
            window.__timelineTime = INTRO_END + time;
            this.presentJumpedFrame(time);
        }

        async presentJumpedFrame(time) {
            const id = ++this.switchId;
            await this.ensureFrame(this.main, time);
            if (id !== this.switchId || this.state !== State.READY) return;
            this.showVideo(this.main);
            this.syncProxyTo(time);
            this.syncTimelineExposure();
        }

        finishIntro() {
            if (!this.introActive) return;
            this.introActive = false;
            this.introTime = INTRO_END;
            this.introTarget = INTRO_END;
            this.lastTime = 0;
            this.targetTime = 0;
            this.state = State.READY;
            this.showVideo(this.main);
            this.syncProxyTo(0);
            this.syncTimelineExposure();
        }

        startCoast() {
            if (this.state !== State.SCRUBBING) return;
            this.coastTimer = null;

            this.main.pause();
            this.proxy.pause();

            this.state = State.COASTING;
            this.coastUntil = performance.now() + COAST_MS;
        }

        stopCoastPlayback() {
            this.main.pause();
            this.proxy.pause();
            this.proxy.playbackRate = 1;
            this.main.playbackRate = 1;
        }

        showIntroGate() {
            if (!this.introGate || this.hasSeenIntroVideo) return;
            this.introGate.classList.remove('hidden');
            this.hint.classList.add('dimmed');
        }

        hideIntroGate() {
            if (!this.introGate) return;
            this.introGate.classList.add('hidden');
        }

        playIntroVideo() {
            if (this.mediaPlaying || !this.introGate) return;
            this.hasSeenIntroVideo = true;
            this.hideIntroGate();
            this.hint.classList.add('dimmed');
            this.openMediaPlayback('promo');
        }

        playDocumentary() {
            if (this.mediaPlaying) return;
            this.openMediaPlayback('documentary');
        }

        openMediaPlayback(context) {
            if (!this.mediaViewer || !this.mediaVideo) return;
            this.mediaPlaying = true;
            this.mediaContext = context;
            this.mediaSources = (MEDIA_SOURCES[context] || []).slice();
            this.mediaSourceIndex = 0;
            this.stopCoastPlayback();
            this.stopCompletionPoll();
            if (this.storyBgm && !this.storyBgm.paused) this.storyBgm.pause();
            if (context === 'documentary') this.endOverlay.classList.add('hidden');

            document.querySelector('.fx-root').classList.add('cinema-mode');
            this.mediaViewer.classList.add('hidden');
            this.mediaViewer.setAttribute('aria-hidden', 'true');
            this.mediaVideo.controls = true;
            this.loadMediaSource();

            // 先让书页边框淡出，再让视频覆盖整个视口。
            window.setTimeout(() => {
                if (!this.mediaPlaying) return;
                this.mediaViewer.classList.remove('hidden');
                this.mediaViewer.setAttribute('aria-hidden', 'false');
                this.tryPlayMedia();
            }, context === 'promo' ? 820 : 620);
        }

        loadMediaSource() {
            const src = this.mediaSources[this.mediaSourceIndex];
            if (!src) {
                this.finishMediaPlayback();
                return;
            }
            this.mediaVideo.src = src;
            this.mediaVideo.load();
        }

        tryPlayMedia() {
            if (!this.mediaVideo) return;
            const playAttempt = this.mediaVideo.play();
            if (!playAttempt || !playAttempt.catch) return;
            playAttempt.catch(() => {
                if (!this.mediaPlaying) return;
                this.mediaVideo.muted = true;
                this.mediaVideo.play().catch(() => this.finishMediaPlayback());
            });
        }

        handleMediaError() {
            if (!this.mediaPlaying) return;
            this.mediaSourceIndex += 1;
            if (this.mediaSourceIndex < this.mediaSources.length) {
                this.loadMediaSource();
                this.tryPlayMedia();
                return;
            }
            console.warn('视频素材不可用：', this.mediaSources.join(', '));
            this.finishMediaPlayback();
        }

        finishMediaPlayback() {
            if (!this.mediaPlaying) return;
            const context = this.mediaContext;
            this.mediaPlaying = false;
            this.mediaContext = null;
            this.mediaVideo.pause();
            this.mediaVideo.removeAttribute('src');
            this.mediaVideo.load();
            this.mediaViewer.classList.add('hidden');
            this.mediaViewer.setAttribute('aria-hidden', 'true');
            document.querySelector('.fx-root').classList.remove('cinema-mode');

            window.setTimeout(() => {
                if (context === 'documentary') {
                    this.endOverlay.classList.remove('hidden');
                } else if (context === 'promo') {
                    this.hint.classList.remove('dimmed');
                    if (this.storyBgmStarted && this.storyBgm) {
                        const p = this.storyBgm.play();
                        if (p && p.catch) p.catch(() => {});
                    }
                }
            }, 700);
        }

        async finishCoast() {
            if (this.state !== State.COASTING) return;
            this.stopCoastPlayback();
            this.state = State.PRESENTING;
            const id = ++this.switchId;
            const time = this.proxy.currentTime;

            // main 已通过预热接近该时间点，只需最后一次精确定位即可无缝切回。
            await this.ensureFrame(this.main, time);
            if (id !== this.switchId || this.state !== State.PRESENTING) return;
            this.showVideo(this.main);
            this.state = State.READY;
            this.lastTime = this.main.currentTime;
            this.targetTime = this.lastTime;
            this.syncProxyTo(this.lastTime);
            this.syncTimelineExposure();
        }

        findNodeToLock(from, to) {
            if (to <= from) return null;
            // 每次向前跨过节点都会出示二维码：首次播放完整动效，回拨后再进入则直接出示二维码。
            // from 处留一点余量，避免刚点完“继续”因播放时间的细微抖动又把同一个节点锁住。
            const candidates = this.nodes
                .filter((node) => node.time > from + 0.05 && node.time <= to + 0.001)
                .sort((a, b) => a.time - b.time);
            return candidates.length ? candidates[0] : null;
        }

        lockNode(node, opts) {
            this.stopCoastPlayback();
            this.proxySeekInFlight = false;
            this.pendingProxySeek = null;
            this.presenting = false;
            this.lastTime = node.time;
            this.targetTime = node.time;
            this.lockedNode = node;
            this.state = State.LOCKED;
            this.syncTimelineExposure();

            const skipFx = !!(opts && opts.skipFx) || !!node.seen;
            this.startNodeFx(node, skipFx);
            node.seen = true;
            this.presentLockedFrame(node.time);
            this.startCompletionPoll(node);
        }

        async presentLockedFrame(time) {
            const id = ++this.switchId;
            await this.ensureFrame(this.main, time);
            if (id !== this.switchId || this.state !== State.LOCKED) return;
            this.showVideo(this.main);
            this.syncTimelineExposure();
        }

        unlockNode() {
            this.stopCompletionPoll();
            // “继续”只表示往后推进剧情，不等于这个环节已经玩过；
            // 完成与否由手机端上报（/api/complete）决定。
            // 但标记 passed：往回滚时不再被同一个节点拦住。
            if (this.lockedNode) this.lockedNode.passed = true;
            this.lockedNode = null;
            this.stopNodeFx();
            this.switchId++;
            this.state = State.READY;
            this.lastTime = this.main.currentTime;
            this.targetTime = this.lastTime;
            this.syncProxyTo(this.lastTime);
            this.syncTimelineExposure();
        }

        startCompletionPoll(node) {
            this.stopCompletionPoll();
            if (!node || !node.id) return;

            const poll = async () => {
                if (this.lockedNode !== node) return;
                await this.fetchCompletionState();
                if (this.lockedNode !== node) return;
                // 前置环节完成后，当前节点的二维码要在原地自动解锁。
                this.renderNodeCard();
                this.completionPollTimer = setTimeout(poll, 1200);
            };
            poll();
        }

        /* ---------------- 完成状态：决定节点是否解锁 ---------------- */
        isNodeCompleted(node) {
            return !!(node && (node.completed || this.serverState[node.id]));
        }

        // 只有前面所有环节都做完，当前节点的小游戏才解锁。
        isNodeUnlocked(node) {
            const index = this.nodes.indexOf(node);
            if (index <= 0) return true;
            for (let i = 0; i < index; i++) {
                if (!this.isNodeCompleted(this.nodes[i])) return false;
            }
            return true;
        }

        async fetchCompletionState() {
            try {
                const res = await fetch('/api/state', { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                if (!data || !data.completed) return;
                this.serverState = data.completed;
                this.nodes.forEach((node) => { node.completed = !!this.serverState[node.id]; });
            } catch (err) {
                // 旧服务进程没有该接口时忽略，节点仍可通过“继续”往后推进。
            }
        }

        stopCompletionPoll() {
            if (this.completionPollTimer) {
                clearTimeout(this.completionPollTimer);
                this.completionPollTimer = null;
            }
        }

        /* ---------------- 节点动效：底条 → 游戏标题 → 棕色卡片（二维码 + 继续） ---------------- */
        clearFxTimers() {
            this.fxTimers.forEach((id) => clearTimeout(id));
            this.fxTimers = [];
        }

        later(ms, fn) {
            const token = this.fxToken;
            const id = setTimeout(() => {
                if (token !== this.fxToken) return;
                fn();
            }, ms);
            this.fxTimers.push(id);
            return id;
        }

        startNodeFx(node, skipFx) {
            this.stopNodeFx();
            const fx = this.nodeFx;
            if (!fx) return;
            const token = ++this.fxToken;
            this.nodeAssetsReady = false;

            fx.classList.remove('in', 'title', 'book', 'assets', 'tip', 'qr', 'flip-visible', 'flip-ready', 'exiting');
            if (this.nodeFxFlip) this.nodeFxFlip.classList.remove('is-visible', 'is-ready', 'is-exiting');
            fx.classList.add('active');
            if (this.nodeFxTitle) this.nodeFxTitle.src = node.fxImage || '';
            if (this.nodeFxCard) this.nodeFxCard.classList.remove('locked', 'done');
            if (this.nodeFxBook) {
                this.nodeFxBook.src = '/image/扫码/书页最后一帧.webp';
            }

            // 回退后再次进入：不重播底条/标题/书页翻页动效，直接定格装饰书并弹出二维码。
            if (skipFx) {
                fx.classList.add('in', 'book');
                this.showNodeAssets();
                return;
            }

            // 回退后再次进入：不重播底条/标题/书页翻页动效，直接定格装饰书并弹出二维码。
            if (skipFx) {
                fx.classList.add('in', 'book');
                this.showNodeAssets();
                return;
            }

            // 1. 底条从左往右划入
            requestAnimationFrame(() => {
                if (token !== this.fxToken) return;
                fx.classList.add('in');
            });

            const t = NODE_FX;
            // 各段依次串联：后一段从“前一段真正开始”起算，
            // 这样即使视频 seek 卡住主线程，也不会把标题/卡片的显示窗口挤没。
            this.later(t.barInMs, () => {
                this.later(t.titleDelayMs, () => {
                    fx.classList.add('title');                             // 2. 游戏标题渐显
                    this.later(t.titleInMs + t.titleHoldMs, () => {
                        fx.classList.remove('title');                      // 3. 游戏标题渐隐
                        // 4. 标题消失后播放书页动效
                        this.later(t.titleOutMs, () => this.playNodeBook());
                    });
                });
            });
        }

        playNodeBook() {
            if (!this.nodeFxBook || this.state !== State.LOCKED) return;
            this.nodeFx.classList.add('book');
            this.nodeFxBook.src = '/image/扫码/书页透明.webp?play=' + Date.now();
            // 透明 WebP 共 74 帧，20fps，动画结束后切到透明最后一帧定格。
            this.later(3700, () => this.showNodeAssets());
        }

        showNodeAssets() {
            if (!this.nodeFx || this.state !== State.LOCKED || this.nodeAssetsReady) return;
            this.nodeAssetsReady = true;
            if (this.nodeFxBook) this.nodeFxBook.src = '/image/扫码/书页最后一帧.webp';
            this.nodeFx.classList.add('assets');
            this.renderNodeCard();
            // 1. 装饰书定格后：先让正前方的游戏提示条由透明慢慢变清晰
            this.later(NODE_FX.tipDelayMs, () => {
                if (this.state !== State.LOCKED) return;
                this.nodeFx.classList.add('tip');
            });
            // 2. 随后二维码缓缓渐显，并在渐显的同时开始每 5 秒消失一次、再重现
            this.later(NODE_FX.qrDelayMs, () => {
                if (this.state !== State.LOCKED) return;
                this.nodeFx.classList.add('qr');
                this.startQrBlink();
            });
            // 3. 提示条出现后翻页角标再亮起，保证剧情能继续推进
            this.later(NODE_FX.flipDelayMs, () => {
                if (this.state === State.LOCKED) this.nodeFxFlip.classList.add('is-visible');
            });
        }

        startQrBlink() {
            this.stopQrBlink();
            const code = this.nodeFxQrCode;
            if (!code) return;
            const fadeOutMs = 420;
            const hiddenHoldMs = 400;
            this.qrBlinkTimer = setInterval(() => {
                if (!code || code.style.display === 'none') return;
                code.style.opacity = '0';
                this.qrBlinkFadeTimer = setTimeout(() => {
                    if (code) code.style.opacity = '1';
                }, fadeOutMs + hiddenHoldMs);
            }, NODE_FX.qrBlinkEveryMs);
        }

        stopQrBlink() {
            if (this.qrBlinkTimer) {
                clearInterval(this.qrBlinkTimer);
                this.qrBlinkTimer = null;
            }
            if (this.qrBlinkFadeTimer) {
                clearTimeout(this.qrBlinkFadeTimer);
                this.qrBlinkFadeTimer = null;
            }
            if (this.nodeFxQrCode) this.nodeFxQrCode.style.opacity = '';
        }

        continueFromNode() {
            if (this.state !== State.LOCKED || !this.lockedNode) return;
            if (this.nodeFxFlip.classList.contains('is-exiting')) return;
            this.nodeFx.classList.add('exiting');
            this.nodeFxFlip.classList.add('is-exiting');
            this.later(NODE_FX.exitMs, () => this.unlockNode());
        }

        stopNodeFx() {
            this.fxToken++;
            this.clearFxTimers();
            this.stopQrBlink();
            this.nodeAssetsReady = false;
            if (this.nodeFxBook) {
                this.nodeFxBook.src = '/image/扫码/书页最后一帧.webp';
            }
            if (this.nodeFx) {
                this.nodeFx.classList.remove('active', 'in', 'title', 'book', 'assets', 'tip', 'qr', 'flip-visible', 'flip-ready', 'exiting');
            }
            if (this.nodeFxFlip) this.nodeFxFlip.classList.remove('is-visible', 'is-ready', 'is-exiting');
            if (this.nodeFxCard) this.nodeFxCard.classList.remove('locked', 'done');
        }

        /* 出示棕色卡片：二维码 + 继续；前置环节没做完时二维码保持锁定态。 */
        showNodeCard() {
            const node = this.lockedNode;
            if (!node) return;
            if (this.nodeFx) this.nodeFx.classList.add('card');
            this.renderNodeCard();
        }

        renderNodeCard() {
            const node = this.lockedNode;
            const card = this.nodeFxCard;
            if (!node || !card) return;

            const unlocked = this.isNodeUnlocked(node);
            const done = this.isNodeCompleted(node);
            card.classList.toggle('locked', !unlocked);
            card.classList.toggle('done', done);
            if (this.nodeFxQrDecoration) {
                this.nodeFxQrDecoration.src = unlocked ? node.qrImage : '/image/扫码/二维码_未解锁.png';
            }
            if (this.nodeFxQrCode) {
                this.nodeFxQrCode.src = node.qrCodeImage || '';
                this.nodeFxQrCode.style.display = unlocked ? 'block' : 'none';
            }
            if (this.nodeFxTipArt) {
                this.nodeFxTipArt.src = !unlocked
                    ? '/image/扫码/提示条_未解锁.png'
                    : (done ? '/image/扫码/提示条_已完成.png' : node.tipImage);
            }
            this.nodeFxFlip.classList.toggle('is-ready', unlocked && done);
            this.nodeFxFlip.setAttribute('aria-label', done ? '已完成，翻页继续' : '翻页继续');
        }

        // 未解锁：二维码位置画一块“未解锁”占位，避免出现空白方块。
        drawLockedQr() {
            const canvas = this.nodeFxQrCode;
            if (!canvas) return;
            const size = canvas.width;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#241d15';
            ctx.fillRect(0, 0, size, size);
            ctx.strokeStyle = 'rgba(201, 164, 92, 0.55)';
            ctx.lineWidth = Math.max(2, size * 0.012);
            ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);
            ctx.fillStyle = 'rgba(233, 220, 192, 0.78)';
            ctx.font = Math.round(size * 0.14) + 'px "Noto Serif SC", "Songti SC", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('未解锁', size / 2, size / 2);
        }

        renderQr(node) {
            const canvas = this.nodeFxQrCode;
            this.qrNode = node;
            if (!canvas) return;
            if (typeof QRCode === 'undefined' || typeof QRErrorCorrectLevel === 'undefined') {
                const size = canvas.width;
                const margin = Math.round(size * 0.09);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);
                ctx.fillStyle = '#13110d';
                ctx.font = '12px sans-serif';
                ctx.fillText('二维码组件缺失', margin, size / 2);
                return;
            }

            this.drawQr(this.getArUrl(node));
            if (!this.lanHost && !this.qrDetectStarted) {
                this.qrDetectStarted = true;
                // 首选服务器返回的局域网地址；拿不到再退回 WebRTC 探测。
                this.fetchLanInfo().then((host) => {
                    if (host) return;
                    return this.detectLanHost().then((h) => {
                        if (!h) {
                            this.qrDetectStarted = false;
                            return;
                        }
                        this.lanHost = h;
                        const currentNode = this.lockedNode || this.qrNode;
                        if (currentNode) this.drawQr(this.getArUrl(currentNode));
                    });
                });
            }
        }

        drawQr(url) {
            const canvas = this.nodeFxQrCode;
            if (!canvas) return;
            const size = canvas.width;
            const margin = Math.round(size * 0.09);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            const qr = new QRCode(0, QRErrorCorrectLevel.M);
            qr.addData(url);
            qr.make();

            const count = qr.getModuleCount();
            const cell = (size - margin * 2) / count;
            ctx.fillStyle = '#13110d';
            for (let row = 0; row < count; row++) {
                for (let col = 0; col < count; col++) {
                    if (qr.isDark(row, col)) {
                        const x = margin + col * cell;
                        const y = margin + row * cell;
                        ctx.fillRect(x, y, Math.ceil(cell), Math.ceil(cell));
                    }
                }
            }
        }

        // 服务器 /api/info 里的局域网地址（比 WebRTC 可靠：Chrome 会隐藏本机 IP）
        fetchLanInfo() {
            return fetch('/api/info', { cache: 'no-store' })
                .then((res) => (res.ok ? res.json() : null))
                .then((info) => {
                    if (!info || !Array.isArray(info.lanHosts) || !info.lanHosts.length) return null;
                    this.lanHost = info.host || info.lanHosts[0];
                    this.lanPort = info.port || null;
                    this.lanProtocol = info.protocol || 'http:';
                    // 二维码已经显示出来就按局域网地址重画
                    const node = this.lockedNode || this.qrNode;
                    if (node && this.nodeFx && this.nodeFx.classList.contains('assets')) {
                        this.drawQr(this.getArUrl(node));
                    }
                    return this.lanHost;
                })
                .catch(() => null);
        }

        isLocalQrHost() {
            return /^(localhost|127(?:\.\d{1,3}){3}|::1)$/i.test(location.hostname);
        }

        detectLanHost() {
            return new Promise((resolve) => {
                let found = null;
                try {
                    const pc = new RTCPeerConnection({ iceServers: [] });
                    pc.createDataChannel('');
                    pc.onicecandidate = (event) => {
                        if (!event.candidate) {
                            try { pc.close(); } catch (err) { /* ignore */ }
                            resolve(found);
                            return;
                        }
                        const match = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/.exec(event.candidate.candidate || '');
                        if (!match || match[1] === '127.0.0.1' || /^0\./.test(match[1])) return;
                        const ip = match[1];
                        const isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip);
                        if (isPrivate || !found) found = ip;
                    };
                    pc.createOffer()
                        .then((offer) => pc.setLocalDescription(offer))
                        .catch(() => resolve(null));
                    setTimeout(() => {
                        try { pc.close(); } catch (err) { /* ignore */ }
                        resolve(found);
                    }, 2000);
                } catch (err) {
                    resolve(null);
                }
            });
        }

        getArUrl(node) {
            // 有服务器给的局域网地址就用它（localhost 手机扫不进来）
            if (this.lanHost) {
                const proto = this.lanProtocol || 'http:';
                const port = this.lanPort && this.lanPort !== 80 && this.lanPort !== 443 ? ':' + this.lanPort : '';
                return `${proto}//${this.lanHost}${port}/ar.html?node=${node.id}`;
            }
            const isHttp = location.protocol === 'http:' || location.protocol === 'https:';
            const origin = isHttp ? location.origin : 'https://example.com';
            const base = origin.replace(
                /\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])/i,
                `//${location.hostname}`
            );
            return `${base}/ar.html?node=${node.id}`;
        }

        async handleEnd() {
            if (this.state === State.ENDED) return;
            this.stopCoastPlayback();
            this.stopCompletionPoll();
            this.proxySeekInFlight = false;
            this.pendingProxySeek = null;
            this.presenting = false;
            this.state = State.ENDED;
            const id = ++this.switchId;

            await this.ensureFrame(this.main, this.duration);
            if (id !== this.switchId || this.state !== State.ENDED) return;
            this.showVideo(this.main);
            this.syncTimelineExposure();
            const fxRoot = document.querySelector('.fx-root');
            if (fxRoot) fxRoot.classList.add('ending');
            this.endOverlay.classList.remove('hidden');
        }

        async replay() {
            this.switchId++;
            this.stopCoastPlayback();
            this.stopCompletionPoll();
            try {
                fetch('/api/reset', { method: 'POST' }).catch(() => {});
            } catch (err) {
                /* 忽略旧服务进程不支持的接口 */
            }
            this.proxySeekInFlight = false;
            this.pendingProxySeek = null;
            this.presenting = false;
            this.lastTime = 0;
            this.targetTime = 0;
            this.state = State.READY;
            this.lockedNode = null;
            this.serverState = {};
            this.nodes.forEach((node) => {
                node.completed = false;
                node.passed = false;
                node.seen = false;
            });
            this.stopNodeFx();
            const fxRoot = document.querySelector('.fx-root');
            if (fxRoot) fxRoot.classList.remove('ending');
            this.endOverlay.classList.add('hidden');
            this.hideIntroGate();
            this.hint.classList.add('dimmed');
            this.proxy.currentTime = 0;
            this.introActive = true;
            this.introTime = 0;
            this.introTarget = 0;
            window.__storyTime = 0;
            window.__timelineTime = 0;
            this.hasSeenIntroVideo = false;

            const id = this.switchId;
            await this.ensureFrame(this.main, 0);
            if (id !== this.switchId || this.state !== State.READY) return;
            this.showVideo(this.main);
            this.syncTimelineExposure();
            this.showIntroGate();
        }

        animate(now) {
            this.raf = requestAnimationFrame((t) => this.animate(t));

            if (this.introActive) {
                const diff = this.introTarget - this.introTime;
                if (Math.abs(diff) <= SCRUB_STOP_EPSILON) {
                    this.introTime = this.introTarget;
                } else {
                    this.introTime += diff * SCRUB_EASE;
                }
                this.syncTimelineExposure();
                if (this.introTime >= INTRO_END - 0.0001) {
                    this.finishIntro();
                }
                return;
            }

            if (this.state === State.SCRUBBING) {
                if (this.proxySwitching) return;

                const current = this.lastTime;
                const diff = this.targetTime - current;
                let next;

                if (Math.abs(diff) <= SCRUB_STOP_EPSILON) {
                    next = this.targetTime;
                } else {
                    next = current + diff * SCRUB_EASE;
                }

                const node = this.findNodeToLock(current, next);
                if (node) {
                    this.lockNode(node);
                    return;
                }

                this.lastTime = next;
                this.syncTimelineExposure();

                if (next >= this.duration - 0.05) {
                    this.handleEnd();
                    return;
                }

                this.requestProxySeek(next);

                if (Math.abs(diff) < WARMUP_THRESHOLD) {
                    this.warmUpMain(next);
                }
                return;
            }

            if (this.state === State.COASTING) {
                const current = this.proxy.currentTime;
                const diff = this.targetTime - current;
                let next;
                if (Math.abs(diff) <= SCRUB_STOP_EPSILON) {
                    next = this.targetTime;
                } else {
                    next = current + diff * SCRUB_EASE;
                }
                next = Math.max(0, Math.min(this.duration, next));

                if (this.coastDirection > 0) {
                    const node = this.findNodeToLock(current, next);
                    if (node) {
                        this.proxy.currentTime = node.time;
                        this.lockNode(node);
                        return;
                    }
                    if (next >= this.duration - 0.05) {
                        this.proxy.currentTime = this.duration;
                        this.handleEnd();
                        return;
                    }
                } else if (next <= 0) {
                    this.proxy.currentTime = 0;
                    this.finishCoast();
                    return;
                }

                this.proxy.currentTime = next;
                this.warmUpMain(next);
                this.syncTimelineExposure();

                if (Math.abs(this.targetTime - next) <= SCRUB_STOP_EPSILON || now >= this.coastUntil) {
                    this.finishCoast();
                }
                return;
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.__videoScrollController = new VideoScrollController();
    });
})();
