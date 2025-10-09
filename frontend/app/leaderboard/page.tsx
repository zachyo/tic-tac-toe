import {
  getAllGlobalGames,
  getLeaderboardEntry,
  type LeaderboardEntry,
} from "@/lib/contract";
import { abbreviateAddress, formatStx } from "@/lib/stx-utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const globalGames = await getAllGlobalGames();
  console.log({globalGames});
  
  // Extract unique player addresses from global games
  const playerAddresses = new Set<string>();
  globalGames.forEach((game) => {
    playerAddresses.add(game["player-one"]);
    playerAddresses.add(game["player-two"]);
  });

  // Get leaderboard entries for all players
  const leaderboardEntries: LeaderboardEntry[] = [];
  for (const address of Array.from(playerAddresses)) {
    const entry = await getLeaderboardEntry(address);
    if (entry) {
      leaderboardEntries.push(entry);
    }
  }

  // Sort by win percentage first, then by total wins
  leaderboardEntries.sort(
    (a, b) => b["win-percentage"] - a["win-percentage"] || b.wins - a.wins
  );
  console.log({leaderboardEntries})

  return (
    <section className="flex flex-col items-center py-20">
      <div className="text-center mb-20">
        <h1 className="text-4xl font-bold">Leaderboard</h1>
        <span className="text-sm text-gray-500">
          See who is the best Tic Tac Toe player
        </span>
      </div>

      <div className="w-full max-w-4xl">
        {leaderboardEntries.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-gray-500 mb-4">No games with winners yet.</p>
            <Link
              href="/create"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Be the First to Win a Game
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto border-collapse">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-4 text-white">Rank</th>
                  <th className="p-4 text-white">Player</th>
                  <th className="p-4 text-white">Total Games</th>
                  <th className="p-4 text-white">Wins</th>
                  <th className="p-4 text-white">Losses</th>
                  <th className="p-4 text-white">Win %</th>
                  <th className="p-4 text-white">Total Won (STX)</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardEntries.map((entry, index) => (
                  <tr 
                    key={entry.player} 
                    className="border-b border-gray-700 hover:bg-gray-900"
                  >
                    <td className="p-4 font-bold">
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                      {index > 2 && `#${index + 1}`}
                    </td>
                    <td className="p-4 font-mono text-blue-400">
                      {abbreviateAddress(entry.player)}
                    </td>
                    <td className="p-4">{entry["total-games"]}</td>
                    <td className="p-4 text-green-400 font-semibold">{entry.wins}</td>
                    <td className="p-4 text-red-400">{entry.losses}</td>
                    <td className="p-4 font-semibold">
                      {(entry["win-percentage"] / 100).toFixed(2)}%
                    </td>
                    <td className="p-4 text-orange-400 font-semibold">
                      {formatStx(entry["total-won"])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {globalGames.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-400">
            Based on {globalGames.length} completed game{globalGames.length !== 1 ? 's' : ''} • 
            Only players with wins are shown
          </div>
        )}
      </div>
    </section>
  );
}