// Global state management
const state = {
  decks: 6,
  running: 0,
  played: {},
  history: [],
  redoStack: [],
  dealerHand: [],
  playerHands: [[]],
  activeHand: 0,
  isSplit: false,
  target: 'player',
  adjustments: 0,
  
  // Session tracking
  sessionProfit: 0,
  sessionLog: [],
  sessionSeed: '',
  sessionSeedPrefix: '',
  handCount: 0,
  confirmedBet: null,
  startingBankroll: CONFIG.STARTING_BANKROLL,
  
  // Split/double tracking
  splitBets: [],
  doubleDownHands: [],
  
  // Insurance
  insuranceOffered: false,
  insuranceTaken: false,
  insuranceBet: 0,
  
  // UI state
  notifTimer: null,
  pendingConfirmAction: null,
  viewerOpen: false,
  viewerReplayData: null
};

function initPlayed() {
  state.played = {};
  CONFIG.SUITS.forEach(s => {
    state.played[s] = {};
    // Only track unique buckets: A, 2-9, 10 (10 represents 10, J, Q, K)
    ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'].forEach(r => {
      state.played[s][r] = 0;
    });
  });
}

function generateSeedPrefix() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}