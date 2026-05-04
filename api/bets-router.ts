import { z } from "zod";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bets, users, betSlipSelections } from "@db/schema";

export const betsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.bets.findMany({
      where: eq(bets.userId, ctx.user.id),
      orderBy: [desc(bets.createdAt)],
      limit: 100,
    });
  }),

  getActive: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.bets.findMany({
      where: and(eq(bets.userId, ctx.user.id), eq(bets.status, "pending")),
      orderBy: [desc(bets.createdAt)],
    });
  }),

  getHistory: authedQuery
    .input(
      z.object({
        status: z.enum(["pending", "won", "lost", "cashed_out", "cancelled"]).optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(bets.userId, ctx.user.id)];

      if (input?.status) conditions.push(eq(bets.status, input.status));
      if (input?.fromDate) conditions.push(gte(bets.createdAt, new Date(input.fromDate)));
      if (input?.toDate) conditions.push(lte(bets.createdAt, new Date(input.toDate)));

      return db.query.bets.findMany({
        where: and(...conditions),
        orderBy: [desc(bets.createdAt)],
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      });
    }),

  placeBet: authedQuery
    .input(
      z.object({
        matchId: z.number(),
        market: z.enum(["1x2", "over_under", "btts", "correct_score", "htft", "asian_handicap", "flash_goal", "virtual_match"]),
        selection: z.string(),
        odds: z.string(),
        stake: z.string(),
        isComboBet: z.boolean().default(false),
        comboBets: z.array(z.object({
          matchId: z.number(),
          market: z.string(),
          selection: z.string(),
          odds: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) throw new Error("User not found");

      const stakeNum = parseFloat(input.stake);
      const balance = parseFloat(user.balanceUsdt);

      if (stakeNum > balance) {
        throw new Error("Insufficient balance");
      }

      const potentialReturn = (stakeNum * parseFloat(input.odds)).toFixed(8);

      // Create the bet
      await db.insert(bets).values({
        userId: ctx.user.id,
        matchId: input.matchId,
        market: input.market,
        selection: input.selection,
        odds: input.odds,
        stake: input.stake,
        potentialReturn,
        status: "pending",
        isComboBet: input.isComboBet,
        comboBets: input.comboBets ? JSON.stringify(input.comboBets) : null,
      });

      // Deduct balance
      const newBalance = (balance - stakeNum).toFixed(8);
      const newWagered = (parseFloat(user.totalWagered || "0") + stakeNum).toFixed(8);

      await db.update(users)
        .set({
          balanceUsdt: newBalance,
          totalWagered: newWagered,
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  cashOut: authedQuery
    .input(z.object({ betId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const bet = await db.query.bets.findFirst({
        where: and(eq(bets.id, input.betId), eq(bets.userId, ctx.user.id)),
      });

      if (!bet || bet.status !== "pending") throw new Error("Bet not available for cash out");

      // Calculate cash out value (simplified: 70% of potential return)
      const cashOutVal = (parseFloat(bet.potentialReturn || "0") * 0.7).toFixed(8);

      await db.update(bets)
        .set({ status: "cashed_out", cashOutValue: cashOutVal, settledAt: new Date() })
        .where(eq(bets.id, input.betId));

      // Return cash out amount to user balance
      const user = await db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
      if (user) {
        const newBalance = (parseFloat(user.balanceUsdt || "0") + parseFloat(cashOutVal)).toFixed(8);
        await db.update(users).set({ balanceUsdt: newBalance }).where(eq(users.id, ctx.user.id));
      }

      return { success: true, cashOutValue: cashOutVal };
    }),

  getBetSlip: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.betSlipSelections.findMany({
      where: eq(betSlipSelections.userId, ctx.user.id),
      orderBy: [desc(betSlipSelections.createdAt)],
    });
  }),

  addToSlip: authedQuery
    .input(
      z.object({
        matchId: z.number(),
        market: z.enum(["1x2", "over_under", "btts", "correct_score", "htft", "asian_handicap"]),
        selection: z.string(),
        odds: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(betSlipSelections).values({
        userId: ctx.user.id,
        matchId: input.matchId,
        market: input.market,
        selection: input.selection,
        odds: input.odds,
      });
      return { success: true };
    }),

  removeFromSlip: authedQuery
    .input(z.object({ selectionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(betSlipSelections)
        .where(and(eq(betSlipSelections.id, input.selectionId), eq(betSlipSelections.userId, ctx.user.id)));
      return { success: true };
    }),

  clearSlip: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db.delete(betSlipSelections).where(eq(betSlipSelections.userId, ctx.user.id));
    return { success: true };
  }),

  getStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userBets = await db.query.bets.findMany({
      where: eq(bets.userId, ctx.user.id),
    });

    const totalBets = userBets.length;
    const wonBets = userBets.filter(b => b.status === "won").length;
    const winRate = totalBets > 0 ? ((wonBets / totalBets) * 100).toFixed(2) : "0";

    const totalProfit = userBets.reduce((acc, b) => {
      if (b.status === "won") return acc + parseFloat(b.potentialReturn || "0");
      if (b.status === "lost") return acc - parseFloat(b.stake || "0");
      if (b.status === "cashed_out") return acc + parseFloat(b.cashOutValue || "0") - parseFloat(b.stake || "0");
      return acc;
    }, 0);

    return {
      totalBets,
      wonBets,
      lostBets: userBets.filter(b => b.status === "lost").length,
      pendingBets: userBets.filter(b => b.status === "pending").length,
      winRate,
      totalProfit: totalProfit.toFixed(8),
    };
  }),
});
