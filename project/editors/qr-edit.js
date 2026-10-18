(function () {
    'use strict';

    const stage = document.getElementById('editor-stage');
    const frame = document.getElementById('edit-frame');
    const book = document.getElementById('node-fx-book');
    const itemSelect = document.getElementById('item-select');
    const leftInput = document.getElementById('left-input');
    const topInput = document.getElementById('top-input');
    const widthInput = document.getElementById('width-input');
    const selectionLabel = document.getElementById('selection-label');
    const saveState = document.getElementById('save-state');
    const output = document.getElementById('layout-output');
    const saveBtn = document.getElementById('save-btn');
    const resetBtn = document.getElementById('reset-btn');
    const copyBtn = document.getElementById('copy-btn');

    let layout = window.QR_STAGE_LAYOUT_LOAD();
    let selectedKey = 'book';
    let dragState = null;

    function syncPreviewViewport() {
        const ratio = Math.max(0.5, window.innerWidth / Math.max(1, window.innerHeight));
        stage.style.setProperty('--preview-ratio', String(ratio));
    }

    const ids = {
        book: 'node-fx-book',
        qr: 'node-fx-qr-art',
        tip: 'node-fx-tip-art',
        flip: 'node-fx-flip',
    };
    const labels = {
        book: '书页最后一帧',
        qr: '二维码',
        tip: '提示条',
        flip: '翻页角标',
    };

    const getElement = (key) => document.getElementById(ids[key]);
    const getItem = (key) => layout[key];

    function markDirty() {
        saveState.textContent = '未保存修改';
        saveState.style.color = '#e6c886';
    }

    function syncOutput() {
        output.value = JSON.stringify(layout, null, 2);
    }

    function renderSelection() {
        stage.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
        const el = getElement(selectedKey);
        const item = getItem(selectedKey);
        if (el) el.classList.add('is-selected');
        if (!item) return;
        itemSelect.value = selectedKey;
        selectionLabel.textContent = labels[selectedKey];
        leftInput.value = Number(item.left).toFixed(2);
        topInput.value = Number(item.top).toFixed(2);
        widthInput.value = Number(item.width).toFixed(2);
    }

    function renderAll() {
        window.QR_STAGE_LAYOUT_APPLY(stage, layout);
        renderSelection();
        syncOutput();
    }

    function updateField(field, value) {
        const item = getItem(selectedKey);
        if (!item) return;
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;
        if (field === 'left') item.left = Math.max(-20, Math.min(120, numeric));
        if (field === 'top') item.top = Math.max(-20, Math.min(120, numeric));
        if (field === 'width') item.width = Math.max(0.5, Math.min(150, numeric));
        markDirty();
        renderAll();
    }

    stage.addEventListener('pointerdown', (event) => {
        const key = Object.keys(ids).find((candidate) => event.target.closest('#' + ids[candidate]));
        if (!key) return;
        selectedKey = key;
        const item = getItem(key);
        const rect = frame.getBoundingClientRect();
        if (!item) return;
        dragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            left: Number(item.left),
            top: Number(item.top),
            width: rect.width,
            height: rect.height,
        };
        getElement(key).setPointerCapture(event.pointerId);
        renderSelection();
        event.preventDefault();
    });

    stage.addEventListener('pointermove', (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        const item = getItem(selectedKey);
        if (!item) return;
        item.left = Math.max(-20, Math.min(120, dragState.left + (event.clientX - dragState.startX) / dragState.width * 100));
        item.top = Math.max(-20, Math.min(120, dragState.top + (event.clientY - dragState.startY) / dragState.height * 100));
        markDirty();
        renderAll();
        event.preventDefault();
    });

    function endDrag(event) {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        dragState = null;
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    itemSelect.addEventListener('change', () => {
        selectedKey = itemSelect.value;
        renderSelection();
    });
    leftInput.addEventListener('change', () => updateField('left', leftInput.value));
    topInput.addEventListener('change', () => updateField('top', topInput.value));
    widthInput.addEventListener('change', () => updateField('width', widthInput.value));

    saveBtn.addEventListener('click', () => {
        layout = window.QR_STAGE_LAYOUT_SAVE(layout);
        window.QR_STAGE_LAYOUT_APPLY(stage, layout);
        saveState.textContent = '已保存，主页面同步更新';
        saveState.style.color = '#7f9d8b';
        syncOutput();
    });

    resetBtn.addEventListener('click', () => {
        layout = window.QR_STAGE_LAYOUT_RESET();
        selectedKey = 'book';
        window.QR_STAGE_LAYOUT_APPLY(stage, layout);
        saveState.textContent = '已恢复默认';
        saveState.style.color = '#7f9d8b';
        renderSelection();
        syncOutput();
    });

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(output.value);
            copyBtn.textContent = '已复制';
        } catch (err) {
            output.focus();
            output.select();
            copyBtn.textContent = '请手动复制';
        }
        window.setTimeout(() => { copyBtn.textContent = '复制配置'; }, 1200);
    });

    syncPreviewViewport();
    renderAll();
    if (typeof window.PROCESS_BAR_LAYOUT_APPLY === 'function') {
        window.PROCESS_BAR_LAYOUT_APPLY(stage);
    }
    window.addEventListener('resize', () => {
        syncPreviewViewport();
        renderAll();
    });
})();
