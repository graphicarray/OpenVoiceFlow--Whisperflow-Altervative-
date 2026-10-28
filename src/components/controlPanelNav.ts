import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Home,
  BarChart3,
  BookOpen,
  type LucideIcon,
} from "./icons";

export type ControlPanelView =
  | "home"
  | "insights"
  | "dictionary";

export interface ControlPanelNavItem {
  id: ControlPanelView;
  label: string;
  icon: LucideIcon;
  shortcutNumber: number;
}

export function useControlPanelNavItems(): ControlPanelNavItem[] {
  const { t } = useTranslation();

  return useMemo(() => {
    const items: Omit<ControlPanelNavItem, "shortcutNumber">[] = [
      { id: "home", label: t("sidebar.home"), icon: Home },
      { id: "insights", label: t("sidebar.insights"), icon: BarChart3 },
      { id: "dictionary", label: t("sidebar.dictionary"), icon: BookOpen },
    ];
    return items.map((item, idx) => ({ ...item, shortcutNumber: idx + 1 }));
  }, [t]);
}
