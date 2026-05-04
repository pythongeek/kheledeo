import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  decimal,
  bigint,
  json,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================
// USERS TABLE (extends OAuth users)
// ============================================
export const users = mysqlTable(
  "users",
  {
    id: serial("id").primaryKey(),
    unionId: varchar("unionId", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 320 }),
    avatar: text("avatar"),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
    // Betting platform fields
    phone: varchar("phone", { length: 20 }),
    balanceUsdt: decimal("balanceUsdt", { precision: 18, scale: 8 }).default("0").notNull(),
    balanceBdt: decimal("balanceBdt", { precision: 18, scale: 2 }).default("0").notNull(),
    totalDeposited: decimal("totalDeposited", { precision: 18, scale: 8 }).default("0").notNull(),
    totalWithdrawn: decimal("totalWithdrawn", { precision: 18, scale: 8 }).default("0").notNull(),
    totalWagered: decimal("totalWagered", { precision: 18, scale: 8 }).default("0").notNull(),
    totalWon: decimal("totalWon", { precision: 18, scale: 8 }).default("0").notNull(),
    isVerified: boolean("isVerified").default(false).notNull(),
    preferredCurrency: mysqlEnum("preferredCurrency", ["USDT", "BDT"]).default("USDT").notNull(),
    notificationSettings: json("notificationSettings"),
    walletAddress: varchar("walletAddress", { length: 255 }),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
    roleIdx: index("role_idx").on(table.role),
    balanceIdx: index("balance_idx").on(table.balanceUsdt),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// MATCHES TABLE
// ============================================
export const matches = mysqlTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    homeTeam: varchar("homeTeam", { length: 255 }).notNull(),
    awayTeam: varchar("awayTeam", { length: 255 }).notNull(),
    homeTeamLogo: varchar("homeTeamLogo", { length: 500 }),
    awayTeamLogo: varchar("awayTeamLogo", { length: 500 }),
    league: varchar("league", { length: 255 }).notNull(),
    matchDate: timestamp("matchDate").notNull(),
    status: mysqlEnum("status", ["scheduled", "live", "finished", "postponed", "cancelled"]).default("scheduled").notNull(),
    minute: int("minute").default(0),
    homeScore: int("homeScore").default(0),
    awayScore: int("awayScore").default(0),
    // 1X2 odds
    homeOdds: decimal("homeOdds", { precision: 8, scale: 3 }).notNull(),
    drawOdds: decimal("drawOdds", { precision: 8, scale: 3 }).notNull(),
    awayOdds: decimal("awayOdds", { precision: 8, scale: 3 }).notNull(),
    // Over/Under odds
    overUnderLine: decimal("overUnderLine", { precision: 4, scale: 1 }).default("2.5"),
    overOdds: decimal("overOdds", { precision: 8, scale: 3 }),
    underOdds: decimal("underOdds", { precision: 8, scale: 3 }),
    // BTTS odds
    bttsYesOdds: decimal("bttsYesOdds", { precision: 8, scale: 3 }),
    bttsNoOdds: decimal("bttsNoOdds", { precision: 8, scale: 3 }),
    // Correct score (stored as JSON array of {score, odds})
    correctScoreOdds: json("correctScoreOdds"),
    // HT/FT odds
    htftOdds: json("htftOdds"),
    // Asian handicap
    asianHandicapLine: decimal("asianHandicapLine", { precision: 4, scale: 1 }),
    asianHandicapHomeOdds: decimal("asianHandicapHomeOdds", { precision: 8, scale: 3 }),
    asianHandicapAwayOdds: decimal("asianHandicapAwayOdds", { precision: 8, scale: 3 }),
    // Metadata
    isFeatured: boolean("isFeatured").default(false).notNull(),
    isVirtual: boolean("isVirtual").default(false).notNull(),
    liveStreamUrl: varchar("liveStreamUrl", { length: 500 }),
    flashEventActive: boolean("flashEventActive").default(false).notNull(),
    flashEventData: json("flashEventData"),
    // Stats
    homePossession: int("homePossession").default(50),
    homeShots: int("homeShots").default(0),
    awayShots: int("awayShots").default(0),
    homeShotsOnTarget: int("homeShotsOnTarget").default(0),
    awayShotsOnTarget: int("awayShotsOnTarget").default(0),
    homeCorners: int("homeCorners").default(0),
    awayCorners: int("awayCorners").default(0),
    homeFouls: int("homeFouls").default(0),
    awayFouls: int("awayFouls").default(0),
    homeYellowCards: int("homeYellowCards").default(0),
    awayYellowCards: int("awayYellowCards").default(0),
    homeRedCards: int("homeRedCards").default(0),
    awayRedCards: int("awayRedCards").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    statusIdx: index("status_idx").on(table.status),
    leagueIdx: index("league_idx").on(table.league),
    dateIdx: index("date_idx").on(table.matchDate),
    featuredIdx: index("featured_idx").on(table.isFeatured),
    virtualIdx: index("virtual_idx").on(table.isVirtual),
  })
);

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// ============================================
// BETS TABLE
// ============================================
export const bets = mysqlTable(
  "bets",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    matchId: bigint("matchId", { mode: "number", unsigned: true }).notNull(),
    market: mysqlEnum("market", [
      "1x2",
      "over_under",
      "btts",
      "correct_score",
      "htft",
      "asian_handicap",
      "flash_goal",
      "virtual_match",
    ]).notNull(),
    selection: varchar("selection", { length: 100 }).notNull(),
    odds: decimal("odds", { precision: 8, scale: 3 }).notNull(),
    stake: decimal("stake", { precision: 18, scale: 8 }).notNull(),
    potentialReturn: decimal("potentialReturn", { precision: 18, scale: 8 }).notNull(),
    status: mysqlEnum("status", ["pending", "won", "lost", "cashed_out", "cancelled"]).default("pending").notNull(),
    isComboBet: boolean("isComboBet").default(false).notNull(),
    comboBets: json("comboBets"),
    cashOutValue: decimal("cashOutValue", { precision: 18, scale: 8 }),
    settledAt: timestamp("settledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("bet_user_idx").on(table.userId),
    matchIdx: index("bet_match_idx").on(table.matchId),
    statusIdx: index("bet_status_idx").on(table.status),
    createdIdx: index("bet_created_idx").on(table.createdAt),
  })
);

