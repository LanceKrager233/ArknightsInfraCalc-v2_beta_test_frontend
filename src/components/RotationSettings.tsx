"use client";

import { Clock3 } from "lucide-react";
import { useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

import {
  ROTATION_OPTIONS,
  rotationOption,
} from "../rotation-settings";
import type { RotationProfile } from "../types";

type RotationSettingsProps = {
  value: RotationProfile;
  onChange: (value: RotationProfile) => void;
};

const ROTATION_COMBOBOX_OPTIONS = ROTATION_OPTIONS.map((option) => ({
  value: option.profile,
  label: `${option.label} · ${option.durations.join("/")}`,
}));

export function RotationSettings({ value, onChange }: RotationSettingsProps) {
  const [query, setQuery] = useState<string | null>(null);
  const selected = rotationOption(value);
  const selectedComboboxOption = ROTATION_COMBOBOX_OPTIONS.find((option) => option.value === value) ?? null;
  const cycleHours = selected.durations.reduce((total, duration) => total + duration, 0);

  return (
    <section aria-labelledby="rotation-settings-title" className="rounded-lg bg-muted/45 p-3">
      <div className="flex items-start gap-2">
        <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h4 id="rotation-settings-title" className="text-sm font-semibold">换班设置</h4>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">选择当前求解器支持的固定换班方案。</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <Label htmlFor="rotation-profile" className="text-xs text-muted-foreground">换班方式</Label>
        <Combobox
          items={ROTATION_COMBOBOX_OPTIONS}
          value={selectedComboboxOption}
          inputValue={query ?? selectedComboboxOption?.label ?? ""}
          itemToStringValue={(option) => option.label}
          isItemEqualToValue={(option, selectedOption) => option.value === selectedOption.value}
          autoHighlight
          onInputValueChange={(inputValue) => setQuery(inputValue)}
          onOpenChange={(open) => {
            if (!open) setQuery(null);
          }}
          onValueChange={(option) => {
            if (option) {
              setQuery(null);
              onChange(option.value);
            }
          }}
        >
          <ComboboxInput
            id="rotation-profile"
            className="h-11 w-full bg-background"
            aria-label="换班方式"
            placeholder="搜索换班方式"
          />
          <ComboboxContent align="start">
            <ComboboxEmpty>没有匹配的换班方式</ComboboxEmpty>
            <ComboboxList>
              {(option) => (
                <ComboboxItem key={option.value} value={option}>
                  {option.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="班次时长">
        {selected.durations.map((duration, index) => (
          <span key={`${index}-${duration}`} className="rounded-md bg-background px-2 py-1 text-xs tabular-nums shadow-xs">
            第 {index + 1} 班 {duration}h
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">完整循环 {cycleHours} 小时</p>
    </section>
  );
}
