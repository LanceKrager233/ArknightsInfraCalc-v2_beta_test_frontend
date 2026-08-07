"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "@/lib/utils"
import { MOTION_DURATION, MOTION_EASE_OUT } from "@/motion"

function Label({
  className,
  pressable = false,
  ...props
}: React.ComponentProps<"label"> & { pressable?: boolean }) {
  return (
    <motion.label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      whileTap={pressable ? { transform: "scale(0.97)" } : undefined}
      transition={pressable ? { duration: MOTION_DURATION.press, ease: MOTION_EASE_OUT } : undefined}
      {...(props as unknown as HTMLMotionProps<"label">)}
    />
  )
}

export { Label }
