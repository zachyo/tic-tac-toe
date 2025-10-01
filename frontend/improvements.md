# Tic Tac Toe Contract Updates - V2

## New Features Added

### 1. Player Statistics System
- **Contract Functions:**
  - `get-player-statistics(player)` - Returns complete player stats
  - `get-win-percentage(player)` - Returns win percentage * 100 (e.g., 7500 = 75.00%)
  - `get-leaderboard-entry(player)` - Returns formatted leaderboard data (only for players with wins)

- **Stats Tracked:**
  - Total games played
  - Wins and losses
  - Total STX staked
  - Total STX won
  - Win percentage

### 2. Global Game History
- **Contract Function:** `get-global-game(game-id)` - Returns completed game data
- **Data Stored:** All completed games with timestamps, players, winners, and bet amounts

### 3. Game Timeout System
- **Timeout Duration:** 144 blocks (~24 hours)
- **Contract Functions:**
  - `can-cancel-game(game-id)` - Check if a game can be cancelled
  - `cancel-timed-out-game(game-id)` - Cancel timed-out game and refund both players
- **Rules:** Only the waiting player (not their turn) can cancel after timeout

### 4. Enhanced Game Logic
- **Draw Detection:** Automatically detects when board is full with no winner
- **Fund Distribution:** Winner takes all, draws return bets to both players
- **Game Cleanup:** Completed games are moved from active games to global history

## Frontend Implementation Guide

### Personal Stats Page
```javascript
// Get player statistics
const stats = await callReadOnlyFunction({
  contractName: "tic-tac-toe-v2",
  functionName: "get-player-statistics",
  functionArgs: [principalCV(playerAddress)]
});

// Get win percentage (divide by 100 for display)
const winPct = await callReadOnlyFunction({
  contractName: "tic-tac-toe-v2", 
  functionName: "get-win-percentage",
  functionArgs: [principalCV(playerAddress)]
});

// Display: winPct.value / 100 + "%"
```

### Global Leaderboard Page
```javascript
// For each player address, check leaderboard entry
const leaderboardEntry = await callReadOnlyFunction({
  contractName: "tic-tac-toe-v2",
  functionName: "get-leaderboard-entry", 
  functionArgs: [principalCV(playerAddress)]
});

// Filter out players with no wins (returns none)
// Sort by win percentage or total wins
```

### Game Timeout Handling
```javascript
// Check if game can be cancelled
const canCancel = await callReadOnlyFunction({
  contractName: "tic-tac-toe-v2",
  functionName: "can-cancel-game",
  functionArgs: [uintCV(gameId)]
});

// Show cancel button to waiting player if canCancel is true
// Call cancel-timed-out-game function
```

### Updated Game Data Structure
```javascript
// Active games now include:
{
  "player-one": principal,
  "player-two": optional principal,
  "is-player-one-turn": bool,
  "bet-amount": uint,
  "board": list of 9 uints,
  "winner": optional principal,
  "last-move-block": uint,    // NEW: For timeout tracking
  "created-at": uint          // NEW: Game creation timestamp
}
```

## UI/UX Recommendations

### Game Interface
- Show timeout countdown when it's opponent's turn
- Display "Cancel Game" button for waiting player after timeout
- Show game creation timestamp

### Stats Dashboard
- Personal stats: Games played, Win/Loss ratio, Total staked/won
- Win percentage as formatted percentage (75.00%)
- Total earnings in STX

### Leaderboard
- Only show players with at least 1 win
- Sort by win percentage (primary) or total wins (secondary)
- Display: Address, Games Played, Win%, Total Won

### Game History
- Show all completed games for a player
- Include: Opponent, Result, Bet Amount, Date played

## Important Notes

1. **Contract Name:** Updated to `tic-tac-toe-v2`
2. **Completed Games:** No longer stored in active games map after completion
3. **Draw Handling:** Both players get their bets back
4. **Timeout Blocks:** 144 blocks ≈ 24 hours (adjust display accordingly)
5. **Win Percentage:** Returned as integer * 100 (divide by 100 for display)

## Error Codes Added
- `ERR_GAME_TIMED_OUT (u105)`
- `ERR_CANNOT_CANCEL_YET (u106)` 
- `ERR_NOT_AUTHORIZED_TO_CANCEL (u107)`