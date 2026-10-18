(function () {
    'use strict';

    const STORAGE_KEY = 'GAME_END_BUTTON_LAYOUT_V3';
    const DEFAULTS = {
        right: 4.216345380608404,
        bottom: 8.981707680517713,
        width: 10,
    };

    function normalize(layout) {
        return {
            right: Number.isFinite(Number(layout && layout.right)) ? Number(layout.right) : DEFAULTS.right,
            bottom: Number.isFinite(Number(layout && layout.bottom)) ? Number(layout.bottom) : DEFAULTS.bottom,
            width: Number.isFinite(Number(layout && layout.width)) ? Number(layout.width) : DEFAULTS.width,
        };
    }

    function load() {
        try {
            return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
        } catch (err) {
            return { ...DEFAULTS };
        }
    }

    function apply(layout) {
        const current = normalize(layout || load());
        const root = document.documentElement;
        root.style.setProperty('--game-end-right', current.right + '%');
        root.style.setProperty('--game-end-bottom', current.bottom + '%');
        root.style.setProperty('--game-end-width', current.width + '%');
        return current;
    }

    function save(layout) {
        const normalized = normalize(layout);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        apply(normalized);
        return normalized;
    }

    function reset() {
        localStorage.removeItem(STORAGE_KEY);
        return apply(DEFAULTS);
    }

    window.GAME_END_LAYOUT_STORAGE_KEY = STORAGE_KEY;
    window.GAME_END_LAYOUT_DEFAULTS = { ...DEFAULTS };
    window.GAME_END_LAYOUT_LOAD = load;
    window.GAME_END_LAYOUT_APPLY = apply;
    window.GAME_END_LAYOUT_SAVE = save;
    window.GAME_END_LAYOUT_RESET = reset;

    apply(load());
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) apply(load());
    });
})();
