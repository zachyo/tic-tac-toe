import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;
const charlie = accounts.get("wallet_3")!;

// Helper function to create a new game with the given bet amount, move index, and move
// on behalf of the `user` address
function createGame(
  betAmount: number,
  moveIndex: number,
  move: number,
  user: string
) {
  return simnet.callPublicFn(
    "tic-tac-toe-v2",
    "create-game",
    [Cl.uint(betAmount), Cl.uint(moveIndex), Cl.uint(move)],
    user
  );
}

// Helper function to join a game with the given move index and move on behalf of the `user` address
function joinGame(gameId: number, moveIndex: number, move: number, user: string) {
  return simnet.callPublicFn(
    "tic-tac-toe-v2",
    "join-game",
    [Cl.uint(gameId), Cl.uint(moveIndex), Cl.uint(move)],
    user
  );
}

// Helper function to play a move with the given move index and move on behalf of the `user` address
function play(gameId: number, moveIndex: number, move: number, user: string) {
  return simnet.callPublicFn(
    "tic-tac-toe-v2",
    "play",
    [Cl.uint(gameId), Cl.uint(moveIndex), Cl.uint(move)],
    user
  );
}

// Helper function to cancel a timed-out game
function cancelTimedOutGame(gameId: number, user: string) {
  return simnet.callPublicFn(
    "tic-tac-toe-v2",
    "cancel-timed-out-game",
    [Cl.uint(gameId)],
    user
  );
}

// Helper function to get player statistics
function getPlayerStats(player: string) {
  return simnet.callReadOnlyFn(
    "tic-tac-toe-v2",
    "get-player-statistics",
    [Cl.principal(player)],
    player
  );
}

// Helper function to get win percentage
function getWinPercentage(player: string) {
  return simnet.callReadOnlyFn(
    "tic-tac-toe-v2",
    "get-win-percentage",
    [Cl.principal(player)],
    player
  );
}

// Helper function to get leaderboard entry
function getLeaderboardEntry(player: string) {
  return simnet.callReadOnlyFn(
    "tic-tac-toe-v2",
    "get-leaderboard-entry",
    [Cl.principal(player)],
    player
  );
}

// Helper function to check if game can be cancelled
function canCancelGame(gameId: number) {
  return simnet.callReadOnlyFn(
    "tic-tac-toe-v2",
    "can-cancel-game",
    [Cl.uint(gameId)],
    alice
  );
}

// Helper to advance blocks for timeout testing
function advanceBlocks(count: number) {
  for (let i = 0; i < count; i++) {
    simnet.mineEmptyBlock();
  }
}

