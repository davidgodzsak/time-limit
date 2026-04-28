import { Leaf, Shield } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  };

  const textClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 40,
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizeClasses[size]} relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 shadow-glow`}
      >
        {/* Shield background */}
        <Shield
          size={iconSizes[size]}
          className="absolute text-white/30"
          strokeWidth={1.5}
        />
        {/* Leaf foreground */}
        <Leaf
          size={iconSizes[size] * 0.75}
          className="relative text-white"
          strokeWidth={2}
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span
            className={`${textClasses[size]} font-bold tracking-tight text-foreground`}
          >
            Time<span className="text-primary">Limit</span>
          </span>
          {size === "lg" && (
            <span className="text-sm text-muted-foreground">
              Focus on what matters
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
