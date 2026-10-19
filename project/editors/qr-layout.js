(function () {
    'use strict';

    const STORAGE_KEY = 'QR_STAGE_LAYOUT_OVERRIDE_V9';
    const DEFAULTS = {
        book: { key: 'book', left: 50, top: 49, width: 76, aspect: 1920 / 823 },
        qr: { key: 'qr', left: 50, top: 49.72211956845681, width: 75, aspect: 4804 / 362 },
        tip: { key: 'tip', left: 50.87193623898586, top: 75.09099371535436, width: 50, aspect: 4052 / 292 },
        flip: { key: 'flip', left: 99.09889692963147, top: 113.05868627621541, width: 14, aspect: 1.45 },
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalize(layout) {
        const result = {};
        Object.keys(DEFAULTS).forEach((key) => {
            result[key] = { ...DEFAULTS[key], ...((layout && layout[key]) || {}), key };
        });
        return result;
    }

    function load() {
        try {
            return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
        } catch (err) {
            return clone(DEFAULTS);
        }
    }

    function save(layout) {
        const normalized = normalize(layout);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
    }

    function reset() {
        localStorage.removeItem(STORAGE_KEY);
        return clone(DEFAULTS);
    }

    function apply(root, layout) {
        const container = root || document;
        const current = normalize(layout || load());
        const ids = {
            book: 'node-fx-book',
            qr: 'node-fx-qr-art',
            tip: 'node-fx-tip-art',
            flip: 'node-fx-flip',
        };
        Object.keys(ids).forEach((key) => {
            const el = container.querySelector('#' + ids[key]);
            const cfg = current[key];
            if (!el || !cfg) return;
            const frame = container.querySelector('#fx-frame, #edit-frame');
            const isPortalFlip = key === 'flip' && frame && el.parentElement
                && !el.parentElement.closest('#fx-frame');
            if (isPortalFlip) {
                const frameRect = frame.getBoundingClientRect();
                const parent = el.parentElement;
                const parentRect = parent.getBoundingClientRect();
                el.style.left = (frameRect.left - parentRect.left + frameRect.width * cfg.left / 100) + 'px';
                el.style.top = (frameRect.top - parentRect.top + frameRect.height * cfg.top / 100) + 'px';
                el.style.width = (frameRect.width * cfg.width / 100) + 'px';
            } else {
                el.style.left = cfg.left + '%';
                el.style.top = cfg.top + '%';
                el.style.width = cfg.width + '%';
            }
            el.style.height = 'auto';
            el.style.aspectRatio = String(cfg.aspect);
        });
        return current;
    }

    window.QR_STAGE_LAYOUT_STORAGE_KEY = STORAGE_KEY;
    window.QR_STAGE_LAYOUT_DEFAULTS = clone(DEFAULTS);
    window.QR_STAGE_LAYOUT_LOAD = load;
    window.QR_STAGE_LAYOUT_SAVE = save;
    window.QR_STAGE_LAYOUT_RESET = reset;
    window.QR_STAGE_LAYOUT_APPLY = apply;

    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) apply(document, load());
    });
    window.addEventListener('resize', () => apply(document, load()));
})();
