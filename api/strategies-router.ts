import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { strategies, users } from "@db/schema";

export const strategiesRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        sportType: z.enum(["football", "basketball", "tennis", "all"]).optional(),
        isFree: z.boolean().optional(),
        minWinRate: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [eq(strategies.isActive, true)];

      if (input?.sportType) conditions.push(eq(strategies.sportType, input.sportType));
      if (input?.minWinRate) {
        // This would need a raw SQL comparison for decimal
      }
      if (input?.isFree !== undefined) {
        if (input.isFree) {
          conditions.push(eq(strategies.price, "0"));
        } else {
          // price > 0
        }
      }

      const result = await db.query.strategies.findMany({
        where: and(...conditions),
        orderBy: [desc(strategies.winRate)],
        limit: input?.limit ?? 50,
      });

      const enriched = [];
      for (const strategy of result) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, strategy.userId),
        });
        enriched.push({
          ...strategy,
          creatorName: user?.name || `User #${strategy.userId}`,
          creatorAvatar: user?.avatar,
        });
      }

      return enriched;
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const strategy = await db.query.strategies.findFirst({
        where: eq(strategies.id, input.id),
      });
      if (!strategy) throw new Error("Strategy not found");

      const user = await db.query.users.findFirst({
        where: eq(users.id, strategy.userId),
      });

      return {
        ...strategy,
        creatorName: user?.name || `User #${strategy.userId}`,
        creatorAvatar: user?.avatar,
      };
    }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(3).max(255),
        description: z.string(),
        sportType: z.enum(["football", "basketball", "tennis", "all"]).default("football"),
        price: z.string().default("0"),
        content: z.object({}).passthrough().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(strategies).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        sportType: input.sportType,
        price: input.price,
        content: input.content ? JSON.stringify(input.content) : null,
      });
      return { success: true };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...updateData } = input;

      const strategy = await db.query.strategies.findFirst({
        where: eq(strategies.id, id),
      });

      if (!strategy || strategy.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      await db.update(strategies)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(strategies.id, id));

      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const strategy = await db.query.strategies.findFirst({
        where: eq(strategies.id, input.id),
      });

      if (!strategy || strategy.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      await db.delete(strategies).where(eq(strategies.id, input.id));
      return { success: true };
    }),
});
