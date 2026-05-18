import { BookOpen, PenLine, Headphones, Ruler, Mic } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/reading",   label: "Reading",   icon: BookOpen },
  { href: "/writing",   label: "Writing",   icon: PenLine,    comingSoon: true },
  { href: "/listening", label: "Listening", icon: Headphones, comingSoon: true },
  { href: "/grammar",   label: "Grammar",   icon: Ruler,      comingSoon: true },
  { href: "/speaking",  label: "Speaking",  icon: Mic,        comingSoon: true },
];
