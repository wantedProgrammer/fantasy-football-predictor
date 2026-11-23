import { useQuery } from '@apollo/client';

import { GET_SEASON } from '../graphql/predictor';
import type { Season } from '../graphql/predictor';
import { useLeague } from '../lib/league';
import type { League } from '../lib/league';
import { formatDeadline } from '../lib/format';

/** Hook returning the season (gameweeks, budget, default gameweek) for a league. */
// eslint-disable-next-line react-refresh/only-export-components
export function useSeason(league: League) {
  return useQuery<{ season: Season }>(GET_SEASON, {
    variables: { league },
  });
}

/** Compact gameweek select for the top navigation. */
export default function GameweekPicker({
  disabled = false,
  disabledReason,
}: {
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { league, gameweek, setGameweek } = useLeague();
  const { data, loading } = useSeason(league);
  const season = data?.season;

  if (!season) {
    return <div className={`h-9 w-36 rounded-full ${loading ? 'skeleton' : 'bg-white/[0.03]'}`} aria-hidden="true" />;
  }

  const upcoming = season.gameweeks.filter((item) => item.id >= season.defaultGameweek);
  const selected = gameweek ?? season.defaultGameweek;
  const deadline = formatDeadline(season.gameweeks.find((item) => item.id === selected)?.deadline);

  return (
    <label className="relative block" title={disabled ? disabledReason : deadline ? `Deadline ${deadline}` : undefined}>
      <span className="sr-only">Gameweek</span>
      <select
        value={selected}
        disabled={disabled}
        onChange={(event) => setGameweek(Number(event.target.value))}
        className="field !rounded-full !py-2 !pl-3.5 text-[13px]"
      >
        {upcoming.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
            {item.id === season.defaultGameweek ? ' · next' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
