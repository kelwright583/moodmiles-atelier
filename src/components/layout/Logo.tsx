import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-base gap-0.5",
  md: "text-2xl gap-1",
  lg: "text-3xl gap-1.5",
};

const Logo = ({ className = "", size = "md" }: LogoProps) => (
  <Link to="/" className={`flex flex-col items-center leading-none ${sizeClasses[size]} ${className}`}>
    <span className="font-heading tracking-tight uppercase">
      <span className="text-foreground">Conc</span>
      <span className="text-primary">ierge</span>
    </span>
    <span className="logo-global logo-global-tiny uppercase text-foreground">
      Global
    </span>
  </Link>
);

export default Logo;
