import { League } from '../models/league.enum';
import { Position } from '../models/position.enum';
import {
  FixtureInfo,
  GameweekInfo,
  LeagueSnapshot,
  PlayerRecord,
  STANDARD_POSITION_RULES,
  TeamInfo,
} from '../domain';
import { getJson, parseUefaDate, toNullableNumber, toNumber } from './http';

const FEED_BASE = 'https://gaming.uefa.com/en/uclfantasy/services/feeds';

/**
 * UEFA identifies each season by a numeric id that increases by 10 per year
 * (80 = 2025/26, 90 = 2026/27). The newest id with a published fixture feed
 * is used, so the app keeps working when a new season starts. Set
 * UCL_SEASON_ID to pin a specific season.
 */
const KNOWN_SEASON_ID = 90;

type UefaEnvelope<T> = {
  data?: {
    value?: T;
  };
};

type UefaMatch = {
  mId: number;
  htId: number;
  htName: string;
  htCCode: string;
  atId: number;
  atName: string;
  atCCode: string;
  dateTime: string;
  matchStatus: string;
  htScore: string;
  atScore: string;
};

type UefaMatchday = {
  mdId: number;
  deadline: string;
  mdIsCurrent: number;
  mdIsLocked: number;
  match?: UefaMatch[];
};

type UefaPlayer = {
  id: string | number;
  pDName?: string;
  pFName?: string;
  tId?: string | number;
  skill?: number;
  value?: number | string;
  totPts?: number | string;
  gS?: number | string;
  assist?: number | string;
  cS?: number | string;
  minsPlyd?: number | string;
  avgPlayerPts?: number | string;
  lastGdPoints?: number | string;
  mOMPts?: number | string;
  saves?: number | string;
  selPer?: number | string;
  pStatus?: string;
  trained?: string;
  isActive?: number;
  mTransferIn?: number | string;
  mTransferOut?: number | string;
};

const POSITIONS: Record<number, Position> = {
  1: Position.GK,
  2: Position.DEF,
  3: Position.MID,
  4: Position.FWD,
};

const STATUS_LABELS: Record<string, string> = {
  I: 'Injured',
  D: 'Doubtful',
  S: 'Suspended',
  NIS: 'Not in squad',
};

let cachedSeasonId: number | null = null;

async function fetchMatchdays(seasonId: number): Promise<UefaMatchday[] | null> {
  try {
    const envelope = await getJson<UefaEnvelope<UefaMatchday[]>>(
      `${FEED_BASE}/fixtures/fixtures_${seasonId}_en.json`,
    );
    const matchdays = envelope?.data?.value;

    return Array.isArray(matchdays) && matchdays.length > 0 ? matchdays : null;
  } catch {
    return null;
  }
}

async function resolveSeason(): Promise<{
  seasonId: number;
  matchdays: UefaMatchday[];
}> {
  const pinned = Number(process.env.UCL_SEASON_ID);

  if (Number.isInteger(pinned) && pinned > 0) {
    const matchdays = await fetchMatchdays(pinned);
    if (!matchdays) {
      throw new Error(`No UEFA fixture feed found for season ${pinned}`);
    }
    return { seasonId: pinned, matchdays };
  }

  const start = cachedSeasonId ?? KNOWN_SEASON_ID;
  const candidates = [start + 20, start + 10, start, start - 10];
  const results = await Promise.all(candidates.map(fetchMatchdays));

  for (let index = 0; index < candidates.length; index += 1) {
    const matchdays = results[index];
    if (matchdays) {
      cachedSeasonId = candidates[index];
      return { seasonId: candidates[index], matchdays };
    }
  }

  throw new Error('Unable to locate a UEFA Champions League fantasy season');
}

async function fetchPlayers(
  seasonId: number,
  preferredMatchday: number,
): Promise<UefaPlayer[]> {
  // The players feed is published per matchday; fall back to earlier ones.
  for (let matchday = preferredMatchday; matchday >= 1; matchday -= 1) {
    try {
      const envelope = await getJson<UefaEnvelope<{ playerList?: UefaPlayer[] }>>(
        `${FEED_BASE}/players/players_${seasonId}_en_${matchday}.json`,
      );
      const players = envelope?.data?.value?.playerList;

      if (Array.isArray(players) && players.length > 0) {
        return players;
      }
    } catch {
      // Try the previous matchday.
    }
  }

  throw new Error('Unexpected UEFA player feed response structure');
}

