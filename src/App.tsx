import { useEffect, useMemo, useState } from "react";
import {
  calculateTrueShooting,
  fetchGameStats,
  fetchLiveGames,
  fetchOdds,
  mergeOddsWithLiveGames,
} from "./api";
import { GameSquare, TrueShootingResult } from "./types";

const REFRESH_INTERVAL_MS = 30000;

const formatOdds = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return "—";
  }
  return value > 0 ? `+${value}` : `${value}`;
};

const formatScore = (home: number | null, away: number | null): string => {
  if (home === null || away === null) {
    return "—";
  }
  return `${away} - ${home}`;
};

const formatTS = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${(value * 100).toFixed(1)}%`;
};

export default function App() {
  const [games, setGames] = useState<GameSquare[]>([]);
  const [tsByGame, setTsByGame] = useState<Record<string, TrueShootingResult>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasGames = games.length > 0;

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setError(null);
        const [odds, live] = await Promise.all([
          fetchOdds(),
          fetchLiveGames(),
        ]);
        if (!isMounted) {
          return;
        }
        setGames(mergeOddsWithLiveGames(odds, live));
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Unable to load games.";
        setError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    const interval = window.setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const lastUpdated = useMemo(() => new Date().toLocaleTimeString(), [games]);

  const handleSquareClick = async (game: GameSquare) => {
    try {
      const stats = await fetchGameStats(game.apiSportsId);
      const result = calculateTrueShooting(stats);
      setTsByGame((prev) => ({
        ...prev,
        [game.id]: result,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load statistics.";
      setError(message);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>NBA Live Game Squares</h1>
          <p>
            Pregame odds and live scores update automatically. Click a square to
            calculate true shooting at the moment of inquiry.
          </p>
        </div>
        <div className="header-meta">
          <span>Updated: {lastUpdated}</span>
        </div>
      </header>

      {loading && <div className="status">Loading live games…</div>}
      {error && <div className="status error">{error}</div>}
      {!loading && !hasGames && (
        <div className="status">No live games available.</div>
      )}

      <section className="grid">
        {games.map((game) => {
          const ts = tsByGame[game.id];
          return (
            <button
              type="button"
              key={game.id}
              className="square"
              onClick={() => handleSquareClick(game)}
            >
              <div className="square-header">
                <span className="status-pill">{game.status}</span>
                <span className="score">{formatScore(game.scoreHome, game.scoreAway)}</span>
              </div>
              <div className="teams">
                <div>
                  <h2>{game.awayTeam}</h2>
                  <span className="odds">Odds: {formatOdds(game.pregameOdds?.away)}</span>
                </div>
                <div>
                  <h2>{game.homeTeam}</h2>
                  <span className="odds">Odds: {formatOdds(game.pregameOdds?.home)}</span>
                </div>
              </div>
              <div className="true-shooting">
                <div>
                  <span className="label">Away TS%</span>
                  <span className="value">{formatTS(ts?.awayTS)}</span>
                </div>
                <div>
                  <span className="label">Home TS%</span>
                  <span className="value">{formatTS(ts?.homeTS)}</span>
                </div>
              </div>
              <div className="square-footer">
                <span>{game.pregameOdds?.bookmaker ?? "No odds feed"}</span>
                <span>
                  {ts ? `TS updated ${new Date(ts.updatedAt).toLocaleTimeString()}` : "Click for TS"}
                </span>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
