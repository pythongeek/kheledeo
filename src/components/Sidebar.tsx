import { Link, useLocation } from "react-router";
import {
  Home, Radio, Calendar, Trophy, Bot, Gamepad2, Wallet, LayoutDashboard,
  Settings, Shield, LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Radio, label: "Live", path: "/live" },
  { icon: Calendar, label: "Matches", path: "/matches" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  { icon: Bot, label: "AI Chat", path: "/ai-chat" },
  { icon: Gamepad2, label: "Virtual", path: "/virtual" },
];

const bottomItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-[#121824] border-r border-[#1E2A3A] z-50 flex flex-col items-center py-4 hidden md:flex">
      {/* Logo */}
      <Link to="/" className="mb-8">
        <div className="w-10 h-10 rounded-lg bg-[#00D26A] flex items-center justify-center">
          <span className="text-[#0B0E14] font-bold text-lg">B</span>
        </div>
      </Link>

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col items-center gap-2 w-full">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`w-full flex items-center justify-center py-3 relative group transition-all duration-200 ${
              isActive(item.path)
                ? "text-[#00D26A]"
                : "text-[#8B95A8] hover:text-white"
            }`}
          >
            {isActive(item.path) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00D26A] rounded-r-full" />
            )}
            <item.icon size={22} strokeWidth={2} />
            <div className="absolute left-14 bg-[#1A2234] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-[#1E2A3A]">
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className="flex flex-col items-center gap-2 w-full">
        {bottomItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`w-full flex items-center justify-center py-3 relative group transition-all duration-200 ${
              isActive(item.path)
                ? "text-[#00D26A]"
                : "text-[#8B95A8] hover:text-white"
            }`}
          >
            {isActive(item.path) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00D26A] rounded-r-full" />
            )}
            <item.icon size={22} strokeWidth={2} />
            <div className="absolute left-14 bg-[#1A2234] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-[#1E2A3A]">
              {item.label}
            </div>
          </Link>
        ))}

        {user?.role === "admin" && (
          <Link
            to="/admin"
            className={`w-full flex items-center justify-center py-3 relative group transition-all duration-200 ${
              isActive("/admin")
                ? "text-[#FFD700]"
                : "text-[#8B95A8] hover:text-[#FFD700]"
            }`}
          >
            {isActive("/admin") && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#FFD700] rounded-r-full" />
            )}
            <Shield size={22} strokeWidth={2} />
            <div className="absolute left-14 bg-[#1A2234] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-[#1E2A3A]">
              Admin
            </div>
          </Link>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center justify-center py-3 text-[#8B95A8] hover:text-[#FF4757] transition-all duration-200 group relative"
        >
          <LogOut size={22} strokeWidth={2} />
          <div className="absolute left-14 bg-[#1A2234] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-[#1E2A3A]">
            Logout
          </div>
        </button>
      </div>
    </aside>
  );
}
