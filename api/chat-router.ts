import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { chatMessages, matches } from "@db/schema";

// Simulated AI responses - in production these would call Gemini/Minimax APIs
const AI_RESPONSES = {
  prediction: (teamA: string, teamB: string) => {
    const outcomes = [
      `Based on recent form and head-to-head statistics, I predict ${teamA} has a 58% chance of winning. Their home advantage and stronger midfield control give them the edge.`,
      `This is a very close matchup. ${teamB} has been defensively solid lately, and I estimate a 45% win probability for ${teamA}, 30% draw, 25% ${teamB}.`,
      `Statistical analysis favors ${teamA} with approximately 2.1 expected goals vs ${teamB}'s 1.4. I'd rate their win probability at 52%.`,
    ];
    return outcomes[Math.floor(Math.random() * outcomes.length)];
  },
  oddsAnalysis: (odds: string) => {
    const analysis = [
      `At odds of ${odds}, there's good value here. The implied probability is lower than the actual statistical probability I calculate.`,
      `These odds suggest the market slightly undervalues this outcome. Based on my models, fair odds should be about 15-20% lower.`,
      `The odds of ${odds} appear fairly priced. No significant edge detected, but it's still a solid pick if your analysis aligns.`,
    ];
    return analysis[Math.floor(Math.random() * analysis.length)];
  },
  riskAssessment: () => {
    const risks = [
      `Risk Level: MODERATE. Key injuries on both sides increase uncertainty. Consider reducing stake size by 20%.`,
      `Risk Level: LOW. Both teams have consistent recent form. Historical data supports this selection strongly.`,
      `Risk Level: HIGH. Weather conditions and referee tendencies add volatility. This is more speculative than statistical.`,
    ];
    return risks[Math.floor(Math.random() * risks.length)];
  },
  general: (query: string) => {
    const responses = [
      `I've analyzed ${query}. The data suggests looking at team form over the last 5 matches rather than season-long stats for better accuracy.`,
      `For ${query}, consider the tactical matchup. Teams with high pressing styles tend to perform better against possession-based opponents.`,
      `When evaluating ${query}, don't forget to check the expected goals (xG) differential. It's often more predictive than actual goals scored.`,
      `My recommendation for ${query}: Look for value in the Asian handicap markets. They often have better odds than standard 1X2 for closely matched teams.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  },
};

function generateAIResponse(query: string, contextData?: any): string {
  const q = query.toLowerCase();

  if (q.includes("predict") || q.includes("who will win") || q.includes("chance")) {
    const teams = contextData?.teams || ["Team A", "Team B"];
    return AI_RESPONSES.prediction(teams[0], teams[1]);
  }

  if (q.includes("odds") || q.includes("value") || q.includes("price")) {
    return AI_RESPONSES.oddsAnalysis(contextData?.odds || "2.00");
  }

  if (q.includes("risk") || q.includes("safe") || q.includes("dangerous")) {
    return AI_RESPONSES.riskAssessment();
  }

  return AI_RESPONSES.general(query);
}

export const chatRouter = createRouter({
  getHistory: authedQuery
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, ctx.user.id),
        orderBy: [desc(chatMessages.timestamp)],
        limit: input?.limit ?? 50,
      });
    }),

  sendMessage: authedQuery
    .input(
      z.object({
        content: z.string().min(1).max(2000),
        contextMatchId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Save user message
      await db.insert(chatMessages).values({
        userId: ctx.user.id,
        role: "user",
        content: input.content,
        metadata: input.contextMatchId ? JSON.stringify({ matchId: input.contextMatchId }) : null,
      });

      // Get match context if provided
      let contextData: any = null;
      if (input.contextMatchId) {
        const match = await db.query.matches.findFirst({
          where: eq(matches.id, input.contextMatchId),
        });
        if (match) {
          contextData = {
            teams: [match.homeTeam, match.awayTeam],
            odds: match.homeOdds,
            league: match.league,
          };
        }
      }

      // Generate AI response
      const aiContent = generateAIResponse(input.content, contextData);

      // Save AI response
      await db.insert(chatMessages).values({
        userId: ctx.user.id,
        role: "assistant",
        content: aiContent,
        metadata: contextData ? JSON.stringify(contextData) : null,
      });

      return {
        success: true,
        response: aiContent,
      };
    }),

  clearHistory: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db.delete(chatMessages).where(eq(chatMessages.userId, ctx.user.id));
    return { success: true };
  }),

  getQuickPrompts: publicQuery.query(() => {
    return [
      { label: "Today's top picks", query: "What are the best bets today?" },
      { label: "Analyze Man City vs Real Madrid", query: "Analyze Manchester City vs Real Madrid" },
      { label: "Best value odds", query: "Show me the best value odds today" },
      { label: "Risk-free bets", query: "Any low risk bets for today?" },
      { label: "Over 2.5 strategy", query: "Which matches look good for over 2.5 goals?" },
      { label: "BTTS picks", query: "Best both teams to score matches today?" },
    ];
  }),
});
