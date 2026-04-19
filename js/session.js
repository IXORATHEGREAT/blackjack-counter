// Session persistence and seed encoding

// Encode current session into a compact seed string
// Format: PREFIX-BANKROLL36-HAND1.HAND2...
// Each hand: {R}{BET36}{SIGN}{CUM36}_{PLAYER_CARDS}_{DEALER_CARDS}
function encodeSeed() {
  if (!state.sessionLog.length) return state.sessionSeedPrefix;
  const bankroll = parseFloat(document.getElementById('bankroll').value) || CONFIG.STARTING_BANKROLL;
  
  const handStrings = state.sessionLog.map(h => {
    const r = h.result === 'win' ? 'W' : h.result === 'loss' ? 'L' : 'P';
    const bet36 = Math.abs(h.bet).toString(36).toUpperCase();
    const sign = h.cumulative < 0 ? 'N' : 'P';
    const cum36 = Math.abs(h.cumulative).toString(36).toUpperCase();
    
    // Encode cards - use simple mapping
    const playerCardsStr = (h.playerCards || []).map(c => {
      if (c === '10') return 'T';
      return c;
    }).join('');
    
    const dealerCardsStr = (h.dealerCards || []).map(c => {
      if (c === '10') return 'T';
      return c;
    }).join('');
    
    // Format: W1AP1A_AK_KT
    return `${r}${bet36}${sign}${cum36}_${playerCardsStr}_${dealerCardsStr}`;
  });
  
  const parts = [
    state.sessionSeedPrefix,
    Math.round(bankroll).toString(36).toUpperCase(),
    handStrings.join('.')
  ];
  
  return parts.join('-');
}

function decodeSeed(seed) {
  try {
    const parts = seed.trim().toUpperCase().split('-');
    if (parts.length < 1) return null;
    
    const prefix = parts[0];
    const bankroll = parts.length >= 2 ? parseInt(parts[1], 36) : 4000;
    const hands = [];
    
    if (parts.length >= 3) {
      const entries = parts[2].split('.');
      let cumulative = 0;
      
      for (const entry of entries) {
        if (!entry) continue;
        
        // Split by underscore to get card data
        const [resultPart, playerCardsStr = '', dealerCardsStr = ''] = entry.split('_');
        
        if (!resultPart) continue;
        
        const result = resultPart[0] === 'W' ? 'win' : resultPart[0] === 'L' ? 'loss' : 'push';
        
        // Parse bet and cumulative
        const remaining = resultPart.slice(1);
        const nIdx = remaining.indexOf('N');
        const pIdx = remaining.indexOf('P');
        const signIdx = nIdx > 0 ? nIdx : pIdx > 0 ? pIdx : -1;
        
        let bet = 0;
        let handCumulative = 0;
        
        if (signIdx > 0) {
          bet = parseInt(remaining.slice(0, signIdx), 36);
          const neg = remaining[signIdx] === 'N';
          handCumulative = parseInt(remaining.slice(signIdx + 1), 36) * (neg ? -1 : 1);
        }
        
        cumulative = handCumulative; // Use the hand's cumulative directly
        
        // Decode cards
        const playerCards = playerCardsStr.split('').map(c => c === 'T' ? '10' : c);
        const dealerCards = dealerCardsStr.split('').map(c => c === 'T' ? '10' : c);
        
        // Calculate totals
        const playerTotal = handTotal(playerCards);
        const dealerTotal = handTotal(dealerCards);
        
        hands.push({
          result,
          bet,
          cumulative,
          tc: 0, // TC not stored in seed, will be estimated
          playerCards,
          playerTotal,
          dealerCards,
          dealerTotal
        });
      }
    }
    
    return { prefix, bankroll, hands };
  } catch (e) {
    console.error('Failed to decode seed:', e);
    return null;
  }
}

