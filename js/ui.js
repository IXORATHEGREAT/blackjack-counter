// UI Rendering and interaction
function notify(msg, sub = '') {
  const n = document.getElementById('notification');
  document.getElementById('notifText').textContent = msg;
  document.getElementById('notifSub').textContent = sub;
  if (state.notifTimer) clearTimeout(state.notifTimer);
  n.classList.remove('show');
  n.offsetHeight;
  n.classList.add('show');
  state.notifTimer = setTimeout(() => n.classList.remove('show'), 1200);
}

function buildKeypad() {
  const btns = [
    { r: 'A', v: -1 }, { r: '2', v: 1 }, { r: '3', v: 1 }, { r: '4', v: 1 },
    { r: '5', v: 1 }, { r: '6', v: 1 }, { r: '7', v: 0 }, { r: '8', v: 0 },
    { r: '9', v: 0 }, { r: '10', v: -1 }, { r: 'J', v: -1 }, { r: 'Q', v: -1 },
    { r: 'K', v: -1 }, { r: '+1', v: 1, adj: true }, { r: '0', v: 0, adj: true }, { r: '-1', v: -1, adj: true }
  ];
  const html = btns.map(b => {
    const cls = b.adj ? 'adjust' : (b.v > 0 ? 'low' : b.v < 0 ? 'high' : 'neutral');
    return `<button class="key ${cls}" onclick="app.handleKey('${b.r}', ${b.v}, ${b.adj || false})"><span class="key-main">${b.r}</span><span class="key-sub">${b.v > 0 ? '+' + b.v : b.v}</span></button>`;
  }).join('');
  document.getElementById('keypad').innerHTML = html;
}

