"use client";

import { canCancelGame, type Game, Move } from "@/lib/contract";
import { GameBoard } from "./game-board";
import {
  abbreviateAddress,
  explorerAddress,
  formatStx,
  getCurrentBlockHeight,
} from "@/lib/stx-utils";
import Link from "next/link";
import { useStacks } from "@/hooks/use-stacks";
import { useEffect, useState } from "react";

interface PlayGameProps {
  game: Game;
}

const TIMEOUT_BLOCKS = 144;

export function PlayGame({ game }: PlayGameProps) {
  const { userData, handleJoinGame, handlePlayGame, handleCancelGame } =
    useStacks();

  // Initial game board is the current `game.board` state
  const [board, setBoard] = useState(game.board);
  const [canBeCancelled, setCanBeCancelled] = useState(false);
  const [blocksUntilTimeout, setBlocksUntilTimeout] = useState(0);

  // cell where user played their move. -1 denotes no move has been played
  const [playedMoveIndex, setPlayedMoveIndex] = useState(-1);

  useEffect(() => {
    async function checkCancel() {
      const canCancel = await canCancelGame(game.id);
      setCanBeCancelled(canCancel);
    }
    if (game["player-two"] && !game.winner) {
      checkCancel();
    }

    async function checkTimeout() {
      const currentBlock = await getCurrentBlockHeight();
      const blocksPassed = currentBlock - game["last-move-block"];
      setBlocksUntilTimeout(Math.max(0, TIMEOUT_BLOCKS - blocksPassed));
    }
    if (game["player-two"] && !game.winner) {
      checkTimeout();
      const interval = setInterval(checkTimeout, 30000); // every 30 seconds
      return () => clearInterval(interval);
    }
  }, [game]);

  // If user is not logged in, don't show anything
  if (!userData) return null;

  const isPlayerOne =
    userData.profile.stxAddress.testnet === game["player-one"];
  const isPlayerTwo =
    userData.profile.stxAddress.testnet === game["player-two"];

  const isJoinable = game["player-two"] === null && !isPlayerOne;
  const isJoinedAlready = isPlayerOne || isPlayerTwo;
  const nextMove = game["is-player-one-turn"] ? Move.X : Move.O;
  const isMyTurn =
    (game["is-player-one-turn"] && isPlayerOne) ||
    (!game["is-player-one-turn"] && isPlayerTwo);
  const isGameOver = game.winner !== null;

  function onCellClick(index: number) {
    const tempBoard = [...game.board];
    tempBoard[index] = nextMove;
    setBoard(tempBoard);
    setPlayedMoveIndex(index);
  }

  return (
    <div className="flex flex-col gap-4 w-[400px]">
      <GameBoard
        board={board}
        onCellClick={onCellClick}
        nextMove={nextMove}
        cellClassName="size-32 text-6xl"
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500">Bet Amount: </span>
          <span>{formatStx(game["bet-amount"])} STX</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500">Created at block:</span>
          <span>#{game["created-at"]}</span>
        </div>

        {game["player-two"] && !game.winner && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-500">Timeout in:</span>
            <span>{blocksUntilTimeout} blocks</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500">Player One: </span>
          <Link
            href={explorerAddress(game["player-one"])}
            target="_blank"
            className="hover:underline"
          >
            {abbreviateAddress(game["player-one"])}
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500">Player Two: </span>
          {game["player-two"] ? (
            <Link
              href={explorerAddress(game["player-two"])}
              target="_blank"
              className="hover:underline"
            >
              {abbreviateAddress(game["player-two"])}
            </Link>
          ) : (
            <span>Nobody</span>
          )}
        </div>

        {game["winner"] && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-500">Winner: </span>
            <Link
              href={explorerAddress(game["winner"])}
              target="_blank"
              className="hover:underline"
            >
              {abbreviateAddress(game["winner"])}
            </Link>
          </div>
        )}
      </div>

      {isJoinable && (
        <button
          onClick={() => handleJoinGame(game.id, playedMoveIndex, nextMove)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Join Game
        </button>
      )}

      {isMyTurn && (
        <button
          onClick={() => handlePlayGame(game.id, playedMoveIndex, nextMove)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Play
        </button>
      )}

      {isJoinedAlready && !isMyTurn && !isGameOver && (
        <div className="text-center p-4 bg-gray-800 rounded-lg">
          <div className="text-gray-400">Waiting for opponent to play...</div>
          {canBeCancelled && (
            <button
              onClick={() => handleCancelGame(game.id)}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
            >
              Cancel Timed-out Game
            </button>
          )}
        </div>
      )}
    </div>
  );
}