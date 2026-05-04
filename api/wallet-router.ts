import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export const walletRouter = createRouter({
  getBalance: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });
    if (!user) throw new Error("User not found");
    return {
      usdt: user.balanceUsdt,
      bdt: user.balanceBdt,
      totalDeposited: user.totalDeposited,
      totalWithdrawn: user.totalWithdrawn,
      totalWagered: user.totalWagered,
      totalWon: user.totalWon,
    };
  }),

  connectWallet: authedQuery
    .input(z.object({
      walletAddress: z.string().min(10),
      walletType: z.enum(["metamask", "trustwallet", "walletconnect", "other"]).default("metamask"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(users)
        .set({ walletAddress: input.walletAddress })
        .where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  disconnectWallet: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db.update(users)
      .set({ walletAddress: null })
      .where(eq(users.id, ctx.user.id));
    return { success: true };
  }),

  // Generate deposit address (simulated)
  getDepositAddress: authedQuery
    .input(z.object({
      currency: z.enum(["USDT", "BTC"]).default("USDT"),
      network: z.enum(["ERC20", "BEP20", "TRC20"]).default("BEP20"),
    }))
    .query(async ({ input }) => {
      // In production, this would generate a real unique address per user
      const mockAddress = input.currency === "USDT"
        ? "0x" + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join("")
        : "bc1" + Array(39).fill(0).map(() => Math.floor(Math.random() * 36).toString(36)).join("");

      return {
        address: mockAddress,
        currency: input.currency,
        network: input.network,
        minDeposit: input.currency === "USDT" ? "10" : "0.001",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }),

  // Web3 verification (mock)
  verifyTransaction: publicQuery
    .input(z.object({
      txHash: z.string(),
      walletAddress: z.string(),
      amount: z.string(),
    }))
    .mutation(async () => {
      // In production, this would verify on-chain
      const verified = Math.random() > 0.1; // 90% success rate for demo
      return {
        verified,
        confirmations: verified ? Math.floor(Math.random() * 12) + 3 : 0,
        message: verified ? "Transaction verified on blockchain" : "Transaction not found, please check the hash",
      };
    }),
});