describe("Enhanced Tic Tac Toe Tests", () => {
  
  // Original tests updated for new contract structure
  it("allows game creation", () => {
    const { result, events } = createGame(100, 0, 1, alice);

    expect(result).toBeOk(Cl.uint(0));
    expect(events.length).toBe(2); // print_event and stx_transfer_event
  });

  it("allows game joining", () => {
    createGame(100, 0, 1, alice);
    const { result, events } = joinGame(0, 1, 2, bob);

    expect(result).toBeOk(Cl.uint(0));
    expect(events.length).toBe(2); // print_event and stx_transfer_event
  });

  it("allows game playing", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 1, 2, bob);
    const { result, events } = play(0, 2, 1, alice);

    expect(result).toBeOk(Cl.uint(0));
    expect(events.length).toBe(1); // print_event
  });

  it("does not allow creating a game with a bet amount of 0", () => {
    const { result } = createGame(0, 0, 1, alice);
    expect(result).toBeErr(Cl.uint(100));
  });

  it("does not allow joining a game that has already been joined", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 1, 2, bob);

    const { result } = joinGame(0, 1, 2, charlie);
    expect(result).toBeErr(Cl.uint(103));
  });

  it("does not allow an out of bounds move", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 1, 2, bob);

    const { result } = play(0, 10, 1, alice);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("does not allow a non X or O move", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 1, 2, bob);

    const { result } = play(0, 2, 3, alice);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("does not allow moving on an occupied spot", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 1, 2, bob);

    const { result } = play(0, 1, 1, alice);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("allows player one to win and updates stats", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 3, 2, bob);
    play(0, 1, 1, alice);
    play(0, 4, 2, bob);
    const { result, events } = play(0, 2, 1, alice);

    expect(result).toBeOk(Cl.uint(0));
    expect(events.length).toBe(2); // print_event and stx_transfer_event

    // Game should be removed from active games map after completion
    const gameData = simnet.getMapEntry("tic-tac-toe-v2", "games", Cl.uint(0));
    expect(gameData).toBeNone();

    // Check global games map exists
    const globalGame = simnet.getMapEntry("tic-tac-toe-v2", "global-games", Cl.uint(0));
    expect(globalGame).toBeSome(expect.any(Object));

    // Check player statistics
    const aliceStats = getPlayerStats(alice);
    expect(aliceStats.result).toBeSome(
      Cl.tuple({
        "total-games": Cl.uint(1),
        "wins": Cl.uint(1),
        "losses": Cl.uint(0),
        "total-staked": Cl.uint(100),
        "total-won": Cl.uint(200)
      })
    );

    const bobStats = getPlayerStats(bob);
    expect(bobStats.result).toBeSome(
      Cl.tuple({
        "total-games": Cl.uint(1),
        "wins": Cl.uint(0),
        "losses": Cl.uint(1),
        "total-staked": Cl.uint(100),
        "total-won": Cl.uint(0)
      })
    );
  });

  it("allows player two to win and updates stats", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 3, 2, bob);
    play(0, 1, 1, alice);
    play(0, 4, 2, bob);
    play(0, 8, 1, alice);
    const { result, events } = play(0, 5, 2, bob);

    expect(result).toBeOk(Cl.uint(0));
    expect(events.length).toBe(2); // print_event and stx_transfer_event

    // Check bob won
    const bobStats = getPlayerStats(bob);
    expect(bobStats.result).toBeSome(
      Cl.tuple({
        "total-games": Cl.uint(1),
        "wins": Cl.uint(1),
        "losses": Cl.uint(0),
        "total-staked": Cl.uint(100),
        "total-won": Cl.uint(200)
      })
    );
  });

  // New tests for enhanced features
  it("handles draw games correctly", () => {
    createGame(100, 0, 1, alice); // X at 0
    joinGame(0, 4, 2, bob);       // O at 4 (center)
    play(0, 2, 1, alice);         // X at 2
    play(0, 1, 2, bob);           // O at 1
    play(0, 3, 1, alice);         // X at 3
    play(0, 5, 2, bob);           // O at 5
    play(0, 7, 1, alice);         // X at 7
    play(0, 6, 2, bob);           // O at 6
    const { result } = play(0, 8, 1, alice); // X at 8 - board full, draw

    expect(result).toBeOk(Cl.uint(0));

    // Both players should get their bets back in a draw
    const aliceStats = getPlayerStats(alice);
    const bobStats = getPlayerStats(bob);
    
    // Both should have 1 loss (or you could modify contract to track draws separately)
    expect(aliceStats.result).toBeSome(
      Cl.tuple({
        "total-games": Cl.uint(1),
        "wins": Cl.uint(0),
        "losses": Cl.uint(1),
        "total-staked": Cl.uint(100),
        "total-won": Cl.uint(100) // Got bet back
      })
    );
  });

  it("calculates win percentage correctly", () => {
    // Alice wins 2 out of 3 games
    createGame(100, 0, 1, alice);
    joinGame(0, 3, 2, bob);
    play(0, 1, 1, alice);
    play(0, 4, 2, bob);
    play(0, 2, 1, alice); // Alice wins

    createGame(100, 0, 1, alice);
    joinGame(1, 3, 2, bob);
    play(1, 1, 1, alice);
    play(1, 4, 2, bob);
    play(1, 6, 1, alice);
    play(1, 5, 2, bob); // Bob wins

    createGame(100, 0, 1, alice);
    joinGame(2, 3, 2, bob);
    play(2, 1, 1, alice);
    play(2, 4, 2, bob);
    play(2, 2, 1, alice); // Alice wins

    const aliceWinPct = getWinPercentage(alice);
    expect(aliceWinPct.result).toStrictEqual(Cl.uint(6666)); // 66.66% (2/3 * 10000, rounded down)

    const bobWinPct = getWinPercentage(bob);
    expect(bobWinPct.result).toStrictEqual(Cl.uint(3333)); // 33.33% (1/3 * 10000, rounded down)
  });

  it("returns correct leaderboard entry for players with wins", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 3, 2, bob);
    play(0, 1, 1, alice);
    play(0, 4, 2, bob);
    play(0, 2, 1, alice); // Alice wins

    const aliceEntry = getLeaderboardEntry(alice);
    expect(aliceEntry.result).toBeSome(
      Cl.tuple({
        "player": Cl.principal(alice),
        "total-games": Cl.uint(1),
        "wins": Cl.uint(1),
        "losses": Cl.uint(0),
        "win-percentage": Cl.uint(10000), // 100%
        "total-won": Cl.uint(200)
      })
    );

    // Player with no wins should return none
    const charlieEntry = getLeaderboardEntry(charlie);
    expect(charlieEntry.result).toStrictEqual(Cl.none());
  });

  it("allows cancelling timed-out games", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 3, 2, bob);
    
    // Game should not be cancellable initially
    let canCancel = canCancelGame(0);
    expect(canCancel.result).toStrictEqual(Cl.bool(false));

    // Advance blocks to simulate timeout (144 blocks = 24 hours)
    advanceBlocks(144);
    
    // Now it should be cancellable
    canCancel = canCancelGame(0);
    expect(canCancel.result).toStrictEqual(Cl.bool(true));

    // Alice's turn, so Bob can cancel
    const { result, events } = cancelTimedOutGame(0, bob);
    expect(result).toBeOk(Cl.bool(true));
    expect(events.length).toBe(3); // 2 transfers + print event

    // Game should be removed from active games
    const gameData = simnet.getMapEntry("tic-tac-toe-v2", "games", Cl.uint(0));
    expect(gameData).toBeNone();

    // Should be recorded in global games
    const globalGame = simnet.getMapEntry("tic-tac-toe-v2", "global-games", Cl.uint(0));
    expect(globalGame).toBeSome(expect.any(Object));
  });

  it("does not allow cancelling games before timeout", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 3, 2, bob);
    
    // Try to cancel before timeout
    const { result } = cancelTimedOutGame(0, bob);
    expect(result).toBeErr(Cl.uint(106)); // ERR_CANNOT_CANCEL_YET
  });

  it("does not allow unauthorized players to cancel games", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 3, 2, bob);
    
    advanceBlocks(144);
    
    // Charlie is not part of this game
    const { result } = cancelTimedOutGame(0, charlie);
    expect(result).toBeErr(Cl.uint(107)); // ERR_NOT_AUTHORIZED_TO_CANCEL
  });

  it("does not allow the current turn player to cancel", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 3, 2, bob);
    
    advanceBlocks(144);
    
    // It's Alice's turn, Alice shouldn't be able to cancel
    const { result } = cancelTimedOutGame(0, alice);
    expect(result).toBeErr(Cl.uint(107)); // ERR_NOT_AUTHORIZED_TO_CANCEL
  });

  it("tracks multiple games correctly", () => {
    // Create multiple games
    createGame(100, 0, 1, alice);
    createGame(200, 1, 1, bob);
    
    const latestGameId = simnet.callReadOnlyFn(
      "tic-tac-toe-v2",
      "get-latest-game-id",
      [],
      alice
    );
    
    expect(latestGameId.result).toStrictEqual(Cl.uint(2));
    
    // Check both games exist
    const game0 = simnet.callReadOnlyFn(
      "tic-tac-toe-v2",
      "get-game",
      [Cl.uint(0)],
      alice
    );
    const game1 = simnet.callReadOnlyFn(
      "tic-tac-toe-v2",
      "get-game",
      [Cl.uint(1)],
      alice
    );
    
    expect(game0.result).toBeSome(expect.any(Object));
    expect(game1.result).toBeSome(expect.any(Object));
  });

  it("prevents playing on completed games", () => {
    createGame(100, 0, 1, alice);
    joinGame(0, 3, 2, bob);
    play(0, 1, 1, alice);
    play(0, 4, 2, bob);
    play(0, 2, 1, alice); // Alice wins, game completes

    // Try to play another move - should fail because game is completed and removed
    const { result } = play(0, 5, 2, bob);
    expect(result).toBeErr(Cl.uint(102)); // ERR_GAME_NOT_FOUND
  });

  it("handles zero win percentage for new players", () => {
    const newPlayerWinPct = getWinPercentage(charlie);
    expect(newPlayerWinPct.result).toStrictEqual(Cl.uint(0));
  });
});