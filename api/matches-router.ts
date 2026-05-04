import { z } from "zod";
import { eq, and, gte, desc, asc, sql } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { matches } from "@db/schema";

export const matchesRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        status: z.enum(["scheduled", "live", "finished", "postponed", "cancelled"]).optional(),
        league: z.string().optional(),
        isFeatured: z.boolean().optional(),
        isVirtual: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      
      if (input?.status) conditions.push(eq(matches.status, input.status));
      if (input?.league) conditions.push(eq(matches.league, input.league));
      if (input?.isFeatured !== undefined) conditions.push(eq(matches.isFeatured, input.isFeatured));
      if (input?.isVirtual !== undefined) conditions.push(eq(matches.isVirtual, input.isVirtual));
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const result = await db.query.matches.findMany({
        where: whereClause,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        orderBy: [desc(matches.matchDate)],
      });
      
      return result;
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, input.id),
      });
      if (!match) throw new Error("Match not found");
      return match;
    }),

  getLive: publicQuery.query(async () => {
    const db = getDb();
    return db.query.matches.findMany({
      where: eq(matches.status, "live"),
      orderBy: [desc(matches.isFeatured), asc(matches.matchDate)],
    });
  }),

  getUpcoming: publicQuery.query(async () => {
    const db = getDb();
    return db.query.matches.findMany({
      where: and(
        eq(matches.status, "scheduled"),
        gte(matches.matchDate, new Date())
      ),
      limit: 20,
      orderBy: [asc(matches.matchDate)],
    });
  }),

  getFeatured: publicQuery.query(async () => {
    const db = getDb();
    return db.query.matches.findMany({
      where: eq(matches.isFeatured, true),
      limit: 10,
      orderBy: [asc(matches.matchDate)],
    });
  }),

  getLeagues: publicQuery.query(async () => {
    const db = getDb();
    const result = await db.selectDistinct({ league: matches.league }).from(matches);
    return result.map(r => r.league).filter(Boolean);
  }),

  updateOdds: publicQuery
    .input(
      z.object({
        id: z.number(),
        homeOdds: z.string().optional(),
        drawOdds: z.string().optional(),
        awayOdds: z.string().optional(),
        overOdds: z.string().optional(),
        underOdds: z.string().optional(),
        bttsYesOdds: z.string().optional(),
        bttsNoOdds: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...oddsData } = input;
      const updateData: Record<string, string | Date> = { updatedAt: new Date() };
      
      for (const [key, value] of Object.entries(oddsData)) {
        if (value !== undefined) updateData[key] = value;
      }
      
      await db.update(matches).set(updateData).where(eq(matches.id, id));
      return { success: true };
    }),

  simulateLiveUpdate: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, input.id),
      });
      if (!match || match.status !== "live") return { success: false };

      const newMinute = Math.min((match.minute || 0) + Math.floor(Math.random() * 3) + 1, 90);
      const updateData: Record<string, number | Date> = {
        minute: newMinute,
        updatedAt: new Date(),
      };

      // Random goal chance
      if (Math.random() < 0.08) {
        if (Math.random() < 0.5) {
          updateData.homeScore = (match.homeScore || 0) + 1;
        } else {
          updateData.awayScore = (match.awayScore || 0) + 1;
        }
      }

      // Update stats
      updateData.homeShots = (match.homeShots || 0) + Math.floor(Math.random() * 2);
      updateData.awayShots = (match.awayShots || 0) + Math.floor(Math.random() * 2);
      updateData.homePossession = Math.max(30, Math.min(70, (match.homePossession || 50) + Math.floor(Math.random() * 6) - 3));

      await db.update(matches).set(updateData).where(eq(matches.id, input.id));
      return { success: true, minute: newMinute };
    }),

  search: publicQuery
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const searchTerm = `%${input.query}%`;
      return db.query.matches.findMany({
        where: sql`${matches.homeTeam} LIKE ${searchTerm} OR ${matches.awayTeam} LIKE ${searchTerm} OR ${matches.league} LIKE ${searchTerm}`,
        limit: 20,
      });
    }),
});
