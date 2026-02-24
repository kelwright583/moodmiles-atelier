import { cn } from "@/lib/utils";

interface ShimmerSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional: override the default champagne shimmer with a different className */
  variant?: "default" | "card" | "text";
}

function ShimmerSkeleton({ className, variant = "default", ...props }: ShimmerSkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        variant === "card" && "rounded-2xl",
        variant === "text" && "rounded-md h-4",
        "bg-muted",
        "before:content-[''] before:absolute before:inset-0 before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-primary/20 before:to-transparent before:bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  );
}

export { ShimmerSkeleton };