export type Bet = typeof bets.$inferSelect;
export type InsertBet = typeof bets.$inferInsert;

// ============================================
// TRANSACTIONS TABLE
// ============================================
export const transactions = mysqlTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    type: mysqlEnum("type", ["deposit", "withdrawal"]).notNull(),
    method: mysqlEnum("method", ["crypto_btc", "crypto_usdt", "bkash", "nagad", "rocket"]).notNull(),
    amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
    currency: mysqlEnum("currency", ["USDT", "BDT", "BTC"]).default("USDT").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
    txHash: varchar("txHash", { length: 255 }),
    txId: varchar("txId", { length: 255 }),
    screenshotUrl: varchar("screenshotUrl", { length: 500 }),
    walletAddress: varchar("walletAddress", { length: 255 }),
    approvedBy: bigint("approvedBy", { mode: "number", unsigned: true }),
    approvedAt: timestamp("approvedAt"),
    rejectionReason: text("rejectionReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("tx_user_idx").on(table.userId),
    statusIdx: index("tx_status_idx").on(table.status),
    typeIdx: index("tx_type_idx").on(table.type),
    createdIdx: index("tx_created_idx").on(table.createdAt),
  })
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ============================================
// STRATEGIES TABLE
// ============================================
export const strategies = mysqlTable(
  "strategies",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    sportType: mysqlEnum("sportType", ["football", "basketball", "tennis", "all"]).default("football").notNull(),
    price: decimal("price", { precision: 18, scale: 8 }).default("0").notNull(),
    winRate: decimal("winRate", { precision: 5, scale: 2 }).default("0"),
    totalBets: int("totalBets").default(0),
    content: json("content"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdx: index("strategy_user_idx").on(table.userId),
    activeIdx: index("strategy_active_idx").on(table.isActive),
    priceIdx: index("strategy_price_idx").on(table.price),
  })
);

