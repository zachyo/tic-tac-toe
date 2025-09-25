import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;


// Helper function to create a new game with the given bet amount, move index, and move
// on behalf of the `user` address
function createGame(
  betAmount: number,
  moveIndex: number,
  move: number,
  user: string
) {
  return simnet.callPublicFn(
    "tic-tac-toe",
    "create-game",
    [Cl.uint(betAmount), Cl.uint(moveIndex), Cl.uint(move)],
    user
  );
}

// Helper function to join a game with the given move index and move on behalf of the `user` address
function joinGame(moveIndex: number, move: number, user: string) {
  return simnet.callPublicFn(
    "tic-tac-toe",
    "join-game",
    [Cl.uint(0), Cl.uint(moveIndex), Cl.uint(move)],
    user
  );
}

// Helper function to play a move with the given move index and move on behalf of the `user` address
function play(moveIndex: number, move: number, user: string) {
  return simnet.callPublicFn(
    "tic-tac-toe",
    "play",
    [Cl.uint(0), Cl.uint(moveIndex), Cl.uint(move)],
    user
  );
}

describe("Tic Tac Toe Tests", () => {
  it("allows game creation", () => {
    const { result, events } = createGame(100, 0, 1, alice);

    expect(result).toBeOk(Cl.uint(0));
    expect(events.length).toBe(2); // print_event and stx_transfer_event
  });

  it("allows game joining", () => {
    createGame(100, 0, 1, alice);
    const { result, events } = joinGame(1, 2, bob);

    expect(result).toBeOk(Cl.uint(0));
    expect(events.length).toBe(2); // print_event and stx_transfer_event
  });

  it("allows game playing", () => {
    createGame(100, 0, 1, alice);
    joinGame(1, 2, bob);
    const { result, events } = play(2, 1, alice);

    expect(result).toBeOk(Cl.uint(0));
    expect(events.length).toBe(1); // print_event
  });

  it("does not allow creating a game with a bet amount of 0", () => {
    const { result } = createGame(0, 0, 1, alice);
    expect(result).toBeErr(Cl.uint(100));
  });

  it("does not allow joining a game that has already been joined", () => {
    createGame(100, 0, 1, alice);
    joinGame(1, 2, bob);

    const { result } = joinGame(1, 2, alice);
    expect(result).toBeErr(Cl.uint(103));
  });

  it("does not allow an out of bounds move", () => {
    createGame(100, 0, 1, alice);
    joinGame(1, 2, bob);

    const { result } = play(10, 1, alice);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("does not allow a non X or O move", () => {
    createGame(100, 0, 1, alice);
    joinGame(1, 2, bob);

    const { result } = play(2, 3, alice);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("does not allow moving on an occupied spot", () => {
    createGame(100, 0, 1, alice);
    joinGame(1, 2, bob);

    const { result } = play(1, 1, alice);
    expect(result).toBeErr(Cl.uint(101));
  });

  it("allows player one to win", () => {
    createGame(100, 0, 1, alice);
    joinGame(3, 2, bob);
    play(1, 1, alice);
    play(4, 2, bob);
    const { result, events } = play(2, 1, alice);

    expect(result).toBeOk(Cl.uint(0));
    expect(events.length).toBe(2); // print_event and stx_transfer_event

    const gameData = simnet.getMapEntry("tic-tac-toe", "games", Cl.uint(0));
    expect(gameData).toBeSome(
      Cl.tuple({
        "player-one": Cl.principal(alice),
        "player-two": Cl.some(Cl.principal(bob)),
        "is-player-one-turn": Cl.bool(false),
        "bet-amount": Cl.uint(100),
        board: Cl.list([
          Cl.uint(1),
          Cl.uint(1),
          Cl.uint(1),
          Cl.uint(2),
          Cl.uint(2),
          Cl.uint(0),
          Cl.uint(0),
          Cl.uint(0),
          Cl.uint(0),
        ]),
        winner: Cl.some(Cl.principal(alice)),
      })
    );
  });

  it("allows player two to win", () => {
    createGame(100, 0, 1, alice);
    joinGame(3, 2, bob);
    play(1, 1, alice);
    play(4, 2, bob);
    play(8, 1, alice);
    const { result, events } = play(5, 2, bob);

    expect(result).toBeOk(Cl.uint(0));
    expect(events.length).toBe(2); // print_event and stx_transfer_event

    const gameData = simnet.getMapEntry("tic-tac-toe", "games", Cl.uint(0));
    expect(gameData).toBeSome(
      Cl.tuple({
        "player-one": Cl.principal(alice),
        "player-two": Cl.some(Cl.principal(bob)),
        "is-player-one-turn": Cl.bool(true),
        "bet-amount": Cl.uint(100),
        board: Cl.list([
          Cl.uint(1),
          Cl.uint(1),
          Cl.uint(0),
          Cl.uint(2),
          Cl.uint(2),
          Cl.uint(2),
          Cl.uint(0),
          Cl.uint(0),
          Cl.uint(1),
        ]),
        winner: Cl.some(Cl.principal(bob)),
      })
    );
  });
});
