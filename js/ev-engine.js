// EV Probability Tree Engine
function dealerBustEV(total, soft, dist, depth = 0) {
  if (total >= 17) return total > 21 ? 1 : 0;
  if (depth > 5) return total > 21 ? 1 : 0.28;
  
  let ev = 0;
  for (const { rank, prob } of dist) {
    const v = rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank);
    let t = total + v;
    let s = soft || rank === 'A';
    if (t > 21 && s) { t -= 10; s = false; }
    ev += prob * dealerBustEV(t, s, dist, depth + 1);
  }
  return ev;
}

function evPlayerVsStandingDealer(playerTotal, dealerTotal, dealerSoft, dist, depth) {
  if (dealerTotal >= 17) {
    if (dealerTotal > 21) return 1;
    if (playerTotal > dealerTotal) return 1;
    if (playerTotal === dealerTotal) return 0;
    return -1;
  }
  if (depth > 4) return playerTotal > dealerTotal ? 0.5 : -0.5;
  
  let ev = 0;
  for (const { rank, prob } of dist) {
    const v = rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank);
    let t = dealerTotal + v;
    let s = dealerSoft || rank === 'A';
    if (t > 21 && s) { t -= 10; s = false; }
    ev += prob * evPlayerVsStandingDealer(playerTotal, t, s, dist, depth + 1);
  }
  return ev;
}

function evStand(playerTotal, dealerUpRank) {
  const dist = deckDistribution();
  const upV = dealerUpRank === 'A' ? 11 : ['J', 'Q', 'K'].includes(dealerUpRank) ? 10 : parseInt(dealerUpRank);
  const dealerSoft = dealerUpRank === 'A';
  return evPlayerVsStandingDealer(playerTotal, upV, dealerSoft, dist, 0);
}

function evHit(hand, dealerUpRank, depth = 0) {
  if (depth > 3) return evStand(handTotal(hand), dealerUpRank);
  const dist = deckDistribution();
  let ev = 0;
  for (const { rank, prob } of dist) {
    const newHand = [...hand, rank];
    const t = handTotal(newHand);
    if (t > 21) ev += prob * -1;
    else if (t === 21) ev += prob * evStand(21, dealerUpRank);
    else {
      const sEV = evStand(t, dealerUpRank);
      const hEV = evHit(newHand, dealerUpRank, depth + 1);
      ev += prob * Math.max(sEV, hEV);
    }
  }
  return ev;
}

function evDouble(hand, dealerUpRank) {
  const dist = deckDistribution();
  let ev = 0;
  for (const { rank, prob } of dist) {
    const newHand = [...hand, rank];
    const t = handTotal(newHand);
    const outcome = t > 21 ? -1 : evStand(t, dealerUpRank);
    ev += prob * outcome * 2;
  }
  return ev;
}

function evSurrender() { 
  return -0.5; 
}

function evSplit(rank, dealerUpRank) {
  const dist = deckDistribution();
  let handEV = 0;
  for (const { rank: nextRank, prob } of dist) {
    const hand = [rank, nextRank];
    const t = handTotal(hand);
    if (t > 21) { handEV += prob * -1; continue; }
    const sEV = evStand(t, dealerUpRank);
    const hEV = evHit(hand, dealerUpRank, 1);
    const dEV = hand.length === 2 ? evDouble(hand, dealerUpRank) : -Infinity;
    handEV += prob * Math.max(sEV, hEV, dEV);
  }
  return handEV * 2;
}

function dealerBustProb(up) {
  if (!up) return 0.28;
  const dist = deckDistribution();
  const upV = up === 'A' ? 11 : ['J', 'Q', 'K'].includes(up) ? 10 : parseInt(up);
  return dealerBustEV(upV, up === 'A', dist, 0);
}

function playerBustProb(h) {
  if (!h || !h.length) return 0;
  const t = handTotal(h);
  if (t >= 21) return t > 21 ? 1 : 0;
  if (t <= 11) return 0;
  const dist = deckDistribution();
  let bustP = 0;
  for (const { rank, prob } of dist) {
    const v = rank === 'A' ? 1 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank);
    if (t + v > 21) bustP += prob;
  }
  return bustP;
}