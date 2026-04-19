// Deck tracking functions
function totalCards() { 
  return state.decks * 52; 
}

function totalPlayed() {
  let n = 0;
  CONFIG.SUITS.forEach(s => CONFIG.RANKS.forEach(r => n += state.played[s][r]));
  return n + state.adjustments;
}

function decksLeft() { 
  return Math.max(0.1, (totalCards() - totalPlayed()) / 52); 
}

function trueCount() { 
  return state.running / decksLeft(); 
}

function shoeSize() {
  return Math.max(1, totalCards() - totalPlayed());
}

function remainingOf(r) {
  const bucket = ['J', 'Q', 'K'].includes(r) ? '10' : r;
  let n = 0;
  CONFIG.SUITS.forEach(s => { n += Math.max(0, state.decks - state.played[s][bucket]); });
  return n;
}

function tenProb() {
  const totalTens = remainingOf('10') * 4;
  const rem = shoeSize();
  return rem > 0 ? Math.min(1, totalTens / rem) : 0.31;
}

function deckDistribution() {
  const dist = [];
  const rem = shoeSize();
  for (const r of CONFIG.RANKS) {
    const n = remainingOf(r);
    if (n > 0) dist.push({ rank: r, prob: n / rem });
  }
  return dist;
}

function getCardClass(r) {
  if (['2', '3', '4', '5', '6'].includes(r)) return 'low';
  if (['7', '8', '9'].includes(r)) return 'neutral';
  return 'high';
}

function rankVal(r) {
  if (['10', 'J', 'Q', 'K'].includes(r)) return 10;
  return parseInt(r, 10) || 0;
}

function handTotal(h) {
  let t = 0, a = 0;
  h.forEach(r => { 
    if (r === 'A') { a++; t += 11; } 
    else t += rankVal(r); 
  });
  while (t > 21 && a > 0) { t -= 10; a--; }
  return t;
}

function isSoft(h) {
  let t = 0, a = 0;
  h.forEach(r => { 
    if (r === 'A') { a++; t += 11; } 
    else t += rankVal(r); 
  });
  return a > 0 && t <= 21;
}

function isPair(h) { 
  return h && h.length === 2 && h[0] === h[1]; 
}