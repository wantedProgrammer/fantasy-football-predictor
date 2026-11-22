import { useQuery } from '@apollo/client';

import { GET_SEASON } from '../graphql/predictor';
import type { Season } from '../graphql/predictor';
import type { League } from '../lib/league';
import { formatDeadline } from '../lib/format';

type GameweekPickerProps = {
  league: League;
  value: number | null;
  onChange: (gameweek: number) => void;
};

/** Hook returning the season (gameweeks, budget, default gameweek) for a league. */
// eslint-disable-next-line react-refresh/only-export-components
export function useSeason(league: League) {
  return useQuery<{ season: Season }>(GET_SEASON, {
    variables: { league },
  });
}

export default function GameweekPicker({
  league,
  value,
  onChange,
}: GameweekPickerProps) {
  const { data } = useSeason(league);
  const season = data?.season;

  if (!season) {
    return null;
  }

  const upcoming = season.gameweeks.filter(
    (gameweek) => gameweek.id >= season.defaultGameweek,
  );
  const selected = value ?? season.defaultGameweek;
  const selectedInfo = season.gameweeks.find((item) => item.id === selected);
  const deadline = formatDeadline(selectedInfo?.deadline);

  return (
    <label className="block">
      <span className="eyebrow mb-2 block text-white/75">
        Gameweek
      </span>
      <select
        value={selected}
        onChange={(event) => onChange(Number(event.target.value))}
        className="field"
      >
        {upcoming.map((gameweek) => (
          <option key={gameweek.id} value={gameweek.id}>
            {gameweek.name}
            {gameweek.id === season.defaultGameweek ? ' (next)' : ''}
          </option>
        ))}
      </select>
      {deadline && (
        <span className="mt-1.5 block text-xs font-semibold text-white/70">
          Deadline {deadline}
        </span>
      )}
    </label>
  );
}
