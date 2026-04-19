// Betting and bankroll management
function calcSuggestedBet() {
  const min = parseFloat(document.getElementById('minBet').value) || 10;
  const max = parseFloat(document.getElementById('maxBet').value) || 200;
  const bankroll = parseFloat(document.getElementById('bankroll').value) || CONFIG.STARTING_BANKROLL;
  const currentBankroll = bankroll + state.sessionProfit;
  const deficit = bankroll - currentBankroll;
  const tc = trueCount();

  let mult = 1;
  if (tc > 3) mult = 8;
  else if (tc > 2.5) mult = 6;
  else if (tc > 1.5) mult = 4;
  else if (tc > 0.5) mult = 2;

  let recoveryMult = 1;
  const inRecovery = deficit > 0 && tc > 1;
  if (inRecovery) {
    const deficitRatio = Math.min(deficit / bankroll, 0.5);
    recoveryMult = Math.round((1 + deficitRatio * 2) * 10) / 10;
  }

  const bet = Math.min(Math.round(min * mult * recoveryMult), max);
  const unitLabel = inRecovery ? `${mult.toFixed(1)}u ×${recoveryMult.toFixed(1)}` : `${mult.toFixed(1)}u`;
  return { bet, mult, recoveryMult, inRecovery, unitLabel, tc };
}

function showBetPopup(prevBet, lastOutcome) {
  const s = calcSuggestedBet();
  const popupColor = s.tc > 1 ? 'var(--hot)' : s.tc > 0 ? 'var(--gold)' : 'var(--cold)';

  const badge = document.getElementById('popupResultBadge');
  if (lastOutcome === 'win') {
    badge.textContent = '✓ WIN +$' + (prevBet || 0);
    badge.className = 'bet-popup-result-badge win';
  } else if (lastOutcome === 'loss') {
    badge.textContent = '✗ LOSS -$' + (prevBet || 0);
    badge.className = 'bet-popup-result-badge loss';
  } else if (lastOutcome === 'push') {
    badge.textContent = '= PUSH';
    badge.className = 'bet-popup-result-badge push';
  } else {
    badge.className = 'bet-popup-result-badge none';
  }

  document.getElementById('popupSuggestedAmt').textContent = '$' + s.bet;
  document.getElementById('popupSuggestedAmt').style.color = popupColor;
  document.getElementById('popupSuggestedUnits').textContent = s.unitLabel + (s.inRecovery ? ' · RECOVERY' : '');
  document.getElementById('popupSuggestedUnits').style.color = s.inRecovery ? 'var(--hot)' : 'var(--label)';

  const prevEl = document.getElementById('popupPrevAmt');
  prevEl.textContent = prevBet != null ? '$' + prevBet : '—';
  prevEl.style.color = 'var(--white2)';

  const tcSign = s.tc >= 0 ? '+' : '';
  document.getElementById('popupTC').textContent = tcSign + s.tc.toFixed(1);
  document.getElementById('popupTC').style.color = s.tc > 1 ? 'var(--hot)' : s.tc > 0 ? 'var(--gold)' : 'var(--cold)';

  const pnlSign = state.sessionProfit >= 0 ? '+' : '';
  const pnlEl = document.getElementById('popupPnl');
  pnlEl.textContent = pnlSign + '$' + state.sessionProfit;
  pnlEl.style.color = state.sessionProfit >= 0 ? 'var(--cold)' : 'var(--red2)';

  document.getElementById('betPopupOverlay')._pendingBet = s.bet;
  document.getElementById('betPopupOverlay')._pendingUnits = s.unitLabel;
  document.getElementById('betPopupOverlay')._pendingColor = popupColor;

  document.getElementById('betPopupOverlay').classList.add('show');
}

function showBetAdjPopup(type) {
  const base = state.confirmedBet ? state.confirmedBet.bet : calcSuggestedBet().bet;
  const multiplied = type === 'double' ? base : base * 2;
  const label = type === 'split' ? 'SPLIT — BET DOUBLED' : 'DOUBLE DOWN — BET DOUBLED';
  const unitsLabel = type === 'split' ? '2 hands × $' + base : '2× original bet';

  document.getElementById('betAdjTitle').textContent = label;
  document.getElementById('adjPopupAmt').textContent = '$' + multiplied;
  document.getElementById('adjPopupAmt').style.color = 'var(--hot)';
  document.getElementById('adjPopupUnits').textContent = unitsLabel;
  document.getElementById('adjPopupOriginal').textContent = '$' + base;
  document.getElementById('adjPopupOriginal').style.color = 'var(--white2)';

  const overlay = document.getElementById('betAdjPopupOverlay');
  overlay._pendingBet = multiplied;
  overlay._pendingType = type;
  overlay._baseBet = base;
  overlay.classList.add('show');
}

function calculateHandResult(outcome, bet, isDoubled) {
  const effectiveBet = isDoubled ? bet * 2 : bet;
  if (outcome === 'win') return effectiveBet;
  if (outcome === 'loss') return -effectiveBet;
  return 0;
}

function autoDetectResultForHand(hand, handIndex) {
  if (!hand.length || !state.dealerHand.length) return null;
  const pTotal = handTotal(hand);
  const dTotal = handTotal(state.dealerHand.map(c => c.rank));
  if (pTotal > 21) return 'loss';
  if (dTotal > 21) return 'win';
  if (pTotal > dTotal) return 'win';
  if (pTotal < dTotal) return 'loss';
  return 'push';
}

function autoDetectResult() {
  const pHand = state.playerHands[state.activeHand] || [];
  const dHand = state.dealerHand.map(c => c.rank);
  const pTotal = handTotal(pHand);
  const dTotal = handTotal(dHand);
  
  if (!pHand.length || !dHand.length) return null;
  
  if (pTotal > 21) return 'loss';
  if (dTotal > 21) return 'win';
  if (pTotal > dTotal) return 'win';
  if (pTotal < dTotal) return 'loss';
  return 'push';
}