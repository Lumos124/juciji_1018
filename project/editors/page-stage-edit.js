(function () {
    'use strict';

    const stage = document.getElementById('editor-stage');
    const itemSelect = document.getElementById('item-select');
    const leftInput = document.getElementById('left-input');
    const topInput = document.getElementById('top-input');
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');
    const sizeNote = document.getElementById('size-note');
    const selectionLabel = document.getElementById('selection-label');
    const saveState = document.getElementById('save-state');
    const output = document.getElementById('layout-output');
    const saveBtn = document.getElementById('save-btn');
    const resetBtn = document.getElementById('reset-btn');
    const copyBtn = document.getElementById('copy-btn');

    let layout = window.PAGE_STAGE_COMPONENT_LAYOUT_LOAD();
    let selectedKey = 'leftVideo';
    let dragState = null;

    const ids = {
        leftVideo: 'page-left',
        rightVideo: 'page-right',
        borderLeft: 'page-border-left',
        borderRight: 'page-border-right',
        barLeft: 'page-bar-left',
        barRight: 'page-bar-right',
    };
    const labels = {
        leftVideo: '左侧视频静帧',
        rightVideo: '右侧视频静帧',
        borderLeft: '左侧活动边框',
        borderRight: '右侧活动边框',
        barLeft: '左侧条 MOV',
        barRight: '右侧条 MOV',
    };
    const fixedSize = new Set(['leftVideo', 'rightVideo']);

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
        heightInput.value = Number(item.height).toFixed(2);
        widthInput.disabled = fixedSize.has(selectedKey);
        heightInput.disabled = fixedSize.has(selectedKey);
        sizeNote.textContent = fixedSize.has(selectedKey)
            ? '视频静帧仅调整位置，尺寸与源视频一致。'
            : '边框与 MOV 可以调整位置、宽度和高度。';
    }

    function renderAll() {
        window.PAGE_STAGE_COMPONENT_LAYOUT_APPLY(stage, layout);
        renderSelection();
        syncOutput();
    }

    function updateField(field, value) {
        const item = getItem(selectedKey);
        if (!item) return;
        if (fixedSize.has(selectedKey) && (field === 'width' || field === 'height')) return;
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;
        item[field] = Math.max(-100, Math.min(200, numeric));
        markDirty();
        renderAll();
    }

    stage.addEventListener('pointerdown', (event) => {
        const key = Object.keys(ids).find((candidate) => event.target.closest('#' + ids[candidate]));
        if (!key) return;
        const item = getItem(key);
        if (!item) return;
        selectedKey = key;
        const rect = stage.getBoundingClientRect();
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
        item.left = dragState.left + (event.clientX - dragState.startX) / dragState.width * 100;
        item.top = dragState.top + (event.clientY - dragState.startY) / dragState.height * 100;
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
    heightInput.addEventListener('change', () => updateField('height', heightInput.value));

    saveBtn.addEventListener('click', () => {
        layout = window.PAGE_STAGE_COMPONENT_LAYOUT_SAVE(layout);
        renderAll();
        saveState.textContent = '已保存，主页面同步更新';
        saveState.style.color = '#7f9d8b';
    });

    resetBtn.addEventListener('click', () => {
        layout = window.PAGE_STAGE_COMPONENT_LAYOUT_RESET();
        selectedKey = 'leftVideo';
        renderAll();
        saveState.textContent = '已恢复默认';
        saveState.style.color = '#7f9d8b';
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

    ['page-left', 'page-right', 'page-bar-left', 'page-bar-right'].forEach((id) => {
        const video = document.getElementById(id);
        video.addEventListener('loadedmetadata', () => {
            if (!Number.isFinite(video.duration)) return;
            video.currentTime = Math.min(1, Math.max(0, video.duration - 0.05));
            video.pause();
        });
    });

    renderAll();
})();