export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = typeof strategies.$inferInsert;

// ============================================
// LEADERBOARD ENTRIES TABLE
// ============================================
export const leaderboardEntries = mysqlTable(
  "leaderboard_entries",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    period: mysqlEnum("period", ["daily", "weekly", "monthly", "allTime"]).notNull(),
    betsPlaced: int("betsPlaced").default(0).notNull(),
    betsWon: int("betsWon").default(0).notNull(),
    winRate: decimal("winRate", { precision: 5, scale: 2 }).default("0").notNull(),
    totalProfit: decimal("totalProfit", { precision: 18, scale: 8 }).default("0").notNull(),
    streak: int("streak").default(0).notNull(),
    rank: int("rank").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdx: index("lb_user_idx").on(table.userId),
    periodIdx: index("lb_period_idx").on(table.period),
    rankIdx: index("lb_rank_idx").on(table.rank),
    uniqueEntry: uniqueIndex("lb_unique_entry").on(table.userId, table.period),
  })
);

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboardEntries.$inferInsert;

// ============================================
// VIRTUAL MATCHES TABLE
// ============================================
export const virtualMatches = mysqlTable(
  "virtual_matches",
  {
    id: serial("id").primaryKey(),
    teamA: varchar("teamA", { length: 255 }).notNull(),
    teamB: varchar("teamB", { length: 255 }).notNull(),
    matchDate: timestamp("matchDate").defaultNow().notNull(),
    status: mysqlEnum("status", ["scheduled", "live", "finished"]).default("scheduled").notNull(),
    scoreA: int("scoreA").default(0),
    scoreB: int("scoreB").default(0),
    events: json("events"),
    oddsSnapshot: json("oddsSnapshot"),
    simulationSpeed: int("simulationSpeed").default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    finishedAt: timestamp("finishedAt"),
  },
  (table) => ({
    statusIdx: index("vm_status_idx").on(table.status),
    dateIdx: index("vm_date_idx").on(table.matchDate),
  })
);

export type VirtualMatch = typeof virtualMatches.$inferSelect;
export type InsertVirtualMatch = typeof virtualMatches.$inferInsert;

// ============================================
// CHAT MESSAGES TABLE
// ============================================
export const chatMessages = mysqlTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    role: mysqlEnum("role", ["user", "assistant"]).notNull(),
    content: text("content").notNull(),
    metadata: json("metadata"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("chat_user_idx").on(table.userId),
    timestampIdx: index("chat_timestamp_idx").on(table.timestamp),
  })
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ============================================
// ANNOUNCEMENTS TABLE (for admin banners)
// ============================================
export const announcements = mysqlTable(
  "announcements",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    type: mysqlEnum("type", ["info", "warning", "promotion", "flash_event"]).default("info").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    activeIdx: index("ann_active_idx").on(table.isActive),
    typeIdx: index("ann_type_idx").on(table.type),
  })
);

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

// ============================================
// BET SLIP SESSION TABLE (for storing active selections)
// ============================================
export const betSlipSelections = mysqlTable(
  "bet_slip_selections",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    matchId: bigint("matchId", { mode: "number", unsigned: true }).notNull(),
    market: mysqlEnum("market", [
      "1x2",
      "over_under",
      "btts",
      "correct_score",
      "htft",
      "asian_handicap",
    ]).notNull(),
    selection: varchar("selection", { length: 100 }).notNull(),
    odds: decimal("odds", { precision: 8, scale: 3 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("slip_user_idx").on(table.userId),
    uniqueSelection: uniqueIndex("slip_unique").on(table.userId, table.matchId, table.market),
  })
);

export type BetSlipSelection = typeof betSlipSelections.$inferSelect;
export type InsertBetSlipSelection = typeof betSlipSelections.$inferInsert;
