/* ============================================================
   小游戏通用预加载器
   - 立即挂载加载页，阻止玩家在素材就绪前误触
   - 自动从当前页面 DOM、内联脚本、外部游戏脚本与音频对象
     汇总素材清单
   - 用 fetch(cache: force-cache) 把图片/音频/视频写入移动端
     浏览器缓存，并同步推进“提亮加载条”
   ============================================================ */
(function () {
    'use strict';

    // 允许文件名中包含空格（如 Frame 153.webp、提示——移至操作台 .png）
    const ASSET_PATTERN = /(?:\/image\/|\/audio\/)[^'"<>\r\n]+?\.(?:png|jpe?g|webp|mp4|mov|webm|mp3|wav|ogg|m4a)/gi;
    const VIDEO_EXT = new Set(['mp4', 'mov', 'webm']);
    const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'm4a']);
    const WEIGHTS = { image: 1, audio: 2.5, video: 12 };
    const ORDER = { image: 0, audio: 1, video: 2 };
    const MAX_CONCURRENCY = 5;
    const ITEM_TIMEOUT_MS = 45000;
    const TOTAL_TIMEOUT_MS = 120000;
    const MIN_SHOW_MS = 1300;

    const state = {
        mounted: false,
        started: false,
        done: false,
        expired: false,
        failed: 0,
        options: null,
        overlay: null,
        bar: null,
        items: [],
        totalWeight: 0,
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'game-loading';
        overlay.className = 'game-loading';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-label', '正在加载游戏内容');
        overlay.innerHTML = [
            '<div class="game-loading-stage">',
            '<video class="game-loading-media"',
            ' src="/image/补充/加载循环动画.mp4"',
            ' poster="/image/补充/加载背景.jpg"',
            ' autoplay muted loop playsinline preload="auto"></video>',
            '<div class="game-loading-dim"></div>',
            '<img class="game-loading-glow" src="/image/补充/外围亮光.png" alt="">',
            '<div class="game-loading-ui">',
            '  <img class="game-loading-label" src="/image/补充/正在加载中.png" alt="正在加载中">',
            '  <div class="game-loading-bar" role="progressbar" aria-label="游戏素材加载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">',
            '    <img class="game-loading-bar-base" src="/image/补充/底部加载条.png" alt="">',
            '    <img class="game-loading-bar-fill" src="/image/补充/提亮加载条.png" alt="">',
            '  </div>',
            '</div>',
            '</div>',
        ].join('');

        if (document.body) {
            document.body.insertBefore(overlay, document.body.firstChild);
        } else {
            document.documentElement.appendChild(overlay);
        }

        state.overlay = overlay;
        state.bar = overlay.querySelector('.game-loading-bar');
        window.__gameLoading = true;
    }

    function assetInfo(raw, bustVersion) {
        let value = String(raw || '').trim();
        if (!value) return null;
        // 跳过代码中的模板变量路径（例如 高亮${p.id}.webp）
        if (value.indexOf('${') >= 0) return null;
        if (bustVersion && value.startsWith('/image/')) {
            value += (value.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(bustVersion);
        }
        try {
            const url = new URL(value, location.href);
            if (url.origin !== location.origin) return null;
            if (!/^\/(?:image|audio)\//.test(url.pathname)) return null;
            const ext = (url.pathname.split('.').pop() || '').toLowerCase();
            const kind = VIDEO_EXT.has(ext) ? 'video' : AUDIO_EXT.has(ext) ? 'audio' : 'image';
            return { url: url.href, kind, weight: WEIGHTS[kind], fraction: 0, done: false, ok: false };
        } catch (err) {
            return null;
        }
    }

    function addAsset(map, raw, bustVersion) {
        const info = assetInfo(raw, bustVersion);
        if (!info) return;
        if (!map.has(info.url)) map.set(info.url, info);
    }

    function addAudioObject(map, audio) {
        if (!audio || !audio.src) return;
        addAsset(map, audio.src);
    }

    function addAudioApi(map, name) {
        const api = name ? window[name] : null;
        if (!api) return;
        addAudioObject(map, api.bgm);
        addAudioObject(map, api.clickSfx);
        addAudioObject(map, api.audio);
        if (api.sfx && typeof api.sfx === 'object') {
            Object.keys(api.sfx).forEach((key) => addAudioObject(map, api.sfx[key]));
        }
    }

    function scanText(map, text, bustVersion) {
        if (!text) return;
        const found = text.match(ASSET_PATTERN) || [];
        found.forEach((url) => addAsset(map, url, bustVersion));
    }

    async function collectAssets() {
        const map = new Map();
        const options = state.options || {};

        // 1. 当前 DOM 中的图片、视频、封面与音源
        document.querySelectorAll('img[src], video[src], video[poster], source[src], audio[src]').forEach((el) => {
            if (el.closest && el.closest('#game-loading')) return;
            const tag = el.tagName;
            if (tag === 'VIDEO') {
                addAsset(map, el.getAttribute('src'));
                addAsset(map, el.getAttribute('poster'));
            } else {
                addAsset(map, el.getAttribute('src'));
            }
        });

        // 2. 已经创建的音频对象（含各游戏模块里的全部音效）
        ['IntroAudio', 'GameBgm', 'SettleAudio', options.audioApi].forEach((name) => addAudioApi(map, name));

        // 3. 名瓷鉴定 / 找碴对缝：资源清单写在内联脚本里
        if (options.inlineScripts) {
            document.querySelectorAll('script:not([src]), style').forEach((el) => {
                if (el.closest && el.closest('#game-loading')) return;
                scanText(map, el.textContent || '');
            });
        }

        // 4. 绑扎定型 / 打孔上钉：资源清单写在外部脚本与样式中
        const assetVersion = window.GAME_ASSET_VERSION || '';
        for (const source of options.sources || []) {
            const cfg = typeof source === 'string' ? { url: source } : source;
            try {
                const res = await fetch(cfg.url, { cache: 'force-cache' });
                if (!res.ok) continue;
                scanText(map, await res.text(), cfg.bust ? assetVersion : '');
            } catch (err) {
                /* 单个清单文件读取失败不影响其他素材 */
            }
        }

        // 5. 代码里拼出来的动态资源，由页面显式补充
        const extraVersion = options.extraBust ? assetVersion : '';
        (options.extra || []).forEach((url) => addAsset(map, url, extraVersion));

        return Array.from(map.values()).sort((a, b) => {
            return ORDER[a.kind] - ORDER[b.kind] || a.url.localeCompare(b.url);
        });
    }

    function paintProgress() {
        if (!state.bar) return;
        const loaded = state.items.reduce((sum, item) => sum + item.weight * (item.fraction || 0), 0);
        const percent = state.totalWeight > 0 ? Math.min(100, (loaded / state.totalWeight) * 100) : 100;
        state.bar.style.setProperty('--load-progress', percent.toFixed(2) + '%');
        state.bar.setAttribute('aria-valuenow', String(Math.round(percent)));
    }

    async function loadItem(item) {
        if (item.done) return;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ITEM_TIMEOUT_MS);
        try {
            const res = await fetch(item.url, { cache: 'force-cache', signal: controller.signal });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const total = Number(res.headers.get('content-length')) || 0;
            let loaded = 0;
            let imageBlob = null;

            if (res.body && typeof res.body.getReader === 'function') {
                const reader = res.body.getReader();
                const chunks = item.kind === 'image' ? [] : null;
                for (;;) {
                    const chunk = await reader.read();
                    if (chunk.done) break;
                    loaded += chunk.value ? chunk.value.length : 0;
                    if (chunks && chunk.value) chunks.push(chunk.value);
                    if (total > 0) {
                        item.fraction = Math.min(0.96, loaded / total);
                    } else {
                        item.fraction = Math.min(0.9, (item.fraction || 0) + 0.04);
                    }
                    paintProgress();
                }
                if (chunks && chunks.length) imageBlob = new Blob(chunks);
            } else {
                const blob = await res.blob();
                if (item.kind === 'image') imageBlob = blob;
                item.fraction = 0.96;
                paintProgress();
            }

            if (imageBlob && typeof createImageBitmap === 'function') {
                try {
                    const bitmap = await createImageBitmap(imageBlob);
                    if (bitmap && typeof bitmap.close === 'function') bitmap.close();
                } catch (err) {
                    /* 部分浏览器的动画 WebP 不支持 createImageBitmap，忽略 */
                }
            }

            item.fraction = 1;
            item.ok = true;
        } catch (err) {
            item.fraction = 1;
            item.ok = false;
            state.failed += 1;
            if (!state.expired) {
                console.warn('[game-preload] 素材未完成：', item.url, err && err.message ? err.message : err);
            }
        } finally {
            clearTimeout(timer);
            item.done = true;
            paintProgress();
        }
    }

    async function preloadAll(items) {
        let cursor = 0;
        const worker = async () => {
            for (;;) {
                if (state.expired) return;
                const index = cursor++;
                if (index >= items.length) return;
                await loadItem(items[index]);
            }
        };
        const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, items.length) }, worker);
        await Promise.all(workers);
    }

    function finish() {
        if (state.done) return;
        state.done = true;
        paintProgress();
        if (state.bar) {
            state.bar.style.setProperty('--load-progress', '100%');
            state.bar.setAttribute('aria-valuenow', '100');
        }
        if (state.overlay) state.overlay.classList.add('done');
        window.__gameLoading = false;
        const detail = {
            game: state.options && state.options.game ? state.options.game : '',
            total: state.items.length,
            failed: state.failed,
        };
        window.__gamePreloadDebug = {
            game: detail.game,
            total: detail.total,
            failed: detail.failed,
            items: state.items.map((item) => ({
                url: item.url,
                kind: item.kind,
                ok: item.ok,
                done: item.done,
            })),
        };
        document.dispatchEvent(new CustomEvent('gamepreloaddone', { detail }));
        console.info(
            '[game-preload] ' + (detail.game || 'game') + ' 预加载完成：' +
            detail.total + ' 项，未完成 ' + detail.failed + ' 项'
        );
        const overlay = state.overlay;
        setTimeout(() => {
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 700);
    }

    async function run() {
        if (state.started) return;
        state.started = true;
        const startedAt = performance.now();

        const items = await collectAssets();
        state.items = items;
        state.totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        state.failed = 0;
        paintProgress();

        const expireTimer = setTimeout(() => {
            state.expired = true;
            state.items.forEach((item) => {
                if (!item.done) item.fraction = 1;
            });
            paintProgress();
        }, TOTAL_TIMEOUT_MS);

        await Promise.race([preloadAll(items), sleep(TOTAL_TIMEOUT_MS)]);
        clearTimeout(expireTimer);
        state.items.forEach((item) => {
            if (!item.done) item.fraction = 1;
        });
        paintProgress();

        const elapsed = performance.now() - startedAt;
        if (elapsed < MIN_SHOW_MS) await sleep(MIN_SHOW_MS - elapsed);
        finish();
    }

    function mount(options) {
        if (state.mounted) return;
        state.mounted = true;
        state.options = options || {};
        createOverlay();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }
    }

    window.GamePreloader = { mount };
})();
