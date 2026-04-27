// Configuration and constants
const CONFIG = {
  STARTING_BANKROLL: 4000,
  STORAGE_KEY: 'bj_elite_session',
  SUITS: ['♠', '♥', '♦', '♣'],
  RANKS: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
  HI_LO: { 'A':-1, '2':1, '3':1, '4':1, '5':1, '6':1, '7':0, '8':0, '9':0, '10':-1, 'J':-1, 'Q':-1, 'K':-1 }
};

const ACTION_META = {
  'H': { name: 'HIT', cssVar: '--hit' },
  'S': { name: 'STAND', cssVar: '--stand' },
  'D': { name: 'DOUBLE', cssVar: '--double' },
  'P': { name: 'SPLIT', cssVar: '--split' },
  'R': { name: 'SURRENDER', cssVar: '--surr' }
};