function saveSession() {
  const sessionData = {
    decks: state.decks,
    running: state.running,
    played: state.played,
    history: state.history.slice(-50),
    dealerHand: state.dealerHand,
    playerHands: state.playerHands,
    activeHand: state.activeHand,
    isSplit: state.isSplit,
    adjustments: state.adjustments,
    sessionProfit: state.sessionProfit,
    sessionLog: state.sessionLog,
    sessionSeed: state.sessionSeed,
    sessionSeedPrefix: state.sessionSeedPrefix,
    handCount: state.handCount,
    confirmedBet: state.confirmedBet,
    splitBets: state.splitBets,
    doubleDownHands: state.doubleDownHands,
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(sessionData));
    console.log('Session saved, hands:', state.sessionLog.length);
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

function loadSession() {
  try {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!saved) return false;
    const data = JSON.parse(saved);
    
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      return false;
    }
    
    state.decks = data.decks;
    state.running = data.running;
    state.played = data.played;
    state.history = data.history || [];
    state.dealerHand = data.dealerHand || [];
    state.playerHands = data.playerHands || [[]];
    state.activeHand = data.activeHand || 0;
    state.isSplit = data.isSplit || false;
    state.adjustments = data.adjustments || 0;
    state.sessionProfit = data.sessionProfit || 0;
    state.sessionLog = data.sessionLog || [];
    state.sessionSeed = data.sessionSeed || '';
    state.sessionSeedPrefix = data.sessionSeedPrefix || generateSeedPrefix();
    state.handCount = data.handCount || 0;
    state.confirmedBet = data.confirmedBet || null;
    state.splitBets = data.splitBets || [];
    state.doubleDownHands = data.doubleDownHands || [];
    
    console.log('Session loaded, hands:', state.sessionLog.length);
    renderUI();
    notify('SESSION RESTORED', 'WELCOME BACK');
    return true;
  } catch (e) {
    console.warn('Failed to load session:', e);
    return false;
  }
}

function clearSavedSession() {
  localStorage.removeItem(CONFIG.STORAGE_KEY);
}

function newShoe() {
  state.running = 0;
  state.history = [];
  state.redoStack = [];
  state.dealerHand = [];
  state.playerHands = [[]];
  state.activeHand = 0;
  state.isSplit = false;
  state.adjustments = 0;
  state.sessionProfit = 0;
  state.sessionLog = [];
  state.sessionSeedPrefix = generateSeedPrefix();
  state.sessionSeed = state.sessionSeedPrefix;
  state.handCount = 0;
  state.confirmedBet = null;
  state.splitBets = [];
  state.doubleDownHands = [];
  state.insuranceOffered = false;
  state.insuranceTaken = false;
  state.insuranceBet = 0;
  
  initPlayed();
  renderUI();
  saveSession();
  notify('NEW SHOE', state.decks + ' DECKS');
}

function resetHand() {
  state.dealerHand.forEach(c => { 
    const bucket = ['J', 'Q', 'K'].includes(c.rank) ? '10' : c.rank;
    state.played[c.suit][bucket]--; 
    state.running -= CONFIG.HI_LO[c.rank]; 
  });
  
  state.playerHands.forEach((h, hi) => {
    h.forEach(r => {
      const bucket = ['J', 'Q', 'K'].includes(r) ? '10' : r;
      for (let i = state.history.length - 1; i >= 0; i--) {
        if (state.history[i].type === 'player' && state.history[i].rank === r && state.history[i].hand === hi) {
          state.played[state.history[i].suit][bucket]--;
          state.running -= CONFIG.HI_LO[r];
          state.history.splice(i, 1);
          break;
        }
      }
    });
  });
  
  state.history = state.history.filter(h => h.type !== 'dealer');
  state.dealerHand = [];
  state.playerHands = [[]];
  state.activeHand = 0;
  state.isSplit = false;
  state.splitBets = [];
  state.doubleDownHands = [];
  
  renderUI();
  saveSession();
  notify('HAND RESET', 'CARDS RETURNED');
}