(function () {
    'use strict';

    const STORAGE_KEY = 'PAGE_STAGE_COMPONENT_LAYOUT_V3';
    const DEFAULTS = {
        leftVideo: { key: 'leftVideo', left: 8.73, top: 7.01, width: 33.45, height: 75.07 },
        rightVideo: { key: 'rightVideo', left: 56.58, top: 7.01, width: 33.45, height: 75.07 },
        borderLeft: { key: 'borderLeft', left: 6.532196199112905, top: 7.009995038884726, width: 35.6, height: 83 },
        borderRight: { key: 'borderRight', left: 56.744835159307286, top: 1.15763524967656, width: 36.5, height: 81 },
        barLeft: { key: 'barLeft', left: 0.10988339904506006, top: 1.5910978342846591, width: 100, height: 96.5 },
        barRight: { key: 'barRight', left: 1.4945044718478933, top: 2.1324490476097324, width: 100, height: 96.5 },
    };
    const IDS = {
        leftVideo: 'page-left',
        rightVideo: 'page-right',
        borderLeft: 'page-border-left',
        borderRight: 'page-border-right',
        barLeft: 'page-bar-left',
        barRight: 'page-bar-right',
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

    function apply(root, layout) {
        const container = root || document;
        const current = normalize(layout || load());
        Object.keys(IDS).forEach((key) => {
            const el = container.querySelector('#' + IDS[key]);
            const cfg = current[key];
            if (!el || !cfg) return;
            el.style.left = cfg.left + '%';
            el.style.top = cfg.top + '%';
            el.style.width = cfg.width + '%';
            el.style.height = cfg.height + '%';
        });
        return current;
    }

    function save(layout) {
        const normalized = normalize(layout);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        apply(document, normalized);
        return normalized;
    }

    function reset() {
        localStorage.removeItem(STORAGE_KEY);
        return apply(document, DEFAULTS);
    }

    window.PAGE_STAGE_COMPONENT_LAYOUT_KEY = STORAGE_KEY;
    window.PAGE_STAGE_COMPONENT_LAYOUT_DEFAULTS = clone(DEFAULTS);
    window.PAGE_STAGE_COMPONENT_LAYOUT_LOAD = load;
    window.PAGE_STAGE_COMPONENT_LAYOUT_APPLY = apply;
    window.PAGE_STAGE_COMPONENT_LAYOUT_SAVE = save;
    window.PAGE_STAGE_COMPONENT_LAYOUT_RESET = reset;

    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) apply(document, load());
    });
})();
