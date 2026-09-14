"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  LineChart,
  BrainCircuit,
  Globe2,
  Zap,
  Users,
  BriefcaseBusiness,
  Settings,
} from "lucide-react";

const items = [
  { label: "Markets", href: "/", icon: LayoutDashboard },
  { label: "Charts", href: "/charts", icon: LineChart },
  { label: "Indian Markets", href: "/indian-markets", icon: LineChart },
  { label: "AI Analyze", href: "/analyze", icon: BrainCircuit },
  { label: "Strategies", href: "/strategies", icon: Zap },
  { label: "Earth Radar", href: "/radar", icon: Globe2 },
  { label: "Trades", href: "/trades", icon: BriefcaseBusiness },
  { label: "Community", href: "/community", icon: Users },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-white/10 bg-[#090d14] p-5 lg:block">
      <div className="mb-8">
        <div className="text-2xl font-black tracking-wide">
          NEXORA <span className="text-cyan-400">AI</span>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Market Intelligence
        </div>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-5 left-5 right-5">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <Settings size={18} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
