export const SAR_SEQUENCE = ['Ka', 'Chu', 'Fu', 'L']

export const SAR_INFO = {
  Ka: { name: 'Kadi', suit: 'clubs', symbol: '♣', color: 'text-neutral-900' },
  Chu: { name: 'Charkat', suit: 'diamonds', symbol: '♦', color: 'text-red-600' },
  Fu: { name: 'Fallai', suit: 'spades', symbol: '♠', color: 'text-neutral-900' },
  L: { name: 'Laal', suit: 'hearts', symbol: '♥', color: 'text-red-600' },
}

export const SUITS = ['clubs', 'diamonds', 'spades', 'hearts']

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
}

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 7
export const SESSION_HISTORY_LIMIT = 5
export const DISCONNECT_WAIT_SECONDS = 60

export const SESSION_STATUS = {
  LOBBY: 'lobby',
  ACTIVE: 'active',
  ENDED: 'ended',
}

export const PLAYER_STATUS = {
  ACTIVE: 'active',
  DISCONNECTED: 'disconnected',
  SPECTATOR: 'spectator',
}

export const ROUND_STATUS = {
  DEALING: 'dealing',
  CALLING: 'calling',
  PLAYING: 'playing',
  COMPLETE: 'complete',
}
