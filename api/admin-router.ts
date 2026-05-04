import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, matches, bets, transactions, announcements } from "@db/schema";

export const adminRouter = createRouter({
  // Dashboard stats
  getStats: adminQuery.query(async () => {
    const db = getDb();
    const [userCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const [betCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(bets);
    const [totalVolume] = await db.select({ total: sql<string>`SUM(amount)` }).from(transactions).where(eq(transactions.status, "approved"));
    const [pendingDeposits] = await db.select({ count: sql<number>`COUNT(*)` }).from(transactions).where(and(eq(transactions.type, "deposit"), eq(transactions.status, "pending")));
    const [pendingWithdrawals] = await db.select({ count: sql<number>`COUNT(*)` }).from(transactions).where(and(eq(transactions.type, "withdrawal"), eq(transactions.status, "pending")));

    return {
      totalUsers: userCount.count,
      totalBets: betCount.count,
      totalVolume: totalVolume.total || "0",
      pendingDeposits: pendingDeposits.count,
      pendingWithdrawals: pendingWithdrawals.count,
    };
  }),

  // User management
  listUsers: adminQuery
    .input(z.object({
      search: z.string().optional(),
      role: z.enum(["user", "admin"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.role) conditions.push(eq(users.role, input.role));
      if (input?.search) {
        conditions.push(sql`${users.name} LIKE ${`%${input.search}%`} OR ${users.email} LIKE ${`%${input.search}%`}`);
      }

      return db.query.users.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        orderBy: [desc(users.createdAt)],
      });
    }),

  updateUserRole: adminQuery
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Match management
  createMatch: adminQuery
    .input(z.object({
      homeTeam: z.string(),
      awayTeam: z.string(),
      league: z.string(),
      matchDate: z.string(),
      homeOdds: z.string(),
      drawOdds: z.string(),
      awayOdds: z.string(),
      isFeatured: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(matches).values({
        homeTeam: input.homeTeam,
        awayTeam: input.awayTeam,
        league: input.league,
        matchDate: new Date(input.matchDate),
        homeOdds: input.homeOdds,
        drawOdds: input.drawOdds,
        awayOdds: input.awayOdds,
        isFeatured: input.isFeatured,
        homeScore: 0,
        awayScore: 0,
        minute: 0,
        status: "scheduled",
      });
      return { success: true };
    }),

  updateMatch: adminQuery
    .input(z.object({
      id: z.number(),
      homeScore: z.number().optional(),
      awayScore: z.number().optional(),
      minute: z.number().optional(),
      status: z.enum(["scheduled", "live", "finished", "postponed", "cancelled"]).optional(),
      isFeatured: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updateData } = input;
      await db.update(matches).set({ ...updateData, updatedAt: new Date() }).where(eq(matches.id, id));
      return { success: true };
    }),

  deleteMatch: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(matches).where(eq(matches.id, input.id));
      return { success: true };
    }),

  // Settle bets
  settleBetsForMatch: adminQuery
    .input(z.object({
      matchId: z.number(),
      homeScore: z.number(),
      awayScore: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const matchBets = await db.query.bets.findMany({
        where: and(eq(bets.matchId, input.matchId), eq(bets.status, "pending")),
      });

      const { homeScore, awayScore } = input;
      const isDraw = homeScore === awayScore;
      const homeWin = homeScore > awayScore;

      for (const bet of matchBets) {
        let won = false;

        switch (bet.market) {
          case "1x2":
            if (bet.selection === "home" && homeWin) won = true;
            if (bet.selection === "draw" && isDraw) won = true;
            if (bet.selection === "away" && !homeWin && !isDraw) won = true;
            break;
          case "over_under":
            const totalGoals = homeScore + awayScore;
            if (bet.selection === "over" && totalGoals > 2.5) won = true;
            if (bet.selection === "under" && totalGoals <= 2.5) won = true;
            break;
          case "btts":
            if (bet.selection === "yes" && homeScore > 0 && awayScore > 0) won = true;
            if (bet.selection === "no" && (homeScore === 0 || awayScore === 0)) won = true;
            break;
        }

        const newStatus = won ? "won" : "lost";
        await db.update(bets)
          .set({ status: newStatus, settledAt: new Date() })
          .where(eq(bets.id, bet.id));

        // Credit winnings
        if (won) {
          const user = await db.query.users.findFirst({ where: eq(users.id, bet.userId) });
          if (user) {
            const newBalance = (parseFloat(user.balanceUsdt || "0") + parseFloat(bet.potentialReturn || "0")).toFixed(8);
            const newWon = (parseFloat(user.totalWon || "0") + parseFloat(bet.potentialReturn || "0")).toFixed(8);
            await db.update(users)
              .set({ balanceUsdt: newBalance, totalWon: newWon })
              .where(eq(users.id, bet.userId));
          }
        }
      }

      return { success: true, settledBets: matchBets.length };
    }),

  // Announcements
  createAnnouncement: adminQuery
    .input(z.object({
      title: z.string(),
      content: z.string(),
      type: z.enum(["info", "warning", "promotion", "flash_event"]),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(announcements).values(input);
      return { success: true };
    }),

  updateAnnouncement: adminQuery
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      type: z.enum(["info", "warning", "promotion", "flash_event"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updateData } = input;
      await db.update(announcements).set(updateData).where(eq(announcements.id, id));
      return { success: true };
    }),

  deleteAnnouncement: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(announcements).where(eq(announcements.id, input.id));
      return { success: true };
    }),

  getAnnouncements: adminQuery.query(async () => {
    const db = getDb();
    return db.query.announcements.findMany({
      orderBy: [desc(announcements.createdAt)],
    });
  }),
});
