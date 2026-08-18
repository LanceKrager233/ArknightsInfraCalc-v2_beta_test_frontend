"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

import { MOTION_EASE_OUT } from "@/motion";

export function PrimaryPageTransition({
  pageKey,
  children,
}: {
  pageKey: string;
  children: ReactNode;
}) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={hasMounted ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        exit={{
          opacity: 0,
          transition: { duration: 0.1, ease: MOTION_EASE_OUT },
        }}
        transition={{ duration: 0.16, ease: MOTION_EASE_OUT }}
        data-primary-page={pageKey}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
