import { useState } from "react";
import { Link } from "react-router";
import { Search, Bell, Wallet, User, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

export default function TopBar() {
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: balance } = trpc.wallet.getBalance.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: searchResults } = trpc.matches.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#0B0E14]/95 backdrop-blur-md border-b border-[#1E2A3A] z-40 flex items-center justify-between px-4 md:pl-20">
      {/* Left - Mobile menu + Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-[#8B95A8] hover:text-white"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-2 text-[#8B95A8] hover:text-white transition-colors"
          >
            <Search size={18} />
            <span className="hidden sm:inline text-sm">Search matches...</span>
            <span className="hidden sm:inline text-xs text-[#4A5568] border border-[#1E2A3A] px-1.5 py-0.5 rounded">Ctrl K</span>
          </button>

          {showSearch && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-[#121824] border border-[#1E2A3A] rounded-lg shadow-2xl z-50 overflow-hidden">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams, leagues, matches..."
                className="w-full px-4 py-3 bg-transparent text-white text-sm outline-none border-b border-[#1E2A3A]"
              />
              <div className="max-h-64 overflow-y-auto">
                {searchResults && searchResults.length > 0 ? (
                  searchResults.map((match) => (
                    <Link
                      key={match.id}
                      to={`/match/${match.id}`}
                      onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[#1A2234] transition-colors"
                    >
                      <div className="w-8 h-8 rounded bg-[#1A2234] flex items-center justify-center text-xs">⚽</div>
                      <div>
                        <p className="text-sm text-white font-medium">{match.homeTeam} vs {match.awayTeam}</p>
                        <p className="text-xs text-[#8B95A8]">{match.league}</p>
                      </div>
                    </Link>
                  ))
                ) : searchQuery.length > 2 ? (
                  <p className="px-4 py-3 text-sm text-[#8B95A8]">No matches found</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right - Wallet, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Balance display */}
        {balance && (
          <div className="hidden sm:flex items-center gap-2 bg-[#121824] border border-[#1E2A3A] rounded-lg px-3 py-1.5">
            <Wallet size={16} className="text-[#00D26A]" />
            <span className="text-sm font-mono-nums font-semibold text-white">{parseFloat(balance.usdt).toFixed(2)}</span>
            <span className="text-xs text-[#8B95A8]">USDT</span>
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-[#8B95A8] hover:text-white transition-colors"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF4757] rounded-full" />
          </button>
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-[#121824] border border-[#1E2A3A] rounded-lg shadow-2xl z-50">
              <div className="px-4 py-3 border-b border-[#1E2A3A]">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
              </div>
              <div className="p-2">
                <div className="px-3 py-2 rounded hover:bg-[#1A2234] cursor-pointer">
                  <p className="text-sm text-white">Match starting soon: Brazil vs Argentina</p>
                  <p className="text-xs text-[#8B95A8]">In 2 hours</p>
                </div>
                <div className="px-3 py-2 rounded hover:bg-[#1A2234] cursor-pointer">
                  <p className="text-sm text-white">Your bet was settled: WON</p>
                  <p className="text-xs text-[#8B95A8]">+45.50 USDT</p>
                </div>
                <div className="px-3 py-2 rounded hover:bg-[#1A2234] cursor-pointer">
                  <p className="text-sm text-white">Deposit approved</p>
                  <p className="text-xs text-[#8B95A8]">100 USDT credited</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1A2234] border border-[#1E2A3A] flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-[#8B95A8]" />
            )}
          </div>
          <span className="hidden lg:inline text-sm text-white font-medium">{user?.name || "Guest"}</span>
        </Link>
      </div>
    </header>
  );
}
