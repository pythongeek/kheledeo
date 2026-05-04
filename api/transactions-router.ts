import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { transactions, users } from "@db/schema";

export const transactionsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.transactions.findMany({
      where: eq(transactions.userId, ctx.user.id),
      orderBy: [desc(transactions.createdAt)],
      limit: 100,
    });
  }),

  createDeposit: authedQuery
    .input(
      z.object({
        method: z.enum(["crypto_btc", "crypto_usdt", "bkash", "nagad", "rocket"]),
        amount: z.string(),
        currency: z.enum(["USDT", "BDT", "BTC"]).default("USDT"),
        txHash: z.string().optional(),
        txId: z.string().optional(),
        screenshotUrl: z.string().optional(),
        walletAddress: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(transactions).values({
        userId: ctx.user.id,
        type: "deposit",
        method: input.method,
        amount: input.amount,
        currency: input.currency,
        status: "pending",
        txHash: input.txHash,
        txId: input.txId,
        screenshotUrl: input.screenshotUrl,
        walletAddress: input.walletAddress,
      });
      return { success: true };
    }),

  createWithdrawal: authedQuery
    .input(
      z.object({
        method: z.enum(["crypto_btc", "crypto_usdt", "bkash", "nagad", "rocket"]),
        amount: z.string(),
        currency: z.enum(["USDT", "BDT", "BTC"]).default("USDT"),
        walletAddress: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) throw new Error("User not found");

      const amountNum = parseFloat(input.amount);
      const balance = parseFloat(user.balanceUsdt || "0");

      if (amountNum > balance) {
        throw new Error("Insufficient balance");
      }

      await db.insert(transactions).values({
        userId: ctx.user.id,
        type: "withdrawal",
        method: input.method,
        amount: input.amount,
        currency: input.currency,
        status: "pending",
        walletAddress: input.walletAddress,
      });

      // Deduct balance immediately (pending approval)
      const newBalance = (balance - amountNum).toFixed(8);
      const newWithdrawn = (parseFloat(user.totalWithdrawn || "0") + amountNum).toFixed(8);

      await db.update(users)
        .set({ balanceUsdt: newBalance, totalWithdrawn: newWithdrawn })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // Admin endpoints
  getPendingDeposits: adminQuery.query(async () => {
    const db = getDb();
    return db.query.transactions.findMany({
      where: and(eq(transactions.type, "deposit"), eq(transactions.status, "pending")),
      orderBy: [desc(transactions.createdAt)],
    });
  }),

  getPendingWithdrawals: adminQuery.query(async () => {
    const db = getDb();
    return db.query.transactions.findMany({
      where: and(eq(transactions.type, "withdrawal"), eq(transactions.status, "pending")),
      orderBy: [desc(transactions.createdAt)],
    });
  }),

  approveTransaction: adminQuery
    .input(z.object({ id: z.number(), approvedBy: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const tx = await db.query.transactions.findFirst({
        where: eq(transactions.id, input.id),
      });

      if (!tx || tx.status !== "pending") throw new Error("Transaction not found or already processed");

      await db.update(transactions)
        .set({ status: "approved", approvedBy: input.approvedBy, approvedAt: new Date() })
        .where(eq(transactions.id, input.id));

      // If deposit, credit user balance
      if (tx.type === "deposit") {
        const user = await db.query.users.findFirst({ where: eq(users.id, tx.userId) });
        if (user) {
          const newBalance = (parseFloat(user.balanceUsdt || "0") + parseFloat(tx.amount)).toFixed(8);
          const newDeposited = (parseFloat(user.totalDeposited || "0") + parseFloat(tx.amount)).toFixed(8);
          await db.update(users)
            .set({ balanceUsdt: newBalance, totalDeposited: newDeposited })
            .where(eq(users.id, tx.userId));
        }
      }

      return { success: true };
    }),

  rejectTransaction: adminQuery
    .input(z.object({ id: z.number(), reason: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const tx = await db.query.transactions.findFirst({
        where: eq(transactions.id, input.id),
      });

      if (!tx || tx.status !== "pending") throw new Error("Transaction not found or already processed");

      await db.update(transactions)
        .set({ status: "rejected", rejectionReason: input.reason })
        .where(eq(transactions.id, input.id));

      // If withdrawal was rejected, refund balance
      if (tx.type === "withdrawal") {
        const user = await db.query.users.findFirst({ where: eq(users.id, tx.userId) });
        if (user) {
          const newBalance = (parseFloat(user.balanceUsdt || "0") + parseFloat(tx.amount)).toFixed(8);
          const newWithdrawn = (parseFloat(user.totalWithdrawn || "0") - parseFloat(tx.amount)).toFixed(8);
          await db.update(users)
            .set({ balanceUsdt: newBalance, totalWithdrawn: newWithdrawn })
            .where(eq(users.id, tx.userId));
        }
      }

      return { success: true };
    }),
});
