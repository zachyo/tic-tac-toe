import { STACKS_TESTNET } from "@stacks/network";
import {
  cvToValue,
  fetchCallReadOnlyFunction,
  principalCV,
  uintCV,
  type UIntCV,
} from "@stacks/transactions";

const CONTRACT_ADDRESS = "ST17DW5M1YD988HNCMTGTFWV3SX0DWPGY5BJ4B13";
const CONTRACT_NAME = "tic-tac-toe-v2";

export type Game = {
  id: number;
  "player-one": string;
  "player-two": string | null;
  "is-player-one-turn": boolean;
  "bet-amount": number;
  board: number[];
  winner: string | null;
  "last-move-block": number;
  "created-at": number;
};

export enum Move {
  EMPTY = 0,
  X = 1,
  O = 2,
}

export const EMPTY_BOARD = [
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
];

export async function getAllGames() {
  // Fetch the latest-game-id from the contract
  const latestGameIdCV = (await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-latest-game-id",
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  })) as UIntCV;

  // Convert the uintCV to a JS/TS number type
  const latestGameId = Number(latestGameIdCV.value);

  // Loop from 0 to latestGameId-1 and fetch the game details for each game
  const games: Game[] = [];
  for (let i = 0; i < latestGameId; i++) {
    const game = await getGame(i);
    if (game) games.push(game);
  }
  return games;
}

export async function getGame(gameId: number): Promise<Game | null> {
  // Use the get-game read only function to fetch the game details for the given gameId
  const gameDetailsCV = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-game",
    functionArgs: [uintCV(gameId)],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  });
  console.log({gameDetailsCV})

  const gameDetails = cvToValue(gameDetailsCV);
  if (!gameDetails) return null;
  console.log(gameDetails)

  return {
    id: gameId,
    ...gameDetails,
    "is-player-one-turn" : Boolean(gameDetails.value["is-player-one-turn"].value),
    "player-one": gameDetails.value["player-one"].value,
    "player-two": gameDetails.value["player-two"].value?.value || null,
    "bet-amount": Number(gameDetails.value["bet-amount"].value),
    winner: gameDetails.value.winner?.value,
    "last-move-block": Number(gameDetails.value["last-move-block"].value),
    "created-at": Number(gameDetails.value["created-at"].value),
    board: gameDetails.value.board?.value?.map((m: any) => Number(m.value)),
  };
}

export type GlobalGame = {
  "player-one": string;
  "player-two": string;
  winner: string | null;
  "bet-amount": number;
  "created-at": number;
  "finished-at": number;
};

export async function getGlobalGame(gameId: number): Promise<GlobalGame | null> {
  const globalGameCV = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-global-game",
    functionArgs: [uintCV(gameId)],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  });

  const globalGame = cvToValue(globalGameCV);
  console.log({globalGame})
  if (!globalGame) return null;

  return {
    "player-one": globalGame.value["player-one"].value,
    "player-two": globalGame.value["player-two"].value,
    winner: globalGame.value.winner?.value?.value || null,
    "bet-amount": Number(globalGame.value["bet-amount"].value),
    "created-at": Number(globalGame.value["created-at"].value),
    "finished-at": Number(globalGame.value["finished-at"].value),
  };
}

export async function getAllGlobalGames(): Promise<GlobalGame[]> {
  const latestGameIdCV = (await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-latest-game-id",
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  })) as UIntCV;

  const latestGameId = Number(latestGameIdCV.value);

  const globalGames: GlobalGame[] = [];
  for (let i = 0; i < latestGameId; i++) {
    const globalGame = await getGlobalGame(i);
    if (globalGame) globalGames.push(globalGame);
  }
  return globalGames;
}

export async function createNewGame(
  betAmount: number,
  moveIndex: number,
  move: Move
) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "create-game",
    functionArgs: [uintCV(betAmount), uintCV(moveIndex), uintCV(move)],
  };

  return txOptions;
}

export async function joinGame(gameId: number, moveIndex: number, move: Move) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "join-game",
    functionArgs: [uintCV(gameId), uintCV(moveIndex), uintCV(move)],
  };

  return txOptions;
}

export async function play(gameId: number, moveIndex: number, move: Move) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "play",
    functionArgs: [uintCV(gameId), uintCV(moveIndex), uintCV(move)],
  };

  return txOptions;
}

export async function cancelTimedOutGame(gameId: number) {
  return {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "cancel-timed-out-game",
    functionArgs: [uintCV(gameId)],
  };
}

export async function canCancelGame(gameId: number): Promise<boolean> {
  const canCancelCV = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "can-cancel-game",
    functionArgs: [uintCV(gameId)],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  });
  return cvToValue(canCancelCV);
}

export type PlayerStats = {
  "total-games": number;
  wins: number;
  losses: number;
  "total-staked": number;
  "total-won": number;
};

export async function getPlayerStats(
  player: string
): Promise<PlayerStats | null> {
  const statsCV = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-player-statistics",
    functionArgs: [principalCV(player)],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  });
  console.log({statsCV})

  const stats = cvToValue(statsCV);
  console.log({stats})
  if (!stats) return null;

  return {
    ...stats,    
    "total-games": Number(stats.value["total-games"].value),
    wins: Number(stats.value.wins.value),
    losses: Number(stats.value.losses.value),
    "total-staked": Number(stats.value["total-staked"].value),
    "total-won": Number(stats.value["total-won"].value),
  };
}

export type LeaderboardEntry = {
  player: string;
  "total-games": number;
  wins: number;
  losses: number;
  "win-percentage": number;
  "total-won": number;
};

export async function getLeaderboardEntry(
  player: string
): Promise<LeaderboardEntry | null> {
  const entryCV = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-leaderboard-entry",
    functionArgs: [principalCV(player)],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  });
  const entry = cvToValue(entryCV);

  if (!entry) return null;
  return {
    ...entry,
    "total-games": Number(entry.value["total-games"].value),
    wins: Number(entry.value.wins.value),
    losses: Number(entry.value.losses.value),
    player: entry.value.player.value,
    "win-percentage": Number(entry.value["win-percentage"].value),
    "total-won": Number(entry.value["total-won"].value),
  };
}