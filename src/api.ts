import {
  ApiSportsGamesResponse,
  ApiSportsStatisticsResponse,
  GameSquare,
  OddsApiResponse,
  TrueShootingResult,
} from "./types";

const ODDS_API_BASE_URL =
  "https://api.the-odds-api.com/v4/sports/basketball_nba/odds";
const API_SPORTS_BASE_URL =
  import.meta.env.VITE_API_SPORTS_BASE_URL ??
  "https://v1.basketball.api-sports.io";

const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY as string | undefined;
const API_SPORTS_KEY = import.meta.env.VITE_API_SPORTS_KEY as string | undefined;

const DEFAULT_SEASON = import.meta.env.VITE_API_SPORTS_SEASON ?? "2024-2025";
const DEFAULT_LEAGUE = import.meta.env.VITE_API_SPORTS_LEAGUE ?? "12";

export async function fetchOdds(): Promise<OddsApiResponse[]> {
  if (!ODDS_API_KEY) {
    return [];
  }
  const url = new URL(ODDS_API_BASE_URL);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");
  url.searchParams.set("apiKey", ODDS_API_KEY);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Odds API error: ${response.status}`);
  }
  return (await response.json()) as OddsApiResponse[];
}

export async function fetchLiveGames(): Promise<ApiSportsGamesResponse> {
  if (!API_SPORTS_KEY) {
    return { response: [] };
  }
  const url = new URL(`${API_SPORTS_BASE_URL}/games`);
  url.searchParams.set("league", DEFAULT_LEAGUE);
  url.searchParams.set("season", DEFAULT_SEASON);
  url.searchParams.set("live", "all");
  const response = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": API_SPORTS_KEY,
    },
  });
  if (!response.ok) {
    throw new Error(`API Sports error: ${response.status}`);
  }
  return (await response.json()) as ApiSportsGamesResponse;
}

export async function fetchGameStats(
  apiSportsGameId: number,
): Promise<ApiSportsStatisticsResponse> {
  if (!API_SPORTS_KEY) {
    return { response: [] };
  }
  const url = new URL(`${API_SPORTS_BASE_URL}/statistics`);
  url.searchParams.set("game", apiSportsGameId.toString());
  const response = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": API_SPORTS_KEY,
    },
  });
  if (!response.ok) {
    throw new Error(`API Sports stats error: ${response.status}`);
  }
  return (await response.json()) as ApiSportsStatisticsResponse;
}

export function mergeOddsWithLiveGames(
  oddsGames: OddsApiResponse[],
  liveGames: ApiSportsGamesResponse,
): GameSquare[] {
  return liveGames.response.map((game) => {
    const oddsMatch = oddsGames.find(
      (odds) =>
        odds.home_team === game.teams.home.name &&
        odds.away_team === game.teams.away.name,
    );
    const bookmaker = oddsMatch?.bookmakers[0];
    const market = bookmaker?.markets.find((item) => item.key === "h2h");
    const homeOdds =
      market?.outcomes.find((outcome) => outcome.name === game.teams.home.name)
        ?.price ?? null;
    const awayOdds =
      market?.outcomes.find((outcome) => outcome.name === game.teams.away.name)
        ?.price ?? null;

    return {
      id: `${game.id}`,
      apiSportsId: game.id,
      homeTeam: game.teams.home.name,
      awayTeam: game.teams.away.name,
      status: game.status.long,
      scoreHome: game.scores.home?.total ?? null,
      scoreAway: game.scores.away?.total ?? null,
      pregameOdds: oddsMatch
        ? {
            home: homeOdds,
            away: awayOdds,
            bookmaker: bookmaker?.title ?? null,
          }
        : undefined,
    };
  });
}

export function calculateTrueShooting(
  stats: ApiSportsStatisticsResponse,
): TrueShootingResult {
  const lookup = new Map(
    stats.response.map((entry) => [entry.team.name, entry.statistics]),
  );
  const teamNames = stats.response.map((entry) => entry.team.name);

  const computeTS = (teamName: string): number | null => {
    const metrics = lookup.get(teamName);
    if (!metrics) {
      return null;
    }
    const points = readStat(metrics, "Points");
    const fga = readStat(metrics, "Field Goals Attempted");
    const fta = readStat(metrics, "Free Throws Attempted");
    if (points === null || fga === null || fta === null) {
      return null;
    }
    const denominator = 2 * (fga + 0.44 * fta);
    if (denominator === 0) {
      return null;
    }
    return Number((points / denominator).toFixed(3));
  };

  return {
    homeTS: teamNames[0] ? computeTS(teamNames[0]) : null,
    awayTS: teamNames[1] ? computeTS(teamNames[1]) : null,
    updatedAt: new Date().toISOString(),
  };
}

function readStat(
  stats: Array<{ type: string; value: number | string | null }>,
  key: string,
): number | null {
  const entry = stats.find((stat) => stat.type === key);
  if (!entry || entry.value === null) {
    return null;
  }
  if (typeof entry.value === "number") {
    return entry.value;
  }
  const parsed = Number(entry.value);
  return Number.isNaN(parsed) ? null : parsed;
}
