import { X, Trash2, Check } from "lucide-react";
import { useBetSlip } from "@/providers/BetSlipProvider";
import { trpc } from "@/providers/trpc";
import { useState } from "react";

export default function BetSlipPanel() {
  const { selections, removeSelection, clearSlip, isOpen, setIsOpen, totalOdds } = useBetSlip();
  const [stake, setStake] = useState("10");
  const [placed, setPlaced] = useState(false);

  const placeBet = trpc.bets.placeBet.useMutation({
    onSuccess: () => {
      setPlaced(true);
      setTimeout(() => {
        clearSlip();
        setPlaced(false);
        setIsOpen(false);
      }, 2000);
    },
  });

  const potentialReturn = (parseFloat(stake || "0") * totalOdds).toFixed(2);

  const handlePlaceBet = () => {
    if (selections.length === 0) return;
    const first = selections[0];
    placeBet.mutate({
      matchId: first.matchId,
      market: first.market as any,
      selection: first.selection,
      odds: totalOdds.toFixed(3),
      stake,
      isComboBet: selections.length > 1,
      comboBets: selections.length > 1
        ? selections.map((s) => ({
            matchId: s.matchId,
            market: s.market,
            selection: s.selection,
            odds: s.odds,
          }))
        : undefined,
    });
  };

  if (!isOpen && selections.length === 0) return null;

  return (
    <>
      {/* Mobile bottom sheet */}
      <div className={`fixed bottom-0 left-0 right-0 md:left-16 md:top-14 md:right-auto md:bottom-auto md:w-80 bg-[#121824] border-t md:border-t-0 md:border-l border-[#1E2A3A] z-40 transition-transform duration-300 ${
        isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full md:translate-y-0"
      } md:h-[calc(100vh-3.5rem)]`}>
        <div className="flex items-center justify-between p-4 border-b border-[#1E2A3A]">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">Bet Slip</h3>
            <span className="bg-[#00D26A] text-[#0B0E14] text-xs font-bold px-2 py-0.5 rounded-full">
              {selections.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSlip}
              className="p-1.5 text-[#8B95A8] hover:text-[#FF4757] transition-colors"
              title="Clear all"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-[#8B95A8] hover:text-white transition-colors md:hidden"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-[50vh] md:max-h-[calc(100vh-250px)] overflow-y-auto">
          {selections.length === 0 ? (
            <p className="text-sm text-[#8B95A8] text-center py-8">Your bet slip is empty. Select odds to add bets.</p>
          ) : (
            selections.map((sel) => (
              <div key={`${sel.matchId}-${sel.market}`} className="bg-[#1A2234] rounded-lg p-3 border border-[#1E2A3A]">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-white font-medium">{sel.homeTeam} vs {sel.awayTeam}</p>
                    <p className="text-xs text-[#8B95A8]">{sel.market} - {sel.selection}</p>
                  </div>
                  <button
                    onClick={() => removeSelection(sel.matchId, sel.market)}
                    className="text-[#8B95A8] hover:text-[#FF4757]"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8B95A8]">Odds</span>
                  <span className="font-mono-nums font-semibold text-[#00D26A]">{sel.odds}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {selections.length > 0 && (
          <div className="p-4 border-t border-[#1E2A3A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8B95A8]">Total Odds</span>
              <span className="font-mono-nums font-semibold text-white">{totalOdds.toFixed(3)}</span>
            </div>

            <div>
              <label className="text-xs text-[#8B95A8] mb-1 block">Stake (USDT)</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStake((prev) => Math.max(1, parseFloat(prev) - 5).toString())}
                  className="w-8 h-8 bg-[#1A2234] border border-[#1E2A3A] rounded text-white hover:bg-[#2A3A4A]"
                >
                  -
                </button>
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="flex-1 bg-[#1A2234] border border-[#1E2A3A] rounded px-3 py-2 text-white text-center font-mono-nums"
                />
                <button
                  onClick={() => setStake((prev) => (parseFloat(prev) + 5).toString())}
                  className="w-8 h-8 bg-[#1A2234] border border-[#1E2A3A] rounded text-white hover:bg-[#2A3A4A]"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8B95A8]">Potential Return</span>
              <span className="font-mono-nums font-bold text-[#00D26A]">{potentialReturn} USDT</span>
            </div>

            <button
              onClick={handlePlaceBet}
              disabled={placeBet.isPending || placed}
              className="w-full py-3 bg-[#00D26A] hover:bg-[#00B85C] text-[#0B0E14] font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {placed ? (
                <>
                  <Check size={18} />
                  Bet Placed!
                </>
              ) : placeBet.isPending ? (
                "Placing..."
              ) : (
                `Place Bet (${selections.length})`
              )}
            </button>
          </div>
        )}
      </div>

      {/* Toggle button when closed */}
      {!isOpen && selections.length > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-40 bg-[#00D26A] text-[#0B0E14] px-4 py-3 rounded-full font-semibold shadow-lg flex items-center gap-2 md:hidden"
        >
          Bet Slip ({selections.length})
        </button>
      )}
    </>
  );
}
