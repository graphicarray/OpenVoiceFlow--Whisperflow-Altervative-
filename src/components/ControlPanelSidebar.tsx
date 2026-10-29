import React, { useEffect, useState } from "react";
import { Settings } from "./icons";
import { useTranslation } from "react-i18next";
import { cn } from "./lib/utils";
import { BrandMark } from "./ui/BrandMark";
import { useControlPanelNavItems, type ControlPanelView } from "./controlPanelNav";
import { openExternalLink } from "../utils/externalLinks";

export type { ControlPanelView };

const LINKEDIN_PROFILE_URL = "https://www.linkedin.com/in/graphicarray";

const rowIconClass =
  "shrink-0 text-foreground/70 group-hover:text-foreground/90 dark:text-foreground/65 dark:group-hover:text-foreground/85 transition-colors duration-150";
const rowLabelClass =
  "text-[13px] text-foreground/90 group-hover:text-foreground dark:text-foreground/85 dark:group-hover:text-foreground transition-colors duration-150";
const rowButtonClass =
  "group flex items-center gap-2.5 w-full h-8 px-2.5 rounded-md text-start outline-none hover:bg-foreground/4 dark:hover:bg-white/4 focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors duration-150";

interface ControlPanelSidebarProps {
  activeView: ControlPanelView;
  onViewChange: (view: ControlPanelView) => void;
  onOpenSettings: () => void;
  updateAction?: React.ReactNode;
}

export default function ControlPanelSidebar({
  activeView,
  onViewChange,
  onOpenSettings,
  updateAction,
}: ControlPanelSidebarProps) {
  const { t } = useTranslation();
  const navItems = useControlPanelNavItems();
  const [version, setVersion] = useState("");
  useEffect(() => {
    window.electronAPI
      ?.getAppVersion?.()
      .then((r) => setVersion(r?.version ?? ""))
      .catch(() => {});
  }, []);

  const handleOpenLinkedIn = (e: React.MouseEvent) => {
    e.preventDefault();
    openExternalLink(LINKEDIN_PROFILE_URL);
  };

  return (
    <div className="w-56 h-full shrink-0 flex flex-col bg-surface-window">
      <div
        className="w-full h-10 shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      <a
        href={LINKEDIN_PROFILE_URL}
        onClick={handleOpenLinkedIn}
        title="Visit Graphicarray on LinkedIn (linkedin.com/in/graphicarray)"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        className="group flex items-center gap-3 px-4 pb-3 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-1 focus-visible:ring-primary/30 cursor-pointer"
      >
        <BrandMark size={44} title="Graphicarray" className="shrink-0 transition-transform duration-150 group-hover:scale-[1.03]" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            Open Voice Flow
          </p>
          <p className="inline-flex items-center gap-1 text-[11px] font-medium leading-tight text-primary group-hover:underline">
            <span>by Graphicarray</span>
            <svg
              viewBox="0 0 24 24"
              width="11"
              height="11"
              fill="currentColor"
              aria-hidden="true"
              className="shrink-0 opacity-85"
            >
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
            </svg>
          </p>
        </div>
      </a>

      <nav className="flex flex-col gap-0.5 px-2 pt-2 pb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "group relative flex items-center gap-2.5 w-full h-8 px-2.5 rounded-md outline-none transition-colors duration-150 text-start",
                "focus-visible:ring-1 focus-visible:ring-primary/30",
                isActive
                  ? "bg-primary/8 dark:bg-primary/10"
                  : "hover:bg-foreground/4 dark:hover:bg-white/4 active:bg-foreground/6"
              )}
            >
              <Icon
                size={16}
                className={cn(
                  "shrink-0 transition-colors duration-150",
                  isActive
                    ? "text-primary"
                    : "text-foreground/70 group-hover:text-foreground/90 dark:text-foreground/65 dark:group-hover:text-foreground/85"
                )}
              />
              <span
                className={cn(
                  "text-[13px] transition-colors duration-150",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-foreground/90 group-hover:text-foreground dark:text-foreground/85 dark:group-hover:text-foreground"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="px-2 pb-2 space-y-0.5">
        {updateAction && (
          <div className="px-1 pb-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            {updateAction}
          </div>
        )}

        <button
          onClick={onOpenSettings}
          aria-label={t("sidebar.settings")}
          className={rowButtonClass}
        >
          <Settings size={16} className={rowIconClass} />
          <span className={rowLabelClass}>{t("sidebar.settings")}</span>
        </button>

        <div className="flex items-center justify-between gap-2 px-2.5 pt-2">
          <a
            href={LINKEDIN_PROFILE_URL}
            onClick={handleOpenLinkedIn}
            title="linkedin.com/in/graphicarray"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            className="inline-flex items-center gap-1.5 truncate text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <BrandMark size={14} className="shrink-0 rounded-[3px]" />
            <span className="truncate font-medium">Graphicarray</span>
            <svg
              viewBox="0 0 24 24"
              width="11"
              height="11"
              fill="currentColor"
              aria-hidden="true"
              className="shrink-0 text-[#0A66C2] dark:text-[#38bdf8]"
            >
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
            </svg>
          </a>
          {version && (
            <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              v{version}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
