import { Outlet } from "react-router";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import BetSlipPanel from "@/components/BetSlipPanel";
import { BetSlipProvider } from "@/providers/BetSlipProvider";

export default function Layout() {
  return (
    <BetSlipProvider>
      <div className="min-h-screen bg-[#0B0E14]">
        <Sidebar />
        <TopBar />
        <main className="md:pl-16 pt-14 min-h-screen">
          <Outlet />
        </main>
        <BetSlipPanel />
      </div>
    </BetSlipProvider>
  );
}
