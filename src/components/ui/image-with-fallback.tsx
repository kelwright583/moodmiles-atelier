import { useState } from "react";
import { LucideIcon, MapPin } from "lucide-react";

interface ImageWithFallbackProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackIcon?: LucideIcon;
  fallbackClassName?: string;
  aspectClass?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className = "",
  fallbackIcon: FallbackIcon = MapPin,
  fallbackClassName = "text-muted-foreground/20",
  aspectClass = "aspect-[4/5]",
}: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={`${aspectClass} bg-secondary flex items-center justify-center ${className}`}>
        <FallbackIcon size={32} className={fallbackClassName} />
      </div>
    );
  }

  return (
    <div className={`${aspectClass} bg-secondary overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
      />
    </div>
  );
}
