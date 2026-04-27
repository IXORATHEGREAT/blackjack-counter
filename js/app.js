// Main application controller
const app = {
  // State accessors
  setDecks(d) {
    state.decks = d;
    document.querySelectorAll('.deck-btn').forEach((b, i) => {
      b.classList.toggle('active', [3, 6, 8][i] === d);
    });
    newShoe();
  },
  
  setTarget(t) {
    state.target = t;
    renderUI();
  },
  
  setActiveHand(hi) {
    state.activeHand = hi;
    state.target = 'player';
    renderUI();
  },
  
  // Card handling
  handleKey(r, v, isAdj) {
    if (isAdj) {
      const groups = {
        1: ['2', '3', '4', '5', '6'],
        0: ['7', '8', '9'],
        '-1': ['10', 'A'],  // '10' bucket covers 10/J/Q/K — don't list J/Q/K separately
      };
      const pool = groups[String(v)];
      
      const weightedPool = [];
      pool.forEach(rank => {
        const remaining = remainingOf(rank);
        for (let i = 0; i < remaining; i++) {
          // For display purposes, pick a random face for 10-value cards
          const displayRank = rank === '10'
            ? (['10', 'J', 'Q', 'K'])[Math.floor(Math.random() * 4)]
            : rank;
          weightedPool.push({ rank: displayRank, bucket: '10' === rank ? '10' : rank });
        }
      });
      
      if (!weightedPool.length) { notify('NO CARDS LEFT', 'FOR THIS GROUP'); return; }
      
      const pick = weightedPool[Math.floor(Math.random() * weightedPool.length)];
      const suit = CONFIG.SUITS.find(s => state.played[s][pick.bucket] < state.decks) || '♠';
      state.played[suit][pick.bucket]++;
      state.running += v;
      state.adjustments++;
      state.history.push({ type: 'adj', val: v, rank: pick.rank, suit, bucket: pick.bucket });
    } else {
      const currentHand = state.target === 'dealer' ? state.dealerHand : state.playerHands[state.activeHand];
      
      // FIXED: Double-down guard - block if hand already has 2+ cards (already got the double card)
      if (state.target === 'player' && state.doubleDownHands.includes(state.activeHand)) {
        if (currentHand && currentHand.length >= 2) {
          notify('DOUBLE DOWN LIMIT', 'ONLY ONE CARD ALLOWED');
          return;
        }
      }
      
      if (state.target === 'dealer') {
        if (state.dealerHand.length > 0) {
          const currentTotal = handTotal(state.dealerHand.map(c => c.rank));
          if (currentTotal > 21) { notify('BUST', 'HAND ALREADY BUST'); return; }
        }
      } else {
        if ((state.playerHands[state.activeHand] || []).length > 0) {
          const currentTotal = handTotal(state.playerHands[state.activeHand] || []);
          if (currentTotal > 21) { notify('BUST', 'HAND ALREADY BUST'); return; }
        }
      }

      const bucket = ['J', 'Q', 'K'].includes(r) ? '10' : r;
      const suit = CONFIG.SUITS.find(s => state.played[s][bucket] < state.decks) || '♠';
      if (state.played[suit][bucket] >= state.decks) { notify('NO CARDS LEFT'); return; }
      state.played[suit][bucket]++;
      state.running += CONFIG.HI_LO[r];
      state.history.push({ type: state.target === 'dealer' ? 'dealer' : 'player', rank: r, suit, hand: state.activeHand, bucket });
      
      if (state.target === 'dealer') {
        state.dealerHand.push({ rank: r, suit });
      } else {
        state.playerHands[state.activeHand].push(r);
      }
    }
    state.redoStack = [];
    renderUI();
    saveSession();
  },
  
  removeDealer(i) {
    const c = state.dealerHand.splice(i, 1)[0];
    const bucket = ['J', 'Q', 'K'].includes(c.rank) ? '10' : c.rank;
    state.played[c.suit][bucket]--;
    state.running -= CONFIG.HI_LO[c.rank];
    for (let j = state.history.length - 1; j >= 0; j--) {
      if (state.history[j].type === 'dealer' && state.history[j].rank === c.rank && state.history[j].suit === c.suit) {
        state.history.splice(j, 1);
        break;
      }
    }
    renderUI();
    saveSession();
  },
  
  removePlayer(hi, i) {
    const r = state.playerHands[hi].splice(i, 1)[0];
    const bucket = ['J', 'Q', 'K'].includes(r) ? '10' : r;
    for (let j = state.history.length - 1; j >= 0; j--) {
      if (state.history[j].type === 'player' && state.history[j].rank === r && state.history[j].hand === hi) {
        state.played[state.history[j].suit][bucket]--;
        state.running -= CONFIG.HI_LO[r];
        state.history.splice(j, 1);
        break;
      }
    }
    if (state.isSplit && state.playerHands[hi].length === 0) {
      const survivingHand = 1 - hi;
      state.isSplit = false;
      state.playerHands = [state.playerHands[survivingHand] || []];
      state.activeHand = 0;
      // Remap doubleDownHands: if surviving hand was doubled, preserve that
      state.doubleDownHands = state.doubleDownHands.includes(survivingHand) ? [0] : [];
      state.splitBets = [];
    }
    renderUI();
    saveSession();
  },
  
  // Actions
  undo() {
    if (!state.history.length) { notify('NOTHING TO UNDO'); return; }
    const last = state.history.pop();
    state.redoStack.push(last);
    
    if (last.type === 'adj') {
      state.running -= last.val;
      if (last.rank) state.played[last.suit][last.bucket]--;
      state.adjustments--;
    } else if (last.type === 'split') {
      // Reverse the split: merge both hands back into one pair
      state.isSplit = false;
      state.playerHands = [[last.card, last.card]];
      state.activeHand = 0;
      state.splitBets = [];
      state.doubleDownHands = [];
    } else if (last.type === 'dealer') {
      const idx = state.dealerHand.findIndex(c => c.rank === last.rank && c.suit === last.suit);
      if (idx >= 0) state.dealerHand.splice(idx, 1);
      const bucket = ['J', 'Q', 'K'].includes(last.rank) ? '10' : last.rank;
      state.played[last.suit][bucket]--;
      state.running -= CONFIG.HI_LO[last.rank];
    } else if (last.type === 'player') {
      const idx = state.playerHands[last.hand].lastIndexOf(last.rank);
      if (idx >= 0) state.playerHands[last.hand].splice(idx, 1);
      const bucket = ['J', 'Q', 'K'].includes(last.rank) ? '10' : last.rank;
      state.played[last.suit][bucket]--;
      state.running -= CONFIG.HI_LO[last.rank];
    }
    
    renderUI();
    saveSession();
    notify('UNDO');
  },
  
  redo() {
    if (!state.redoStack.length) { notify('NOTHING TO REDO'); return; }
    const last = state.redoStack.pop();
    
    if (last.type === 'adj') {
      state.running += last.val;
      if (last.rank) state.played[last.suit][last.bucket]++;
      state.adjustments++;
    } else if (last.type === 'split') {
      // Re-apply the split and re-trigger the bet popup so bets are properly set
      state.playerHands = [[last.card], [last.card]];
      state.activeHand = 0;
      state.isSplit = true;
      state.splitBets = [];
      state.doubleDownHands = [];
      state.history.push(last);
      renderUI();
      saveSession();
      notify('REDO');
      showBetAdjPopup('split');
      return;
    } else if (last.type === 'dealer') {
      const bucket = ['J', 'Q', 'K'].includes(last.rank) ? '10' : last.rank;
      state.played[last.suit][bucket]++;
      state.running += CONFIG.HI_LO[last.rank];
      state.dealerHand.push({ rank: last.rank, suit: last.suit });
    } else if (last.type === 'player') {
      const bucket = ['J', 'Q', 'K'].includes(last.rank) ? '10' : last.rank;
      state.played[last.suit][bucket]++;
      state.running += CONFIG.HI_LO[last.rank];
      state.playerHands[last.hand].push(last.rank);
    }
    state.history.push(last);
    renderUI();
    saveSession();
    notify('REDO');
  },
  
  clearTarget() {
    if (state.target === 'dealer') {
      state.dealerHand.forEach(c => { 
        const bucket = ['J', 'Q', 'K'].includes(c.rank) ? '10' : c.rank;
        state.played[c.suit][bucket]--; 
        state.running -= CONFIG.HI_LO[c.rank]; 
      });
      state.dealerHand = [];
      state.history = state.history.filter(h => h.type !== 'dealer');
      notify('DEALER CLEARED');
    } else {
      state.playerHands[state.activeHand].forEach(r => {
        const bucket = ['J', 'Q', 'K'].includes(r) ? '10' : r;
        for (let i = state.history.length - 1; i >= 0; i--) {
          if (state.history[i].type === 'player' && state.history[i].rank === r && state.history[i].hand === state.activeHand) {
            state.played[state.history[i].suit][bucket]--;
            state.running -= CONFIG.HI_LO[r];
            state.history.splice(i, 1);
            break;
          }
        }
      });
      state.playerHands[state.activeHand] = [];
      notify('HAND CLEARED');
    }
    state.redoStack = [];
    renderUI();
    saveSession();
  },
  
  doSplit() {
    if (!isPair(state.playerHands[0])) return;
    
    const card = state.playerHands[0][0];
    const baseBet = state.confirmedBet ? state.confirmedBet.bet : calcSuggestedBet().bet;
    
    state.playerHands = [[card], [card]];
    state.activeHand = 0;
    state.isSplit = true;
    state.splitBets = [baseBet, baseBet];
    
    // Push a split marker so undo() can reverse the split cleanly
    state.history.push({ type: 'split', card });
    state.redoStack = [];
    
    renderUI();
    notify('PAIR SPLIT', card + 's');
    showBetAdjPopup('split');
  },
  
  doDouble() {
    const hand = state.playerHands[state.activeHand];
    if (!hand || hand.length !== 2) {
      notify('CANNOT DOUBLE', 'NEED EXACTLY 2 CARDS');
      return;
    }
    
    const total = handTotal(hand);
    if (total > 21) {
      notify('CANNOT DOUBLE', 'HAND ALREADY BUST');
      return;
    }
    
    // FIXED: Only mark as doubled after bet confirmation
    // The flag will be set in confirmAdjBet() for double type
    showBetAdjPopup('double');
  },
  
  next() {
    console.log('NEXT pressed - dealerHand:', state.dealerHand, 'playerHands:', state.playerHands);
    
    const outcomes = [];
    let totalHandResult = 0;
    let lastOutcome = null;
    let lastBet = null;
    
    // FIXED: Process insurance regardless of dealer hand length
    // Check if dealer has blackjack (A + 10-value) with any number of cards
    if (state.insuranceTaken && state.dealerHand.length >= 2) {
      const dealerCards = state.dealerHand.map(c => c.rank);
      const hasAce = dealerCards.includes('A');
      const hasTen = dealerCards.some(c => ['10', 'J', 'Q', 'K'].includes(c));
      const dTotal = handTotal(dealerCards);
      
      // Dealer blackjack is exactly 21 with 2 cards (A + 10)
      // But we should still pay insurance if dealer has blackjack regardless of card count
      if (dTotal === 21 && hasAce && hasTen) {
        const insuranceWin = state.insuranceBet * 2;
        state.sessionProfit += insuranceWin;
        notify('INSURANCE WINS!', '+$' + insuranceWin);
      }
    }
    state.insuranceTaken = false;
    state.insuranceBet = 0;
    
    if (state.isSplit) {
      console.log('Processing split hands');
      state.playerHands.forEach((hand, idx) => {
        if (!hand.length) return;
        const handOutcome = autoDetectResultForHand(hand, idx);
        console.log(`Hand ${idx}: ${hand.join(' ')} = ${handTotal(hand)}, outcome: ${handOutcome}`);
        if (handOutcome) {
          const handBet = state.splitBets[idx] || (state.confirmedBet ? state.confirmedBet.bet / 2 : calcSuggestedBet().bet);
          const resultAmount = calculateHandResult(handOutcome, handBet, state.doubleDownHands.includes(idx));
          outcomes.push({ hand: idx, outcome: handOutcome, bet: handBet, result: resultAmount });
          totalHandResult += resultAmount;
        }
      });
      
      if (outcomes.length > 0) {
        const netResult = totalHandResult;
        const outcome = netResult > 0 ? 'win' : netResult < 0 ? 'loss' : 'push';
        const totalBet = outcomes.reduce((sum, o) => sum + o.bet, 0);
        
        state.sessionProfit += netResult;
        lastOutcome = outcome;
        lastBet = Math.abs(netResult);
        
        const pHands = state.playerHands.map(h => [...h]);
        const dHand = state.dealerHand.map(c => c.rank);
        
        // FIXED: Log both hand totals properly
        const playerTotals = pHands.map(h => handTotal(h));
        
        state.sessionLog.push({
          result: outcome,
          bet: Math.abs(netResult),
          cumulative: state.sessionProfit,
          tc: parseFloat(trueCount().toFixed(1)),
          playerCards: pHands.flat(),
          playerTotal: playerTotals.join('/'), // Show both totals
          dealerCards: [...dHand],
          dealerTotal: handTotal(dHand),
          splitDetails: outcomes
        });
        
        state.handCount++;
        notify(outcome.toUpperCase(), (netResult >= 0 ? '+' : '') + '$' + Math.abs(netResult));
      } else {
        state.handCount++;
        notify('NEXT HAND', 'HAND #' + state.handCount);
      }
    } else {
      console.log('Processing single hand');
      const outcome = autoDetectResult();
      console.log('Single hand outcome:', outcome);
      
      if (outcome) {
        // confirmedBet.bet is already the doubled amount (set in confirmAdjBet), so don't multiply again
        const bet = state.confirmedBet?.bet || calcSuggestedBet().bet;
        const resultAmount = outcome === 'win' ? bet : outcome === 'loss' ? -bet : 0;
        state.sessionProfit += resultAmount;
        
        const pHand = [...(state.playerHands[state.activeHand] || [])];
        const dHand = state.dealerHand.map(c => c.rank);
        
        console.log('Logging hand:', { pHand, dHand, playerTotal: handTotal(pHand), dealerTotal: handTotal(dHand) });
        
        state.sessionLog.push({
          result: outcome,
          bet: outcome === 'push' ? 0 : bet,
          cumulative: state.sessionProfit,
          tc: parseFloat(trueCount().toFixed(1)),
          playerCards: pHand,
          playerTotal: handTotal(pHand),
          dealerCards: dHand,
          dealerTotal: handTotal(dHand),
        });
        
        console.log('sessionLog now has', state.sessionLog.length, 'entries');
        
        state.handCount++;
        lastOutcome = outcome;
        lastBet = bet;
        notify(outcome.toUpperCase(), (outcome === 'win' ? '+' : outcome === 'loss' ? '-' : '') + '$' + bet);
      } else {
        state.handCount++;
        notify('NEXT HAND', 'HAND #' + state.handCount);
        lastBet = state.confirmedBet ? state.confirmedBet.bet : null;
      }
    }
    
    state.sessionSeed = encodeSeed();
    const seedDisplayEl = document.getElementById('seedDisplay');
    if (seedDisplayEl) seedDisplayEl.textContent = state.sessionSeed;
    
    // Clear for next hand
    state.dealerHand = [];
    state.playerHands = [[]];
    state.activeHand = 0;
    state.isSplit = false;
    state.splitBets = [];
    state.doubleDownHands = [];
    state.redoStack = [];
    state.confirmedBet = null;
    
    this.setTarget('player');
    renderUI();
    saveSession();
    
    showBetPopup(lastBet, lastOutcome);
  },
  
  // Confirm dialogs
  confirmAction(action) {
    const titles = {
      clear: 'CLEAR CARDS?',
      newShoe: 'NEW SHOE?',
      resetHand: 'RESET HAND?',
    };
    const subs = {
      clear: 'Removes all cards from active target.',
      newShoe: 'Resets the entire session and count.',
      resetHand: 'Returns all hand cards to the shoe.',
    };
    state.pendingConfirmAction = action;
    document.getElementById('confirmTitle').textContent = titles[action] || 'ARE YOU SURE?';
    document.getElementById('confirmSub').textContent = subs[action] || 'This cannot be undone.';
    document.getElementById('confirmOverlay').classList.add('show');
  },
  
  confirmCancel() {
    state.pendingConfirmAction = null;
    document.getElementById('confirmOverlay').classList.remove('show');
  },
  
  confirmProceed() {
    document.getElementById('confirmOverlay').classList.remove('show');
    const action = state.pendingConfirmAction;
    state.pendingConfirmAction = null;
    if (action === 'clear') { this.clearTarget(); }
    else if (action === 'newShoe') { newShoe(); this.toggleMenu(); }
    else if (action === 'resetHand') { resetHand(); this.toggleMenu(); }
  },
  
  confirmBet() {
    const overlay = document.getElementById('betPopupOverlay');
    const manualInput = document.getElementById('popupManualBet');
    const manualVal = parseFloat(manualInput.value);
    const max = parseFloat(document.getElementById('maxBet').value) || 200;

    let finalBet, finalUnits, finalColor;
    if (manualVal && manualVal > 0) {
      finalBet = Math.min(Math.round(manualVal), max);
      finalUnits = 'MANUAL';
      finalColor = 'var(--white2)';
    } else {
      finalBet = overlay._pendingBet;
      finalUnits = overlay._pendingUnits;
      finalColor = overlay._pendingColor;
    }

    state.confirmedBet = { bet: finalBet, unitLabel: finalUnits, color: finalColor };
    manualInput.value = '';
    overlay.classList.remove('show');
    renderUI();
    saveSession();
  },
  
  confirmAdjBet() {
    const overlay = document.getElementById('betAdjPopupOverlay');
    const manualInput = document.getElementById('adjPopupManualBet');
    const manualVal = parseFloat(manualInput.value);
    const max = parseFloat(document.getElementById('maxBet').value) || 200;
    const type = overlay._pendingType;

    let finalBet;
    if (manualVal && manualVal > 0) {
      finalBet = Math.min(Math.round(manualVal), max * 2);
    } else {
      finalBet = overlay._pendingBet;
    }

    if (type === 'split') {
      const perHandBet = Math.floor(finalBet / 2);
      state.splitBets = [perHandBet, perHandBet];
      state.confirmedBet = {
        bet: finalBet,
        unitLabel: 'SPLIT BET (2×$' + perHandBet + ')',
        color: 'var(--hot)',
      };
    } else {
      // FIXED: Set doubleDownHands flag here after confirmation
      state.doubleDownHands.push(state.activeHand);
      state.confirmedBet = {
        bet: finalBet,
        unitLabel: 'DOUBLE BET',
        color: 'var(--hot)',
      };
    }

    manualInput.value = '';
    overlay.classList.remove('show');
    renderUI();
    saveSession();
  },
  
  // Insurance
  takeInsurance() { takeInsurance(); },
  declineInsurance() { declineInsurance(); },
  
  // Menu & Viewer
  toggleMenu() { toggleMenu(); },
  closeMenu(e) { if (e.target === document.getElementById('menuOverlay')) this.toggleMenu(); },
  
  toggleViewer() {
    state.viewerOpen = !state.viewerOpen;
    const overlay = document.getElementById('viewerOverlay');
    if (overlay) {
      overlay.classList.toggle('show', state.viewerOpen);
    }
    if (state.viewerOpen) {
      state.viewerReplayData = null;
      this.renderViewer();
    }
  },
  
  renderViewer() {
    console.log('renderViewer called');
    
    const data = state.viewerReplayData || null;
    const displaySeed = data ? data._rawSeed : state.sessionSeed;
    const seedEl = document.getElementById('seedDisplay');
    if (seedEl) seedEl.textContent = displaySeed || '--------';

    const log = data ? data.hands : state.sessionLog;
    console.log('Log data:', log);
    
    const profit = log.length ? log[log.length - 1].cumulative : 0;
    const wins = log.filter(h => h.result === 'win').length;
    const losses = log.filter(h => h.result === 'loss').length;
    const pushes = log.filter(h => h.result === 'push').length;
    const total = wins + losses + pushes;
    const pnlColor = profit >= 0 ? 'var(--cold)' : 'var(--red2)';
    const pnlSign = profit >= 0 ? '+' : '';

    const statsEl = document.getElementById('viewerStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="vstat"><span class="vstat-label">HANDS</span><span class="vstat-value">${total}</span></div>
        <div class="vstat"><span class="vstat-label">WIN</span><span class="vstat-value" style="color:var(--cold)">${wins}</span></div>
        <div class="vstat"><span class="vstat-label">LOSS</span><span class="vstat-value" style="color:var(--red2)">${losses}</span></div>
        <div class="vstat"><span class="vstat-label">PUSH</span><span class="vstat-value" style="color:var(--muted)">${pushes}</span></div>
        <div class="vstat"><span class="vstat-label">P&L</span><span class="vstat-value" style="color:${pnlColor}">${pnlSign}$${Math.abs(profit)}</span></div>
      `;
    }

    this.drawSessionChart(log);

    const logEl = document.getElementById('viewerLog');
    if (!logEl) return;
    
    if (!log.length) {
      logEl.innerHTML = '<div style="color:var(--muted);text-align:center;padding:24px;font-size:0.75rem;letter-spacing:0.1em;">NO HANDS RECORDED YET</div>';
      return;
    }
    
    logEl.innerHTML = [...log].reverse().map((h, i) => {
      const idx = log.length - i;
      const col = h.result === 'win' ? 'var(--cold)' : h.result === 'loss' ? 'var(--red2)' : 'var(--muted)';
      const sign = h.result === 'win' ? '+' : h.result === 'loss' ? '-' : '±';
      const cumSign = h.cumulative >= 0 ? '+' : '';
      const cumCol = h.cumulative >= 0 ? 'var(--cold)' : 'var(--red2)';
      const pCards = (h.playerCards || []).join(' ') || '—';
      const dCards = (h.dealerCards || []).join(' ') || '—';
      const tcValue = h.tc || 0;
      
      return `
        <div class="log-row">
          <div class="log-num">#${idx}</div>
          <div class="log-cards">
            <div class="log-hand"><span class="log-who">P</span><span class="log-hand-cards">${pCards}</span><span class="log-total">${h.playerTotal || 0}</span></div>
            <div class="log-hand"><span class="log-who">D</span><span class="log-hand-cards">${dCards}</span><span class="log-total">${h.dealerTotal || 0}</span></div>
          </div>
          <div class="log-meta">
            <span class="log-tc">TC ${tcValue >= 0 ? '+' : ''}${tcValue.toFixed(1)}</span>
            <span class="log-result" style="color:${col}">${h.result.toUpperCase()}</span>
            <span class="log-pnl" style="color:${col}">${sign}$${Math.abs(h.bet)}</span>
            <span class="log-cum" style="color:${cumCol}">${cumSign}$${h.cumulative}</span>
          </div>
        </div>`;
    }).join('');
    
    console.log('Viewer rendered with', log.length, 'hands');
  },
  
  drawSessionChart(log) {
    log = log || state.sessionLog;
    const canvas = document.getElementById('sessionChart');
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    
    if (w === 0 || h === 0) return;
    
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const points = [0, ...log.map(e => e.cumulative)];

    if (points.length < 2) {
      ctx.fillStyle = 'rgba(136,152,136,0.45)';
      ctx.font = '500 11px Barlow Condensed';
      ctx.textAlign = 'center';
      ctx.fillText('RECORD A HAND TO SEE THE CHART', w / 2, h / 2);
      return;
    }

    const pad = { t: 12, r: 8, b: 20, l: 42 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const minV = Math.min(0, ...points);
    const maxV = Math.max(0, ...points);
    const range = maxV - minV || 1;
    const xS = i => pad.l + (i / (points.length - 1)) * cw;
    const yS = v => pad.t + ch - ((v - minV) / range) * ch;
    const zero = yS(0);

    // Zero line
    ctx.strokeStyle = 'rgba(136,152,136,0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, zero);
    ctx.lineTo(pad.l + cw, zero);
    ctx.stroke();
    ctx.setLineDash([]);

    // Fill
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = xS(i), x2 = xS(i + 1), y1 = yS(points[i]), y2 = yS(points[i + 1]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, zero);
      ctx.lineTo(x1, zero);
      ctx.closePath();
      ctx.fillStyle = points[i + 1] >= 0 ? 'rgba(46,184,184,0.13)' : 'rgba(229,32,53,0.13)';
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    ctx.lineWidth = 2;
    points.forEach((v, i) => {
      i === 0 ? ctx.moveTo(xS(i), yS(v)) : ctx.lineTo(xS(i), yS(v));
    });
    const last = points[points.length - 1];
    ctx.strokeStyle = last >= 0 ? '#2eb8b8' : '#e52035';
    ctx.stroke();

    // Dots
    points.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(xS(i), yS(v), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = v >= 0 ? '#2eb8b8' : '#e52035';
      ctx.fill();
    });

    // Y labels
    ctx.fillStyle = 'rgba(136,152,136,0.65)';
    ctx.font = '500 9px Barlow Condensed';
    ctx.textAlign = 'right';
    const yLabels = [...new Set([minV, 0, maxV])];
    yLabels.forEach(v => {
      ctx.fillText((v >= 0 ? '+' : '') + '$' + v, pad.l - 4, yS(v) + 3);
    });

    // X labels
    ctx.fillStyle = 'rgba(136,152,136,0.5)';
    ctx.textAlign = 'center';
    ctx.font = '500 9px Barlow Condensed';
    const step = Math.max(1, Math.floor((points.length - 1) / 5));
    for (let i = 0; i < points.length; i += step) {
      ctx.fillText(i === 0 ? 'START' : '#' + i, xS(i), h - pad.b + 12);
    }
    if ((points.length - 1) % step !== 0) {
      ctx.fillText('#' + (points.length - 1), xS(points.length - 1), h - pad.b + 12);
    }
  },
  
  copySeed() {
    const seed = state.sessionSeed || state.sessionSeedPrefix;
    if (!seed) return;
    navigator.clipboard.writeText(seed).then(() => notify('SEED COPIED', seed.slice(0, 8) + '...')).catch(() => {
      const el = document.createElement('textarea');
      el.value = seed;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      notify('SEED COPIED', '');
    });
  },
  
  loadSeed() {
    const input = document.getElementById('seedInput').value.trim();
    if (!input) { 
      notify('NO SEED', 'PASTE A SEED FIRST'); 
      return; 
    }
    
    const decoded = decodeSeed(input);
    if (!decoded || !decoded.hands || !decoded.hands.length) {
      notify('INVALID SEED', 'CHECK AND RETRY');
      return;
    }
    
    decoded._rawSeed = input;
    state.viewerReplayData = decoded;
    document.getElementById('seedInput').value = '';
    
    // Ensure the viewer is open
    if (!state.viewerOpen) {
      this.toggleViewer();
    } else {
      this.renderViewer();
    }
    
    notify('SEED LOADED', decoded.hands.length + ' HANDS');
  },
  
  // Init
  init() {
    console.log('App initializing...');
    initPlayed();
    buildKeypad();
    
    const loaded = loadSession();
    if (!loaded) {
      state.sessionSeedPrefix = generateSeedPrefix();
      state.sessionSeed = state.sessionSeedPrefix;
      state.startingBankroll = parseFloat(document.getElementById('bankroll').value) || CONFIG.STARTING_BANKROLL;
    }
    
    renderUI();
    this.setTarget('player');
    setInterval(saveSession, 30000);
    window.addEventListener('beforeunload', saveSession);
    console.log('App initialized, sessionLog:', state.sessionLog);
  }
};

// Start the app
app.init();