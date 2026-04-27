// Deck tracking functions
function totalCards() { 
  return state.decks * 52; 
}

function totalPlayed() {
  let n = 0;
  // Only count the unique buckets, not J/Q/K separately
  const buckets = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  CONFIG.SUITS.forEach(s => {
    buckets.forEach(r => {
      n += state.played[s][r] || 0;
    });
  });
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
  // Map all 10-value cards to the '10' bucket
  const bucket = (r === '10' || r === 'J' || r === 'Q' || r === 'K') ? '10' : r;
  let n = 0;
  CONFIG.SUITS.forEach(s => { 
    n += Math.max(0, state.decks - (state.played[s][bucket] || 0)); 
  });
  
  // IMPORTANT: The '10' bucket tracks ONE denomination of 10-value cards per suit.
  // There are FOUR 10-value denominations (10, J, Q, K) in each suit.
  // So the actual number of 10-value cards remaining is the bucket count × 4.
  if (bucket === '10') {
    return n * 4;
  }
  return n;
}

function tenProb() {
  const totalTens = remainingOf('10');
  const rem = shoeSize();
  return rem > 0 ? Math.min(1, totalTens / rem) : 0.31;
}

function deckDistribution() {
  const dist = [];
  const rem = shoeSize();
  
  // Each rank with its multiplicity
  const rankMultiplicity = {
    'A': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 1, '8': 1, '9': 1, '10': 4
  };
  
  for (const r of Object.keys(rankMultiplicity)) {
    const bucket = r;
    let cardsInBucket = 0;
    CONFIG.SUITS.forEach(s => {
      cardsInBucket += Math.max(0, state.decks - (state.played[s][bucket] || 0));
    });
    
    // Each card in the bucket represents 'multiplicity' actual cards
    const totalCardsOfThisRank = cardsInBucket * rankMultiplicity[r];
    
    if (totalCardsOfThisRank > 0) {
      const prob = totalCardsOfThisRank / rem;
      // Add to distribution with appropriate weight
      dist.push({ rank: r, prob: prob });
    }
  }
  
  return dist;
}

function getCardClass(r) {
  if (['2', '3', '4', '5', '6'].includes(r)) return 'low';
  if (['7', '8', '9'].includes(r)) return 'neutral';
  return 'high';
}

function rankVal(r) {
  if (r === 'A') return 11;
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