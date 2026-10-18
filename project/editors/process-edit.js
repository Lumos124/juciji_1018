(function () {
    'use strict';

    const stage = document.getElementById('editor-stage');
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

    let layout = window.PROCESS_BAR_LAYOUT_LOAD();
    let selectedKey = layout.icons[0].key;
    let dragState = null;

    const iconNames = ['锔瓷缘起', '名瓷鉴定', '瓷片清洗', '找碴对缝', '绑扎定型', '上钉加固'];
    const allItems = () => layout.icons.concat(layout.lines);
    const getItem = (key) => allItems().find((item) => item.key === key);
    const getElement = (key) => stage.querySelector('[data-layout-key="' + key + '"]');

    function itemLabel(item) {
        if (!item) return '';
        if (item.key.startsWith('icon-')) {
            return '图标 ' + (Number(item.key.split('-')[1]) + 1) + ' · ' + iconNames[Number(item.key.split('-')[1])];
        }
        return '短线 ' + (Number(item.key.split('-')[1]) + 1);
    }

    function markDirty() {
        saveState.textContent = '未保存修改';
        saveState.style.color = '#e6c886';
    }

    function syncOutput() {
        output.value = JSON.stringify(layout, null, 2);
    }

    function renderSelection() {
        stage.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
        const item = getItem(selectedKey);
        const el = getElement(selectedKey);
        if (el) el.classList.add('is-selected');
        if (!item) return;
        itemSelect.value = item.key;
        selectionLabel.textContent = itemLabel(item);
        leftInput.value = Number(item.left).toFixed(2);
        topInput.value = Number(item.top).toFixed(2);
        widthInput.value = Number(item.width).toFixed(2);
    }

    function renderAll() {
        window.PROCESS_BAR_LAYOUT_APPLY(stage, layout);
        renderSelection();
        syncOutput();
    }

    function buildSelect() {
        allItems().forEach((item) => {
            const option = document.createElement('option');
            option.value = item.key;
            option.textContent = itemLabel(item);
            itemSelect.appendChild(option);
        });
    }

    function updateItemField(field, value) {
        const item = getItem(selectedKey);
        if (!item) return;
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;
        if (field === 'left') item.left = Math.max(-20, Math.min(120, numeric));
        if (field === 'top') item.top = Math.max(-20, Math.min(120, numeric));
        if (field === 'width') item.width = Math.max(0.2, Math.min(40, numeric));
        markDirty();
        renderAll();
    }

    stage.addEventListener('pointerdown', (event) => {
        const el = event.target.closest('[data-layout-key]');
        if (!el) return;
        selectedKey = el.dataset.layoutKey;
        const item = getItem(selectedKey);
        if (!item) return;
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
        el.setPointerCapture(event.pointerId);
        renderSelection();
        event.preventDefault();
    });

    stage.addEventListener('pointermove', (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        const item = getItem(selectedKey);
        if (!item) return;
        const dx = ((event.clientX - dragState.startX) / dragState.width) * 100;
        const dy = ((event.clientY - dragState.startY) / dragState.height) * 100;
        item.left = Math.max(-20, Math.min(120, dragState.left + dx));
        item.top = Math.max(-20, Math.min(120, dragState.top + dy));
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

    leftInput.addEventListener('change', () => updateItemField('left', leftInput.value));
    topInput.addEventListener('change', () => updateItemField('top', topInput.value));
    widthInput.addEventListener('change', () => updateItemField('width', widthInput.value));

    saveBtn.addEventListener('click', () => {
        layout = window.PROCESS_BAR_LAYOUT_SAVE(layout);
        window.PROCESS_BAR_LAYOUT_APPLY(stage, layout);
        saveState.textContent = '已保存，主页面同步更新';
        saveState.style.color = '#7f9d8b';
        syncOutput();
    });

    resetBtn.addEventListener('click', () => {
        layout = window.PROCESS_BAR_LAYOUT_RESET();
        selectedKey = layout.icons[0].key;
        window.PROCESS_BAR_LAYOUT_APPLY(stage, layout);
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
        window.setTimeout(() => {
            copyBtn.textContent = '复制配置';
        }, 1200);
    });

    buildSelect();
    renderAll();
})();
