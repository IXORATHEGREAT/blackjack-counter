// Basic Strategy Tables
const BS_COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

const BS_HARD = {
  5: ['H','H','H','H','H','H','H','H','H','H'],
  6: ['H','H','H','H','H','H','H','H','H','H'],
  7: ['H','H','H','H','H','H','H','H','H','H'],
  8: ['H','H','H','H','H','H','H','H','H','H'],
  9: ['H','D','D','D','D','H','H','H','H','H'],
  10: ['D','D','D','D','D','D','D','D','H','H'],
  11: ['D','D','D','D','D','D','D','D','D','H'],
  12: ['H','H','S','S','S','H','H','H','H','H'],
  13: ['S','S','S','S','S','H','H','H','H','H'],
  14: ['S','S','S','S','S','H','H','H','H','H'],
  15: ['S','S','S','S','S','H','H','H','R','H'],
  16: ['S','S','S','S','S','H','H','R','R','R'],
  17: ['S','S','S','S','S','S','S','S','S','S'],
  18: ['S','S','S','S','S','S','S','S','S','S'],
  19: ['S','S','S','S','S','S','S','S','S','S'],
  20: ['S','S','S','S','S','S','S','S','S','S'],
  21: ['S','S','S','S','S','S','S','S','S','S'],
};

const BS_SOFT = {
  13: ['H','H','H','D','D','H','H','H','H','H'],
  14: ['H','H','H','D','D','H','H','H','H','H'],
  15: ['H','H','D','D','D','H','H','H','H','H'],
  16: ['H','H','D','D','D','H','H','H','H','H'],
  17: ['H','D','D','D','D','H','H','H','H','H'],
  18: ['S','D','D','D','D','S','S','H','H','H'],
  19: ['S','S','S','S','S','S','S','S','S','S'],
  20: ['S','S','S','S','S','S','S','S','S','S'],
};

const BS_PAIR = {
  'A': ['P','P','P','P','P','P','P','P','P','P'],
  '2': ['P','P','P','P','P','P','H','H','H','H'],
  '3': ['P','P','P','P','P','P','H','H','H','H'],
  '4': ['H','H','H','P','P','H','H','H','H','H'],
  '5': ['D','D','D','D','D','D','D','D','H','H'],
  '6': ['P','P','P','P','P','H','H','H','H','H'],
  '7': ['P','P','P','P','P','P','H','H','H','H'],
  '8': ['P','P','P','P','P','P','P','P','P','P'],
  '9': ['P','P','P','P','P','S','P','P','S','S'],
  '10': ['S','S','S','S','S','S','S','S','S','S'],
};

function basicStrategy(h, up) {
  if (!up || !h || !h.length) return null;
  const di = BS_COLS.indexOf(['J','Q','K'].includes(up) ? '10' : up);
  if (di < 0) return null;
  const t = handTotal(h);
  if (t > 21) return null;

  const canDouble = h.length === 2;
  const canSplitHand = isPair(h) && !state.isSplit;

  let code;
  if (canSplitHand) {
    const pairRank = ['J','Q','K'].includes(h[0]) ? '10' : h[0];
    code = BS_PAIR[pairRank]?.[di] ?? null;
    if (code === 'P' && !canSplitHand) code = null;
  }
  if (!code && isSoft(h) && BS_SOFT[t]) {
    code = BS_SOFT[t][di];
  }
  if (!code) {
    const key = Math.min(21, Math.max(5, t));
    code = BS_HARD[key]?.[di] ?? 'S';
  }

  if (code === 'D' && !canDouble) code = 'H';
  if (code === 'P' && !canSplitHand) {
    const key = Math.min(21, Math.max(5, t));
    code = BS_HARD[key]?.[di] ?? 'S';
  }

  return { action: code, ...ACTION_META[code] };
}

function getStrategy(h, up) {
  if (!up || !h.length) return null;
  const t = handTotal(h);
  if (t > 21) return null;

  const sEV = evStand(t, up);
  const hEV = evHit(h, up);
  const canDouble = h.length === 2;
  const canSplit = isPair(h) && !state.isSplit;
  const dEV = canDouble ? evDouble(h, up) : -Infinity;
  const pEV = canSplit ? evSplit(h[0], up) : -Infinity;
  const rEV = evSurrender();

  const candidates = [
    { code: 'S', ev: sEV },
    { code: 'H', ev: hEV },
    { code: 'D', ev: dEV },
    { code: 'P', ev: pEV },
  ];
  if (rEV > sEV && rEV > hEV) candidates.push({ code: 'R', ev: rEV });

  candidates.sort((a, b) => b.ev - a.ev);
  const best = candidates[0];
  const meta = ACTION_META[best.code];

  return {
    action: best.code,
    name: meta.name,
    cssVar: meta.cssVar,
    evs: { S: sEV, H: hEV, D: canDouble ? dEV : null, P: canSplit ? pEV : null, R: rEV },
    bestEV: best.ev,
  };
}