"use client";

import { useStacks } from "@/hooks/use-stacks";
import { getPlayerStats, type PlayerStats } from "@/lib/contract";
import { formatStx } from "@/lib/stx-utils";
import { useEffect, useState } from "react";

export default function StatsPage() {
  const { userData } = useStacks();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData) {
      const playerAddress = userData.profile.stxAddress.testnet;
      getPlayerStats(playerAddress)
        .then(setStats)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [userData]);

  if (!userData) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <p className="text-gray-500">
          Please connect your wallet to view your stats.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <p className="text-gray-500">Loading your stats...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <p className="text-gray-500">
          You have not completed any games yet. Play a game to see your stats.
        </p>
      </div>
    );
  }

  const winPercentage =
    stats["total-games"] > 0
      ? ((stats.wins / stats["total-games"]) * 100).toFixed(2)
      : 0;

  return (
    <section className="flex flex-col items-center py-20">
      <div className="text-center mb-20">
        <h1 className="text-4xl font-bold">Your Stats</h1>
        <span className="text-sm text-gray-500">
          A summary of your game performance
        </span>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
          <span className="font-medium">Total Games Played</span>
          <span className="font-bold text-lg">{stats["total-games"]}</span>
        </div>
        <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
          <span className="font-medium">Wins</span>
          <span className="font-bold text-lg text-green-400">{stats.wins}</span>
        </div>
        <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
          <span className="font-medium">Losses</span>
          <span className="font-bold text-lg text-red-400">{stats.losses}</span>
        </div>
        <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
          <span className="font-medium">Win Percentage</span>
          <span className="font-bold text-lg">{winPercentage}%</span>
        </div>
        <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
          <span className="font-medium">Total STX Staked</span>
          <span className="font-bold text-lg">
            {formatStx(stats["total-staked"])} STX
          </span>
        </div>
        <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
          <span className="font-medium">Total STX Won</span>
          <span className="font-bold text-lg">
            {formatStx(stats["total-won"])} STX
          </span>
        </div>
      </div>
    </section>
  );
}
