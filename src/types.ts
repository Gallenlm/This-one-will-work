export type TeamSide = "home" | "away";

export interface OddsApiResponse {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: "h2h";
      outcomes: Array<{
        name: string;
        price: number;
      }>;
    }>;
  }>;
}

export interface ApiSportsGamesResponse {
  response: ApiSportsGame[];
}

export interface ApiSportsGame {
  id: number;
  status: {
    long: string;
    short: string;
  };
  teams: {
    home: ApiSportsTeam;
    away: ApiSportsTeam;
  };
  scores: {
    home: ApiSportsScore | null;
    away: ApiSportsScore | null;
  };
}

export interface ApiSportsTeam {
  id: number;
  name: string;
  logo: string;
}

export interface ApiSportsScore {
  total: number | null;
}

export interface ApiSportsStatisticsResponse {
  response: ApiSportsGameStatistics[];
}

export interface ApiSportsGameStatistics {
  team: ApiSportsTeam;
  statistics: Array<{
    type: string;
    value: number | string | null;
  }>;
}

export interface GameSquare {
  id: string;
  apiSportsId: number;
  homeTeam: string;
  awayTeam: string;
  status: string;
  scoreHome: number | null;
  scoreAway: number | null;
  pregameOdds?: {
    home: number | null;
    away: number | null;
    bookmaker: string | null;
  };
}

export interface TrueShootingResult {
  homeTS: number | null;
  awayTS: number | null;
  updatedAt: string;
}
