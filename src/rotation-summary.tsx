import { cn } from "@/lib/utils";
import type { RotationJson } from "@/types";

const number = (value: number | null | undefined, digits = 1) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits).replace(/\.0$/, "") : "—";

export function RotationSummary({ rotation, active }: { rotation?: RotationJson; active: number }) {
  if (!rotation?.shifts?.length) return null;
  return (
    <section className="mb-3 rounded-lg border bg-muted/30 p-3" aria-label="三班效率汇总">
      <div className="grid gap-2 sm:grid-cols-3">
        {rotation.shifts.map((shift, index) => (
          <div key={shift.index ?? index} className={cn("rounded-md border bg-background p-2", index === active && "border-primary ring-1 ring-primary/20")}>
            <div className="text-xs font-medium">班次 {index + 1} · {number(shift.duration_hours, 0)}h</div>
            <div className="mt-1 grid grid-cols-3 gap-1 text-center text-xs text-muted-foreground">
              <span>贸易 <b className="block text-foreground">{number(shift.scores?.trade_score, 2)}</b></span>
              <span>制造 <b className="block text-foreground">{number(shift.scores?.manu_prod_sum)}</b></span>
              <span>发电 <b className="block text-foreground">{number(shift.scores?.power_charge_sum)}</b></span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t pt-2 text-xs">
        <strong>每日汇总</strong>
        <span>贸易 {number(rotation.daily.trade, 3)}</span>
        <span>制造 {number(rotation.daily.manu)}</span>
        <span>发电 {number(rotation.daily.power)}</span>
      </div>
    </section>
  );
}
