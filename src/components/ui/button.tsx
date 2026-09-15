import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Botones Parley: forma de píldora para acciones y foco de alto contraste.
 * con un leve levantamiento al pasar el cursor. El principal lleva el acento
 * white-label; el `outline` es el fantasma de la landing (borde fino que se
 * oscurece al pasar).
 *
 * Sin modificadores de opacidad (`bg-primary/90`): Tailwind 3 no sabe
 * aplicarlos a un color `var(--x)` y descarta la regla en silencio.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.01em] transition-[color,background-color,border-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:bg-brand-hover active:translate-y-0",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:-translate-y-px hover:border-foreground active:translate-y-0",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90",
      },
      size: {
        default: "h-control px-4 py-2",
        sm: "h-control-sm px-3 text-xs",
        lg: "h-control-lg px-6",
        icon: "h-control w-control",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