function renderUI() {
  // Update RC/TC
  document.getElementById('rc').textContent = (state.running > 0 ? '+' : '') + state.running;
  document.getElementById('rc').className = 'stat-value ' + (state.running > 0 ? 'positive' : state.running < 0 ? 'negative' : 'neutral');
  const tc = trueCount();
  document.getElementById('tc').textContent = (tc > 0 ? '+' : '') + tc.toFixed(1);
  document.getElementById('tc').className = 'stat-value ' + (tc > 0 ? 'positive' : tc < 0 ? 'negative' : 'neutral');
  document.getElementById('cardsLeft').textContent = totalCards() - totalPlayed();
  
  // Render hands
  const handsRow = document.getElementById('handsRow');
  if (!state.isSplit) {
    if (!document.getElementById('playerBox')) {
      handsRow.innerHTML = `
        <div class="hand-box" id="dealerBox" onclick="app.setTarget('dealer')">
          <span class="hand-label">DEALER</span>
          <div class="cards-container" id="dealerCards"></div>
          <div id="dealerTotal"></div>
        </div>
        <div class="hand-box" id="playerBox" onclick="app.setTarget('player')">
          <span class="hand-label">PLAYER</span>
          <div class="cards-container" id="playerCards"></div>
          <div id="playerTotal"></div>
        </div>`;
    }

    document.getElementById('dealerBox').classList.toggle('active', state.target === 'dealer');
    document.getElementById('playerBox').classList.toggle('active', state.target === 'player');

    const dc = document.getElementById('dealerCards');
    if (!state.dealerHand.length) {
      dc.innerHTML = '<div class="card-placeholder">+</div>';
      document.getElementById('dealerTotal').innerHTML = '';
    } else {
      dc.innerHTML = state.dealerHand.map((c, i) => 
        `<div class="card ${getCardClass(c.rank)}" onclick="app.removeDealer(${i})"><span class="card-value">${c.rank}</span></div>`
      ).join('');
      const t = handTotal(state.dealerHand.map(c => c.rank));
      document.getElementById('dealerTotal').innerHTML = `<span class="hand-total ${t > 21 ? 'bust' : ''}">${t}${t > 21 ? ' BUST' : ''}</span>`;
    }

    const h = state.playerHands[0];
    const pc = document.getElementById('playerCards');
    if (!h.length) {
      pc.innerHTML = '<div class="card-placeholder">+</div>';
      document.getElementById('playerTotal').innerHTML = '';
    } else {
      pc.innerHTML = h.map((r, i) => 
        `<div class="card ${getCardClass(r)}" onclick="app.removePlayer(0,${i})"><span class="card-value">${r}</span></div>`
      ).join('');
      const t = handTotal(h);
      const soft = isSoft(h);
      document.getElementById('playerTotal').innerHTML = `<span class="hand-total ${t > 21 ? 'bust' : soft ? 'soft' : ''}">${t}${soft && t < 21 ? ' SOFT' : ''}${t > 21 ? ' BUST' : ''}</span>`;
    }
  } else {
    if (!document.getElementById('splitBox0')) {
      handsRow.style.gridTemplateColumns = '1fr 1fr';
      handsRow.innerHTML = `
        <div class="hand-box" id="dealerBox" onclick="app.setTarget('dealer')">
          <span class="hand-label">DEALER</span>
          <div class="cards-container" id="dealerCards"></div>
          <div id="dealerTotal"></div>
        </div>
        <div class="hand-box" id="splitBox0" onclick="app.setActiveHand(0)">
          <span class="hand-label">HAND 1</span>
          <div class="cards-container" id="splitCards0"></div>
          <div id="splitTotal0"></div>
        </div>
        <div class="hand-box" style="grid-column:1/2" id="splitBox1" onclick="app.setActiveHand(1)">
          <span class="hand-label">HAND 2</span>
          <div class="cards-container" id="splitCards1"></div>
          <div id="splitTotal1"></div>
        </div>`;
    }

    document.getElementById('dealerBox').classList.toggle('active', state.target === 'dealer');
    document.getElementById('splitBox0').classList.toggle('active', state.activeHand === 0 && state.target === 'player');
    document.getElementById('splitBox1').classList.toggle('active', state.activeHand === 1 && state.target === 'player');

    const dc = document.getElementById('dealerCards');
    if (!state.dealerHand.length) {
      dc.innerHTML = '<div class="card-placeholder">+</div>';
      document.getElementById('dealerTotal').innerHTML = '';
    } else {
      dc.innerHTML = state.dealerHand.map((c, i) => 
        `<div class="card ${getCardClass(c.rank)}" onclick="app.removeDealer(${i})"><span class="card-value">${c.rank}</span></div>`
      ).join('');
      const t = handTotal(state.dealerHand.map(c => c.rank));
      document.getElementById('dealerTotal').innerHTML = `<span class="hand-total ${t > 21 ? 'bust' : ''}">${t}${t > 21 ? ' BUST' : ''}</span>`;
    }

    [0, 1].forEach(hi => {
      const h = state.playerHands[hi] || [];
      const cards = document.getElementById('splitCards' + hi);
      const total = document.getElementById('splitTotal' + hi);
      if (!cards) return;
      if (!h.length) {
        cards.innerHTML = '<div class="card-placeholder">+</div>';
        total.innerHTML = '';
      } else {
        cards.innerHTML = h.map((r, i) => 
          `<div class="card ${getCardClass(r)}" onclick="app.removePlayer(${hi},${i})"><span class="card-value">${r}</span></div>`
        ).join('');
        const t = handTotal(h);
        const soft = isSoft(h);
        total.innerHTML = `<span class="hand-total ${t > 21 ? 'bust' : soft ? 'soft' : ''}">${t}${soft && t < 21 ? ' SOFT' : ''}${t > 21 ? ' BUST' : ''}</span>`;
      }
    });
  }
  
  // Split controls
  const sc = document.getElementById('splitControls');
  const currentHand = state.playerHands[state.activeHand] || [];
  const canSplitHand = !state.isSplit && isPair(state.playerHands[0]);
  const canDoubleHand = !state.isSplit && currentHand.length === 2 && handTotal(currentHand) <= 21;

  if (canSplitHand && canDoubleHand) {
    sc.innerHTML = `<div style="display:flex;gap:4px">
      <button class="split-btn" style="flex:1" onclick="app.doSplit()">SPLIT ${state.playerHands[0][0]}s</button>
      <button class="split-btn" style="flex:1;background:rgba(212,170,40,0.1);border-color:var(--double);color:var(--double)" onclick="app.doDouble()">DOUBLE DOWN</button>
    </div>`;
  } else if (canSplitHand) {
    sc.innerHTML = `<button class="split-btn" onclick="app.doSplit()">SPLIT ${state.playerHands[0][0]}s</button>`;
  } else if (canDoubleHand) {
    sc.innerHTML = `<button class="split-btn" style="background:rgba(212,170,40,0.1);border-color:var(--double);color:var(--double)" onclick="app.doDouble()">DOUBLE DOWN</button>`;
  } else if (state.isSplit) {
    sc.innerHTML = `<div class="split-indicator">SPLIT ACTIVE · TAP HAND</div>`;
  } else {
    sc.innerHTML = '';
  }
  
  // Strategy display
  const up = state.dealerHand.length ? state.dealerHand[0].rank : null;
  const h = state.playerHands[state.activeHand];
  const bs = basicStrategy(h, up);
  const box = document.getElementById('strategyBox');
  const action = document.getElementById('strategyAction');
  const desc = document.getElementById('strategyDesc');
  const devLine = document.getElementById('deviationLine');
  const devAction = document.getElementById('deviationAction');
  const devPct = document.getElementById('deviationPct');

  const oldInsurance = document.getElementById('insuranceSuggestion');
  if (oldInsurance) oldInsurance.remove();

  if (bs && up && h.length) {
    action.textContent = bs.name;
    action.style.color = `var(${bs.cssVar})`;
    box.style.borderLeftColor = `var(${bs.cssVar})`;
    const t = handTotal(h);
    const handDesc = isPair(h) && !state.isSplit ? 'PAIR ' + h[0] + 's' : (isSoft(h) ? 'SOFT ' + t : 'HARD ' + t);
    desc.textContent = `${handDesc} vs ${up}`;

    const evStrat = getStrategy(h, up);
    if (evStrat) {
      const bsEV = evStrat.evs[bs.action];
      const bestEV = evStrat.bestEV;
      const gapPct = (bsEV != null && isFinite(bsEV) && isFinite(bestEV))
        ? Math.round((bestEV - bsEV) * 100) : 0;
      const liveIsDifferent = evStrat.action !== bs.action;

      if (liveIsDifferent && gapPct >= 2) {
        const liveMeta = ACTION_META[evStrat.action];
        devAction.textContent = liveMeta.name;
        devPct.textContent = '+' + gapPct + '%';
        devLine.className = 'deviation-line show ' + (gapPct >= 7 ? 'strong' : 'mild');
      } else {
        devLine.className = 'deviation-line';
      }
    }

    // Insurance suggestion
    if (shouldOfferInsurance()) {
      const insEV = insuranceEV();
      const color = insEV.recommended ? 'var(--cold)' : 'var(--red2)';
      const strength = insEV.strongRec ? 'STRONG ' : '';
      
      const insuranceDiv = document.createElement('div');
      insuranceDiv.id = 'insuranceSuggestion';
      insuranceDiv.style.cssText = 'margin-top:8px;padding:6px;background:rgba(0,0,0,0.2);border-radius:3px;border-left:3px solid ' + color;
      insuranceDiv.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:0.7rem;color:var(--label);text-transform:uppercase;">INSURANCE</span>
          <span style="font-family:Oswald;font-size:0.9rem;color:${color};">${strength}${insEV.recommended ? 'TAKE' : 'DECLINE'}</span>
        </div>
        <div style="display:flex;gap:12px;margin-top:4px;">
          <span style="font-size:0.65rem;color:var(--muted);">10-VALUE: ${(insEV.tenProb*100).toFixed(1)}%</span>
          <span style="font-size:0.65rem;color:var(--muted);">EV: ${insEV.ev > 0 ? '+' : ''}${(insEV.ev*100).toFixed(1)}%</span>
        </div>
        <div style="display:flex;gap:4px;margin-top:6px;">
          <button onclick="app.takeInsurance()" style="flex:1;padding:4px;background:rgba(46,184,184,0.15);border:1px solid var(--cold);color:var(--cold);font-size:0.6rem;text-transform:uppercase;">TAKE</button>
          <button onclick="app.declineInsurance()" style="flex:1;padding:4px;background:rgba(229,32,53,0.15);border:1px solid var(--red);color:var(--red2);font-size:0.6rem;text-transform:uppercase;">DECLINE</button>
        </div>
      `;
      box.appendChild(insuranceDiv);
    }
  } else {
    action.textContent = '-';
    action.style.color = 'var(--muted)';
    desc.textContent = !up ? 'SET DEALER CARD' : 'ADD YOUR CARDS';
    box.style.borderLeftColor = 'var(--hit)';
    devLine.className = 'deviation-line';
  }
  
  // Probabilities
  const tp = tenProb();
  const db = dealerBustProb(up);
  const pb = h && h.length ? playerBustProb(h) : 0;
  document.getElementById('prob10s').textContent = (tp * 100).toFixed(0) + '%';
  document.getElementById('prob10s').className = 'prob-value ' + (tp > 0.35 ? 'high' : tp > 0.28 ? 'mid' : 'low');
  document.getElementById('probDbust').textContent = (db * 100).toFixed(0) + '%';
  document.getElementById('probDbust').className = 'prob-value ' + (db > 0.4 ? 'high' : db > 0.3 ? 'mid' : 'low');
  document.getElementById('probPbust').textContent = (pb * 100).toFixed(0) + '%';
  document.getElementById('probPbust').className = 'prob-value ' + (pb > 0.5 ? 'high' : pb > 0.3 ? 'mid' : 'low');
  
  // Bet display
  const min = parseFloat(document.getElementById('minBet').value) || 10;
  const max = parseFloat(document.getElementById('maxBet').value) || 200;
  const bankroll = parseFloat(document.getElementById('bankroll').value) || CONFIG.STARTING_BANKROLL;
  const currentBankroll = bankroll + state.sessionProfit;
  const deficit = bankroll - currentBankroll;

  let mult = 1;
  if (tc > 3) mult = 8;
  else if (tc > 2.5) mult = 6;
  else if (tc > 1.5) mult = 4;
  else if (tc > 0.5) mult = 2;

  const inRecovery = deficit > 0 && tc > 1;
  let recoveryMult = 1;
  if (inRecovery) {
    const deficitRatio = Math.min(deficit / bankroll, 0.5);
    recoveryMult = 1 + deficitRatio * 2;
    recoveryMult = Math.round(recoveryMult * 10) / 10;
  }

  const totalMult = mult * recoveryMult;
  const liveBet = Math.min(Math.round(min * totalMult), max);
  const betVal = document.getElementById('betValue');

  if (state.confirmedBet) {
    betVal.textContent = '$' + state.confirmedBet.bet;
    betVal.style.color = state.confirmedBet.color;
    document.getElementById('betUnit').textContent = state.confirmedBet.unitLabel;
    const badge = document.getElementById('recoveryBadge');
    badge.className = 'bet-recovery-badge' + (state.confirmedBet.unitLabel.includes('×') ? ' show' : '');
  } else {
    betVal.textContent = '$' + liveBet;
    betVal.style.color = tc > 1 ? 'var(--hot)' : tc > 0 ? 'var(--gold)' : 'var(--cold)';
    const unitLabel = inRecovery ? `${mult.toFixed(1)}u ×${recoveryMult.toFixed(1)}` : `${mult.toFixed(1)}u`;
    document.getElementById('betUnit').textContent = unitLabel;
    const badge = document.getElementById('recoveryBadge');
    badge.className = 'bet-recovery-badge' + (inRecovery ? ' show' : '');
  }

  document.getElementById('handCounter').textContent = state.handCount;
}

function toggleMenu() {
  const m = document.getElementById('menuOverlay');
  m.classList.toggle('show');
  if (m.classList.contains('show')) {
    const bankroll = parseFloat(document.getElementById('bankroll').value) || CONFIG.STARTING_BANKROLL;
    const currentBankroll = bankroll + state.sessionProfit;
    const pnlColor = state.sessionProfit >= 0 ? 'var(--cold)' : 'var(--red2)';
    const pnlSign = state.sessionProfit >= 0 ? '+' : '';
    const wins = state.sessionLog.filter(h => h.result === 'win').length;
    const losses = state.sessionLog.filter(h => h.result === 'loss').length;
    const pushes = state.sessionLog.filter(h => h.result === 'push').length;
    
    document.getElementById('menuSession').innerHTML = `
      <div class="prob-row"><span class="prob-row-label">STARTING</span><span class="prob-row-value" style="color:var(--gold)">$${bankroll.toLocaleString()}</span></div>
      <div class="prob-row"><span class="prob-row-label">CURRENT</span><span class="prob-row-value" style="color:var(--white)">$${currentBankroll.toLocaleString()}</span></div>
      <div class="prob-row"><span class="prob-row-label">P&L</span><span class="prob-row-value" style="color:${pnlColor}">${pnlSign}$${state.sessionProfit.toLocaleString()}</span></div>
      <div class="prob-row"><span class="prob-row-label">HANDS</span><span class="prob-row-value" style="color:var(--white)">${state.handCount}</span></div>
      <div class="prob-row"><span class="prob-row-label">W / L / P</span><span class="prob-row-value"><span style="color:var(--cold)">${wins}</span> / <span style="color:var(--red2)">${losses}</span> / <span style="color:var(--muted)">${pushes}</span></span></div>`;

    const tp = tenProb();
    const db = dealerBustProb(state.dealerHand.length ? state.dealerHand[0].rank : null);
    const pb = state.playerHands[state.activeHand].length ? playerBustProb(state.playerHands[state.activeHand]) : 0;
    document.getElementById('menuProbs').innerHTML = `
      <div class="prob-row"><span class="prob-row-label">10-VALUE</span><div class="prob-bar"><div class="prob-fill" style="width:${tp*100}%;background:var(--gold)">${(tp*100).toFixed(0)}%</div></div><span class="prob-row-value">${(tp*100).toFixed(1)}%</span></div>
      <div class="prob-row"><span class="prob-row-label">DEALER BUST</span><div class="prob-bar"><div class="prob-fill" style="width:${db*100}%;background:var(--cold)">${(db*100).toFixed(0)}%</div></div><span class="prob-row-value">${(db*100).toFixed(1)}%</span></div>
      <div class="prob-row"><span class="prob-row-label">PLAYER BUST</span><div class="prob-bar"><div class="prob-fill" style="width:${pb*100}%;background:var(--red)">${(pb*100).toFixed(0)}%</div></div><span class="prob-row-value">${(pb*100).toFixed(1)}%</span></div>`;
    
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    document.getElementById('menuDeck').innerHTML = ranks.map(r => 
      `<div class="rem-item"><div class="rem-rank">${r}</div><div class="rem-count">${remainingOf(r)}</div></div>`
    ).join('');
  }
}