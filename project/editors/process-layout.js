(function () {
    'use strict';

    const STORAGE_KEY = 'PROCESS_BAR_LAYOUT_OVERRIDE_V5';
    const DEFAULTS = {
        icons: [
            { key: 'icon-0', left: 3.712393569946287, top: 50, width: 9.8, aspect: 1349 / 1251 },
            { key: 'icon-1', left: 20.9731640233749, top: 49.67632970569918, width: 9.3, aspect: 1023 / 1250 },
            { key: 'icon-2', left: 37.98260469269156, top: 49.67626983841757, width: 9.2, aspect: 1157 / 1250 },
            { key: 'icon-3', left: 54.77470248491336, top: 50, width: 9.3, aspect: 1256 / 1252 },
            { key: 'icon-4', left: 71.66238990196815, top: 49.676300070989946, width: 9.3, aspect: 1070 / 1251 },
            { key: 'icon-5', left: 87.68444118401942, top: 50.32369992901005, width: 9, aspect: 1 },
        ],
        lines: [
            { key: 'line-0', left: 13.32, top: 50, width: 7.27, aspect: 4410 / 135 },
            { key: 'line-1', left: 30.60, top: 50, width: 6.68, aspect: 4410 / 135 },
            { key: 'line-2', left: 47.29, top: 50, width: 6.14, aspect: 4410 / 135 },
            { key: 'line-3', left: 63.45, top: 50, width: 8.31, aspect: 4410 / 135 },
            { key: 'line-4', left: 81.77, top: 50, width: 4.73, aspect: 4410 / 135 },
        ],
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function mergeGroup(defaults, overrides) {
        if (!Array.isArray(overrides)) return clone(defaults);
        return defaults.map((item) => {
            const saved = overrides.find((candidate) => candidate && candidate.key === item.key);
            return saved ? { ...item, ...saved, key: item.key } : clone(item);
        });
    }

    function normalize(layout) {
        const result = {
            icons: mergeGroup(DEFAULTS.icons, layout && layout.icons),
            lines: mergeGroup(DEFAULTS.lines, layout && layout.lines),
        };
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

    function setPos(el, cfg) {
        if (!el || !cfg) return;
        el.style.left = cfg.left + '%';
        el.style.top = cfg.top + '%';
        el.style.width = cfg.width + '%';
        el.style.height = 'auto';
        el.style.aspectRatio = String(cfg.aspect);
    }

    function apply(root, layout) {
        const container = root || document;
        const current = normalize(layout || load());
        current.icons.forEach((cfg) => {
            setPos(container.querySelector('[data-layout-key="' + cfg.key + '"]'), cfg);
        });
        current.lines.forEach((cfg) => {
            setPos(container.querySelector('[data-layout-key="' + cfg.key + '"]'), cfg);
        });
        return current;
    }

    window.PROCESS_BAR_LAYOUT_STORAGE_KEY = STORAGE_KEY;
    window.PROCESS_BAR_LAYOUT_DEFAULTS = clone(DEFAULTS);
    window.PROCESS_BAR_LAYOUT_LOAD = load;
    window.PROCESS_BAR_LAYOUT_SAVE = save;
    window.PROCESS_BAR_LAYOUT_RESET = reset;
    window.PROCESS_BAR_LAYOUT_APPLY = apply;

    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) apply(document, load());
    });
})();
