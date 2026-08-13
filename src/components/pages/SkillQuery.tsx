"use client";

import { useMemo, useRef, useState } from "react";

import { Search, X } from "lucide-react";

import { filterOperators, type BuildingRoomPrefix } from "@/building-rooms";
import { Pagination } from "@/components/skill-query/Pagination";
import { SkillResultRow } from "@/components/skill-query/SkillResultRow";
import { SkillRoomTagBar } from "@/components/skill-query/SkillRoomTagBar";
import { Input } from "@/components/ui/input";
import { OPERATOR_CATALOG } from "@/operatorPortraits";

export const SKILL_QUERY_PAGE_SIZE = 10;

export function SkillQuery() {
  const [selectedRooms, setSelectedRooms] = useState<readonly BuildingRoomPrefix[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => filterOperators(OPERATOR_CATALOG, selectedRooms, query), [query, selectedRooms]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / SKILL_QUERY_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * SKILL_QUERY_PAGE_SIZE, safePage * SKILL_QUERY_PAGE_SIZE);

  function handleRoomsChange(next: readonly BuildingRoomPrefix[]) {
    setSelectedRooms(next);
    setPage(1);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleClearQuery() {
    handleQueryChange("");
    // 清空后把焦点还给输入框，方便直接继续输入
    searchInputRef.current?.focus();
  }

  return (
    <section className="min-w-0" aria-label="技能查询">
      <div className="mb-2 flex min-w-0 items-center gap-2.5">
        <span className="h-7 w-1.5 shrink-0 bg-[#FFD501]" aria-hidden="true" />
        <h1 className="truncate text-[21px] font-medium leading-none">技能查询</h1>
        <span className="font-number text-xs text-muted-foreground">{filtered.length} 名干员</span>
      </div>

      <div className="mt-3">
        <SkillRoomTagBar selected={selectedRooms} onChange={handleRoomsChange} />
      </div>

      <label className="relative mt-3 block">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={searchInputRef}
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          className="h-11 pr-10 pl-9 max-sm:pr-12"
          placeholder="搜索干员名称"
          aria-label="搜索干员名称"
        />
        {query ? (
          <button
            type="button"
            onClick={handleClearQuery}
            className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFD800] max-sm:size-11"
            aria-label="清空搜索"
            title="清空搜索"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </label>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">没有符合筛选条件的干员。</p>
        ) : (
          <>
            <div className="grid gap-3">
              {paged.map((operator) => (
                <SkillResultRow key={operator.id} operator={operator} />
              ))}
            </div>
            <div className="mt-4">
              <Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
