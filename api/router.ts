import { authRouter } from "./auth-router";
import { matchesRouter } from "./matches-router";
import { betsRouter } from "./bets-router";
import { transactionsRouter } from "./transactions-router";
import { leaderboardRouter } from "./leaderboard-router";
import { strategiesRouter } from "./strategies-router";
import { virtualRouter } from "./virtual-router";
import { chatRouter } from "./chat-router";
import { adminRouter } from "./admin-router";
import { walletRouter } from "./wallet-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  matches: matchesRouter,
  bets: betsRouter,
  transactions: transactionsRouter,
  leaderboard: leaderboardRouter,
  strategies: strategiesRouter,
  virtual: virtualRouter,
  chat: chatRouter,
  admin: adminRouter,
  wallet: walletRouter,
});

export type AppRouter = typeof appRouter;
