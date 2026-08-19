"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import termCatalogJson from "@/generated/arkntools/term-catalog.json" with { type: "json" };
import { parseRichText, type RichTextNode } from "@/components/skill-query/rich-text";

type TermRecord = { id: string; name: string; desc: string; descText: string };
const TERM_CATALOG = termCatalogJson as Record<string, TermRecord>;

function renderNodes(
  nodes: readonly RichTextNode[],
  onTermOpen: (id: string) => void,
  interactive: boolean,
): ReactNode {
  return nodes.map((node, index) => {
    if (node.type === "text") return node.text;
    if (node.type === "style") {
      return (
        <span key={index} className={`riic-rt ${node.className}`}>
          {renderNodes(node.children, onTermOpen, interactive)}
        </span>
      );
    }
    const term = TERM_CATALOG[node.id];
    if (!term) {
      return <span key={index}>{renderNodes(node.children, onTermOpen, interactive)}</span>;
    }
    if (!interactive) {
      return (
        <span key={index} className="riic-term riic-term-static">
          {renderNodes(node.children, onTermOpen, false)}
        </span>
      );
    }
    return (
      <button
        key={index}
        type="button"
        className="riic-term"
        onClick={() => onTermOpen(node.id)}
      >
        {renderNodes(node.children, onTermOpen, true)}
      </button>
    );
  });
}

/**
 * 基建技能富文本渲染：`<@cc.xxx>` 上色、`<$cc.xxx>` 渲染为可点击词条。
 * 词条点击默认打开本组件管理的弹窗；通过 `onTermOpen` 可把词条点击交给外层（弹窗内嵌套时追加到同一弹窗）。
 */
export function RichText({
  text,
  onTermOpen,
  interactive = true,
}: {
  text: string;
  onTermOpen?: (id: string) => void;
  /** 为 false 时词条只渲染样式、不可点击（用于 tooltip 等弹窗不稳定的容器）。 */
  interactive?: boolean;
}) {
  const [termStack, setTermStack] = useState<string[]>([]);
  const nodes = useMemo(() => parseRichText(text), [text]);

  const openTerm = (id: string) => {
    if (onTermOpen) {
      onTermOpen(id);
      return;
    }
    if (!interactive) return;
    setTermStack((current) => (current.includes(id) ? current : [...current, id]));
  };

  const dialogOpen = termStack.length > 0;
  return (
    <>
      <span className="whitespace-pre-line">{renderNodes(nodes, openTerm, interactive)}</span>
      {interactive && !onTermOpen ? (
        <Dialog open={dialogOpen} onOpenChange={(next) => { if (!next) setTermStack([]); }}>
          <DialogContent>
            <DialogHeader className="pb-0 sm:pb-0">
              <DialogTitle>基建词条</DialogTitle>
            </DialogHeader>
            <DialogBody className="gap-3">
              {termStack.map((id) => {
                const term = TERM_CATALOG[id];
                if (!term) return null;
                return (
                  <div key={id} className="min-w-0">
                    <h4 className="font-semibold">{term.name}</h4>
                    <RichText text={term.desc} onTermOpen={openTerm} />
                  </div>
                );
              })}
            </DialogBody>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
