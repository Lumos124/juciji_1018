/* ============================================================
   焗瓷记 · 小游戏评分（四个小游戏共用）
   规则：按“完成阶段”判分 —— 每完成一个阶段得 100 / 总阶段数 分；
        为了保留分数差异，全部完成也不给满分，统一压到 99.9。
   例：5 个阶段 → 20 / 40 / 60 / 80 / 99.9
       4 个阶段 → 25 / 50 / 75 / 99.9
       2 个阶段 → 50 / 99.9
   ============================================================ */
(function () {
    'use strict';

    const MAX_SCORE = 99.9;

    function stageScore(done, total) {
        const stages = Number(total) || 0;
        if (stages <= 0) return 0;
        const finished = Math.max(0, Math.min(Number(done) || 0, stages));
        if (finished <= 0) return 0;
        const raw = (finished / stages) * 100;
        return Math.round(Math.min(raw, MAX_SCORE) * 10) / 10;
    }

    // 成绩带小数时保留一位（99.9 / 99.8），整数不带小数点。
    function formatScore(value) {
        const n = Number(value) || 0;
        return Number.isInteger(n) ? String(n) : n.toFixed(1);
    }

    window.STAGE_SCORE_MAX = MAX_SCORE;
    window.stageScore = stageScore;
    window.formatScore = formatScore;
})();
