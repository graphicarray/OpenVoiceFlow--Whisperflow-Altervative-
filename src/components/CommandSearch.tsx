import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Search, Mic } from "./icons";
import type { TranscriptionItem } from "../types/electron";

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcriptions: TranscriptionItem[];
  onTranscriptSelect: (id: number) => void;
}

interface SearchResult {
  id: string;
  type: "transcript";
  title: string;
  subtitle?: string;
  timestamp?: string;
  rawId: number;
}

export default function CommandSearch({
  open,
  onOpenChange,
  transcriptions,
  onTranscriptSelect,
}: CommandSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    const items: SearchResult[] = [];

    for (const tr of transcriptions) {
      const text = tr.text || "";
      if (!q || text.toLowerCase().includes(q)) {
        const firstLine = text.split("\n")[0] || t("commandSearch.untitledTranscript");
        items.push({
          id: `transcript-${tr.id}`,
          type: "transcript",
          title: firstLine.slice(0, 80),
          subtitle: text.length > 80 ? text.slice(0, 120) + "..." : undefined,
          timestamp: tr.timestamp,
          rawId: tr.id,
        });
      }
      if (!q && items.length >= 10) break;
      if (q && items.length >= 25) break;
    }

    return items;
  }, [query, transcriptions, t]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    onTranscriptSelect(result.rawId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden bg-popover border-border shadow-2xl sm:rounded-xl [&>button]:hidden">
        <DialogTitle className="sr-only">{t("commandSearch.dialogTitle")}</DialogTitle>
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("commandSearch.inputPlaceholder", {
              defaultValue: "Search transcripts...",
            })}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-foreground">{t("commandSearch.noResults")}</p>
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-start transition-colors ${
                  idx === selectedIndex
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground/80 hover:bg-muted/50"
                }`}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-muted/60 text-muted-foreground">
                  <Mic size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/50 shrink-0">
                  {t("commandSearch.badge.transcript")}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
