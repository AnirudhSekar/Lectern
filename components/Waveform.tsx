const BAR_HEIGHTS = [18, 34, 22, 44, 28, 52, 20, 38, 30, 46, 24, 16];

export function Waveform({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 60"
      className={className}
      role="img"
      aria-label="Audio waveform"
    >
      {BAR_HEIGHTS.map((h, i) => (
        <rect
          key={i}
          x={i * 18 + 4}
          y={30 - h / 2}
          width="8"
          height={h}
          rx="4"
          fill={i % 3 === 0 ? "#FF7A59" : "#5EEAD4"}
          className="origin-center animate-wave"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </svg>
  );
}
