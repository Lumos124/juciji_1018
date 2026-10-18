(function () {
    'use strict';

    const stage = document.getElementById('editor-stage');
    const preview = document.getElementById('end-preview');
    const rightInput = document.getElementById('right-input');
    const bottomInput = document.getElementById('bottom-input');
    const widthInput = document.getElementById('width-input');
    const saveState = document.getElementById('save-state');
    const output = document.getElementById('layout-output');
    const saveBtn = document.getElementById('save-btn');
    const resetBtn = document.getElementById('reset-btn');
    const copyBtn = document.getElementById('copy-btn');

    let layout = window.GAME_END_LAYOUT_LOAD();
    let dragState = null;

    function markDirty() {
        saveState.textContent = '未保存修改';
        saveState.style.color = '#e6c886';
    }

    function syncOutput() {
        output.value = JSON.stringify(layout, null, 2);
    }

    function render() {
        preview.style.right = layout.right + '%';
        preview.style.bottom = layout.bottom + '%';
        preview.style.width = layout.width + '%';
        rightInput.value = Number(layout.right).toFixed(2);
        bottomInput.value = Number(layout.bottom).toFixed(2);
        widthInput.value = Number(layout.width).toFixed(2);
        syncOutput();
    }

    function updateField(field, value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;
        if (field === 'right') layout.right = Math.max(-20, Math.min(80, numeric));
        if (field === 'bottom') layout.bottom = Math.max(-20, Math.min(80, numeric));
        if (field === 'width') layout.width = Math.max(2, Math.min(40, numeric));
        markDirty();
        render();
    }

    preview.addEventListener('pointerdown', (event) => {
        const rect = stage.getBoundingClientRect();
        dragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            right: Number(layout.right),
            bottom: Number(layout.bottom),
            width: rect.width,
            height: rect.height,
        };
        preview.setPointerCapture(event.pointerId);
        event.preventDefault();
    });

    stage.addEventListener('pointermove', (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        layout.right = Math.max(-20, Math.min(80, dragState.right - (event.clientX - dragState.startX) / dragState.width * 100));
        layout.bottom = Math.max(-20, Math.min(80, dragState.bottom - (event.clientY - dragState.startY) / dragState.height * 100));
        markDirty();
        render();
        event.preventDefault();
    });

    function endDrag(event) {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        dragState = null;
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    rightInput.addEventListener('change', () => updateField('right', rightInput.value));
    bottomInput.addEventListener('change', () => updateField('bottom', bottomInput.value));
    widthInput.addEventListener('change', () => updateField('width', widthInput.value));

    saveBtn.addEventListener('click', () => {
        layout = window.GAME_END_LAYOUT_SAVE(layout);
        render();
        saveState.textContent = '已保存，四个游戏同步更新';
        saveState.style.color = '#7f9d8b';
    });

    resetBtn.addEventListener('click', () => {
        layout = window.GAME_END_LAYOUT_RESET();
        render();
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

    render();
})();
