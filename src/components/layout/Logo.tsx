import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
};

const Logo = ({ className = "", size = "md" }: LogoProps) => (
  <Link
    to="/"
    className={`font-heading font-normal tracking-tight leading-none ${sizes[size]} ${className}`}
  >
    <span className="text-parchment">Conc</span>
    <span className="text-gold italic">ierge</span>
  </Link>
);

export default Logo;