function mapAvailability(player: UefaPlayer): {
  availability: number;
  startLikelihood: number | null;
  news: string | null;
} {
  const status = player.pStatus?.trim() ?? '';
  const trained = player.trained?.trim() ?? '';
  const notes: string[] = [];

  let availability = 1;

  if (player.isActive === 0 || ['I', 'S', 'NIS'].includes(status)) {
    availability = 0;
  } else if (status === 'D') {
    availability = 0.5;
  }

  if (STATUS_LABELS[status]) {
    notes.push(STATUS_LABELS[status]);
  }

  let startLikelihood: number | null = null;

  if (/unlikely/i.test(trained)) {
    startLikelihood = 0.2;
    notes.push(trained);
  }

  return {
    availability,
    startLikelihood,
    news: notes.length > 0 ? notes.join('. ') : null,
  };
}

export async function fetchChampionsLeagueSnapshot(): Promise<LeagueSnapshot> {
  const { seasonId, matchdays } = await resolveSeason();

  const teams = new Map<string, TeamInfo>();
  const fixtures: FixtureInfo[] = [];

  for (const matchday of matchdays) {
    for (const match of matchday.match ?? []) {
      const homeId = String(match.htId);
      const awayId = String(match.atId);

      if (!teams.has(homeId)) {
        teams.set(homeId, {
          id: homeId,
          name: match.htName,
          shortName: match.htCCode,
        });
      }

      if (!teams.has(awayId)) {
        teams.set(awayId, {
          id: awayId,
          name: match.atName,
          shortName: match.atCCode,
        });
      }

      const finished = match.matchStatus === '2';

      fixtures.push({
        id: String(match.mId),
        gameweek: matchday.mdId,
        homeTeamId: homeId,
        awayTeamId: awayId,
        kickoff: parseUefaDate(match.dateTime),
        finished,
        homeScore: finished ? toNullableNumber(match.htScore) : null,
        awayScore: finished ? toNullableNumber(match.atScore) : null,
        homeDifficulty: null,
        awayDifficulty: null,
      });
    }
  }

  const now = Date.now();

  const gameweeks: GameweekInfo[] = matchdays.map((matchday) => {
    const matches = matchday.match ?? [];
    const deadline = parseUefaDate(matchday.deadline);

    return {
      id: matchday.mdId,
      name: `Matchday ${matchday.mdId}`,
      deadline,
      isCurrent: matchday.mdIsCurrent === 1,
      isNext: false,
      finished:
        matches.length > 0 &&
        matches.every((match) => match.matchStatus === '2'),
    };
  });

  const next = gameweeks.find(
    (gameweek) =>
      !gameweek.finished &&
      (gameweek.deadline === null || Date.parse(gameweek.deadline) > now),
  );

  if (next) {
    next.isNext = true;
  }

  const current =
    gameweeks.find((gameweek) => gameweek.isCurrent) ?? next ?? gameweeks[0];

  const rawPlayers = await fetchPlayers(seasonId, current.id);

  const players: PlayerRecord[] = rawPlayers
    .filter((player) => POSITIONS[player.skill ?? 0])
    .map((player) => {
      const fullName = player.pFName?.trim() ?? '';
      const [firstName = '', ...remainingNames] = fullName.split(/\s+/);
      const pointsPerGame = toNumber(player.avgPlayerPts);
      const lastPoints = toNumber(player.lastGdPoints);

      return {
        id: String(player.id),
        firstName,
        secondName: remainingNames.join(' '),
        displayName: player.pDName ?? fullName,
        teamId: String(player.tId ?? ''),
        position: POSITIONS[player.skill as number],
        price: toNumber(player.value),
        totalPoints: toNumber(player.totPts),
        goals: toNumber(player.gS),
        assists: toNumber(player.assist),
        cleanSheets: toNumber(player.cS),
        minutes: toNumber(player.minsPlyd),
        starts: null,
        pointsPerGame,
        // UEFA only exposes the last matchday's score, which is very noisy,
        // so form is smoothed towards the season average.
        form: Math.round(((lastPoints + pointsPerGame) / 2) * 10) / 10,
        expectedGoalsPer90: null,
        expectedAssistsPer90: null,
        bonus: toNumber(player.mOMPts),
        saves: toNumber(player.saves),
        selectedBy: toNumber(player.selPer),
        ...mapAvailability(player),
        providerExpectedPoints: null,
        transfersIn: toNumber(player.mTransferIn),
        transfersOut: toNumber(player.mTransferOut),
      };
    });

  return {
    league: League.CHAMPIONS_LEAGUE,
    rules: {
      budget: 100,
      squadSize: 15,
      startingSize: 11,
      maxPerTeam: 3,
      currency: '€',
      positions: STANDARD_POSITION_RULES,
    },
    teams,
    players,
    fixtures,
    gameweeks,
    defaultGameweek: (next ?? current).id,
    fetchedAt: new Date(),
  };
}
