import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-body font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gold text-ink hover:bg-gold-glow glow-gold tracking-wide",
        outline:
          "border border-gold text-gold bg-transparent hover:bg-gold/10 tracking-wide",
        ghost:
          "text-parchment-dim hover:text-parchment hover:bg-ink-raised tracking-wide",
        destructive:
          "bg-destructive text-parchment hover:bg-destructive/85 tracking-wide",
        link:
          "text-gold underline-offset-4 hover:underline tracking-wide",
        champagne:
          "bg-gold text-ink hover:bg-gold-glow glow-gold tracking-wide",
        "champagne-outline":
          "border border-gold/50 text-gold bg-transparent hover:bg-gold/10 tracking-wide",
        secondary:
          "bg-ink-raised text-parchment-dim border border-ink-border hover:text-parchment hover:border-gold/30 tracking-wide",
      },
      size: {
        default: "h-10 px-5 py-2 text-sm rounded-sm",
        sm:      "h-8 px-4 text-xs rounded-sm",
        lg:      "h-12 px-8 text-sm rounded-sm",
        xl:      "h-13 px-10 text-sm rounded-sm",
        icon:    "h-10 w-10 rounded-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
