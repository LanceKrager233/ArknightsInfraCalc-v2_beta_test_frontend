"use client";

import { Calligraph } from "calligraph";
import { useReducedMotion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

interface AnimatedValueProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  value: string | number;
  accessibleText?: string;
  drift?: { x?: number; y?: number };
  trend?: -1 | 0 | 1;
}

function AnimatedValue({
  value,
  accessibleText,
  className,
  drift = { x: 6, y: 0 },
  trend = 0,
  ...props
}: AnimatedValueProps & { variant: "text" | "number" }) {
  const shouldReduceMotion = useReducedMotion();
  const text = String(value);
  const spokenText = accessibleText ?? text;
  const { variant } = props;

  return (
    <span
      aria-label={spokenText}
      className={cn("inline-block min-w-0", className)}
      data-animated-value={variant}
    >
      {shouldReduceMotion ? (
        <span aria-hidden="true">{text}</span>
      ) : (
        <Calligraph
          {...props}
          aria-hidden="true"
          animation="default"
          autoSize={false}
          data-calligraph
          drift={drift}
          initial={false}
          stagger={0.008}
          trend={trend}
          variant={variant}
        >
          {text}
        </Calligraph>
      )}
    </span>
  );
}

export function AnimatedText(props: AnimatedValueProps) {
  return <AnimatedValue {...props} variant="text" />;
}

export function AnimatedNumber(props: AnimatedValueProps) {
  return <AnimatedValue {...props} variant="number" />;
}
