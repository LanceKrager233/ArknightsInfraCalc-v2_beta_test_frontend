"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface WebsiteAccountDialogSkeletonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebsiteAccountDialogSkeleton({
  open,
  onOpenChange,
}: WebsiteAccountDialogSkeletonProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-website-account-dialog
        data-website-account-dialog-skeleton
        aria-busy="true"
        className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-[min(880px,calc(100vw-2rem))]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>登录网站账号</DialogTitle>
          <DialogDescription>登录界面正在加载。</DialogDescription>
        </DialogHeader>
        <div
          className="relative z-[1] surface-shadow overflow-hidden rounded-none ring-0"
          role="status"
          aria-label="正在加载登录界面"
          aria-live="polite"
        >
          <div className="grid lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.25fr)]">
            <div className="border-b border-border/70 px-6 py-7 lg:border-b-0 lg:border-r lg:px-8 lg:py-9">
              <Skeleton className="mb-6 size-10 rounded-lg" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-44 max-w-full" />
              <div className="mt-4 grid gap-2">
                <Skeleton className="h-4 w-full max-w-72" />
                <Skeleton className="h-4 w-4/5 max-w-60" />
              </div>
            </div>

            <div className="grid min-h-80 grid-rows-[1fr_auto]">
              <div className="grid content-start gap-4 px-5 py-6 sm:px-8 sm:py-8">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-11 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-11 w-full" />
                </div>
              </div>
              <div className="grid gap-3 border-t px-5 py-4 sm:px-8 sm:py-5">
                <Skeleton className="h-[46px] w-full" />
                <div className="flex min-h-11 items-center justify-center gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
