import { useLeague } from '../lib/league';
import { kitColours } from '../lib/format';

/**
 * Decorative background artwork for hero bands.
 * Premier League mode uses angular shards; Champions League mode uses sweeping arcs.
 */
export function Swoosh({ className = '' }: { className?: string }) {
  const { league } = useLeague();

  if (league === 'CHAMPIONS_LEAGUE') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 600 300"
        preserveAspectRatio="xMaxYMid slice"
        className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      >
        <defs>
          <linearGradient id="arc-fade" x1="0" x2="1">
            <stop offset="0" stopColor="#00e6ff" stopOpacity="0" />
            <stop offset="1" stopColor="#00e6ff" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <circle
            key={index}
            cx="640"
            cy="330"
            r={120 + index * 52}
            fill="none"
            stroke="url(#arc-fade)"
            strokeWidth={index % 2 === 0 ? 2 : 1}
            opacity={1 - index * 0.13}
          />
        ))}
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 300"
      preserveAspectRatio="xMaxYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id="shard-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#05e1ff" />
          <stop offset="1" stopColor="#3d7bff" />
        </linearGradient>
        <linearGradient id="shard-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#8b3cff" />
          <stop offset="1" stopColor="#ff2882" />
        </linearGradient>
      </defs>
      <polygon points="380,0 470,0 330,300 240,300" fill="url(#shard-a)" opacity="0.55" />
      <polygon points="470,0 520,0 380,300 330,300" fill="url(#shard-b)" opacity="0.65" />
      <polygon points="545,0 600,0 600,40 470,300 420,300" fill="url(#shard-a)" opacity="0.4" />
      <polygon points="600,90 600,300 520,300" fill="#00ff87" opacity="0.35" />
    </svg>
  );
}

/** A football shirt in the club's home colour, with its short name printed on it. */
export function Shirt({
  teamShort,
  size = 44,
  goalkeeper = false,
}: {
  teamShort: string;
  size?: number;
  goalkeeper?: boolean;
}) {
  const kit = goalkeeper ? { shirt: '#facc15', text: '#1c1917' } : kitColours(teamShort);

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      className="drop-shadow-[0_3px_4px_rgb(0_0_0/0.35)]"
    >
      <path
        d="M14 3.5 L8 5.5 L1.5 12 L6 18.5 L10 15.5 V36.5 H30 V15.5 L34 18.5 L38.5 12 L32 5.5 L26 3.5 Q20 8.5 14 3.5 Z"
        fill={kit.shirt}
        stroke="rgb(0 0 0 / 0.35)"
        strokeWidth="1"
      />
      <path d="M14 3.5 Q20 8.5 26 3.5" fill="none" stroke="rgb(0 0 0 / 0.25)" strokeWidth="1.5" />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
        fontWeight="800"
        fontSize="9.5"
        fill={kit.text}
      >
        {teamShort}
      </text>
    </svg>
  );
}
