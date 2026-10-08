'use strict';
// ===== Порядок уровней (пролог — отдельная сценка, не на карте) =====
const LEVELS = [typeof LV1 !== 'undefined' && LV1, typeof LV2 !== 'undefined' && LV2, typeof LV3 !== 'undefined' && LV3, typeof LV4 !== 'undefined' && LV4, typeof LV5 !== 'undefined' && LV5].filter(Boolean);
LEVELS.forEach((d, i) => { d.idx = i; });
