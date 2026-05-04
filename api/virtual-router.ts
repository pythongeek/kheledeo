import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { virtualMatches } from "@db/schema";

export const virtualRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        status: z.enum(["scheduled", "live", "finished"]).optional(),
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.status) conditions.push(eq(virtualMatches.status, input.status));

      return db.query.virtualMatches.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(virtualMatches.matchDate)],
        limit: input?.limit ?? 20,
      });
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const match = await db.query.virtualMatches.findFirst({
        where: eq(virtualMatches.id, input.id),
      });
      if (!match) throw new Error("Virtual match not found");
      return match;
    }),

  simulateStep: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const match = await db.query.virtualMatches.findFirst({
        where: eq(virtualMatches.id, input.id),
      });

      if (!match || match.status === "finished") {
        throw new Error("Match not found or already finished");
      }

      const events = (match.events ? JSON.parse(match.events as string) : []) as Array<{       minute: number;
        type: string;
        team: string;
        description: string;
      }>;

      const currentMinute = events.length > 0
        ? Math.max(...events.map(e => e.minute))
        : 0;

      const newMinute = Math.min(currentMinute + Math.floor(Math.random() * 5) + 1, 90);

      // Generate events
      const newEvents = [...events];
      let scoreA = match.scoreA || 0;
      let scoreB = match.scoreB || 0;

      // Random match events
      if (Math.random() < 0.15) {
        // Goal
        const team = Math.random() < 0.5 ? "A" : "B";
        if (team === "A") scoreA++;
        else scoreB++;

        newEvents.push({
          minute: newMinute,
          type: "goal",
          team: team === "A" ? match.teamA : match.teamB,
          description: `${team === "A" ? match.teamA : match.teamB} scores at ${newMinute}'!`,
        });
      } else if (Math.random() < 0.1) {
        // Card
        const cardType = Math.random() < 0.7 ? "yellow" : "red";
        const team = Math.random() < 0.5 ? "A" : "B";
        newEvents.push({
          minute: newMinute,
          type: cardType,
          team: team === "A" ? match.teamA : match.teamB,
          description: `${cardType} card for ${team === "A" ? match.teamA : match.teamB} at ${newMinute}'`,
        });
      } else {
        // Regular play
        const actions = [
          "Great save by the goalkeeper!",
          "Near miss! Just wide of the post",
          "Excellent passing sequence",
          "Corner kick awarded",
          "Free kick in dangerous position",
          "Strong tackle in midfield",
          "Counter attack developing",
        ];
        newEvents.push({
          minute: newMinute,
          type: "action",
          team: "",
          description: actions[Math.floor(Math.random() * actions.length)],
        });
      }

      const isFinished = newMinute >= 90;

      await db.update(virtualMatches)
        .set({
          scoreA,
          scoreB,
          events: JSON.stringify(newEvents),
          status: isFinished ? "finished" : "live",
          finishedAt: isFinished ? new Date() : null,
        })
        .where(eq(virtualMatches.id, input.id));

      return {
        success: true,
        match: {
          ...match,
          scoreA,
          scoreB,
          events: newEvents,
          status: isFinished ? "finished" : "live",
        },
      };
    }),

  createMatch: publicQuery
    .input(
      z.object({
        teamA: z.string(),
        teamB: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(virtualMatches).values({
        teamA: input.teamA,
        teamB: input.teamB,
        matchDate: new Date(),
        status: "scheduled",
        scoreA: 0,
        scoreB: 0,
        events: "[]",
        oddsSnapshot: JSON.stringify({
          homeOdds: (1.5 + Math.random() * 2).toFixed(2),
          drawOdds: (2.5 + Math.random()).toFixed(2),
          awayOdds: (2.0 + Math.random() * 2).toFixed(2),
        }),
      });
      return { success: true };
    }),

  startMatch: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(virtualMatches)
        .set({ status: "live" })
        .where(eq(virtualMatches.id, input.id));
      return { success: true };
    }),
});
