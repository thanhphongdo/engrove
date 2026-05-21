import { BookOpen, PenLine, Headphones, Ruler, Mic, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/reading",   label: "Reading",   icon: BookOpen },
  { href: "/writing",   label: "Writing",   icon: PenLine },
  { href: "/listening", label: "Listening", icon: Headphones, comingSoon: true },
  { href: "/grammar",   label: "Grammar",   icon: Ruler,      comingSoon: true },
  { href: "/speaking",  label: "Speaking",  icon: Mic,        comingSoon: true },
  { href: "/vocab",     label: "Vocab",     icon: Sparkles },
];
