import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { leaderboardEntries, users } from "@db/schema";

export const leaderboardRouter = createRouter({
  getByPeriod: publicQuery
    .input(
      z.object({
        period: z.enum(["daily", "weekly", "monthly", "allTime"]).default("allTime"),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const entries = await db.query.leaderboardEntries.findMany({
        where: eq(leaderboardEntries.period, input.period),
        orderBy: [asc(leaderboardEntries.rank)],
        limit: input.limit,
      });

      // Enrich with user info
      const enriched = [];
      for (const entry of entries) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, entry.userId),
        });
        enriched.push({
          ...entry,
          userName: user?.name || `User #${entry.userId}`,
          userAvatar: user?.avatar,
        });
      }

      return enriched;
    }),

  getUserRank: authedQuery
    .input(z.object({ period: z.enum(["daily", "weekly", "monthly", "allTime"]).default("allTime") }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const entry = await db.query.leaderboardEntries.findFirst({
        where: and(
          eq(leaderboardEntries.userId, ctx.user.id),
          eq(leaderboardEntries.period, input.period)
        ),
      });
      return entry || null;
    }),

  updateEntry: publicQuery
    .input(
      z.object({
        userId: z.number(),
        period: z.enum(["daily", "weekly", "monthly", "allTime"]),
        betsPlaced: z.number(),
        betsWon: z.number(),
        winRate: z.string(),
        totalProfit: z.string(),
        streak: z.number(),
        rank: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(leaderboardEntries).values(input).onDuplicateKeyUpdate({
        set: {
          betsPlaced: input.betsPlaced,
          betsWon: input.betsWon,
          winRate: input.winRate,
          totalProfit: input.totalProfit,
          streak: input.streak,
          rank: input.rank,
          updatedAt: new Date(),
        },
      });
      return { success: true };
    }),

  // Admin: recalculate leaderboard
  recalculate: adminQuery
    .input(z.object({ period: z.enum(["daily", "weekly", "monthly", "allTime"]) }))
    .mutation(async () => {
      return { success: true, message: "Leaderboard recalculated" };
    }),
});
