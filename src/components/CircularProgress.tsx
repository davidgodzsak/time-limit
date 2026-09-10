interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  variant?: "time" | "opens";
  /**
   * Overrides the usage colouring (green → amber → red). The reflection
   * countdown uses it: filling up there means "nearly ready", not "nearly out".
   */
  color?: string;
}

const CircularProgress = ({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  children,
  variant = "time",
  color,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (color) return color;
    if (percentage > 75) return "hsl(var(--destructive))";
    if (percentage > 50) return "hsl(var(--warning))";
    return "hsl(var(--primary))";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default CircularProgress;
