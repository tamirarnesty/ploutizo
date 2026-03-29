/**
 * packages/db/schema/relations.ts
 *
 * All Drizzle relations defined in one place.
 *
 * Cross-domain relations (e.g. transactions → categories) would create
 * circular imports if defined inline in each domain file. Centralising
 * all relations here avoids this entirely.
 */

import { relations } from "drizzle-orm"

import { users, orgs, orgMembers, invitations } from "./auth"
import { accounts, accountMembers } from "./accounts"
import { categories, tags, merchantRules, merchantRuleTags } from "./classification"
import { importBatches } from "./imports"
import { recurringTemplates } from "./recurring"
import { transactions, transactionAssignees, transactionTags } from "./transactions"
import { budgets } from "./budgets"
import { investmentAccounts, contributionRoomSettings } from "./investments"
import { notifications } from "./notifications"

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  orgMemberships: many(orgMembers),
}))

export const orgsRelations = relations(orgs, ({ many }) => ({
  members: many(orgMembers),
  invitations: many(invitations),
  accounts: many(accounts),
  categories: many(categories),
  tags: many(tags),
  merchantRules: many(merchantRules),
  transactions: many(transactions),
  recurringTemplates: many(recurringTemplates),
  importBatches: many(importBatches),
  budgets: many(budgets),
  investmentAccounts: many(investmentAccounts),
  notifications: many(notifications),
}))

export const orgMembersRelations = relations(orgMembers, ({ one, many }) => ({
  org: one(orgs, {
    fields: [orgMembers.orgId],
    references: [orgs.id],
  }),
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
  accountMemberships: many(accountMembers),
  transactionAssignees: many(transactionAssignees),
  investmentAccounts: many(investmentAccounts),
  contributionRoomSettings: many(contributionRoomSettings),
  notifications: many(notifications),
  sentInvitations: many(invitations),
  merchantRuleAssignments: many(merchantRules),
}))

export const invitationsRelations = relations(invitations, ({ one }) => ({
  org: one(orgs, {
    fields: [invitations.orgId],
    references: [orgs.id],
  }),
  invitedBy: one(orgMembers, {
    fields: [invitations.invitedById],
    references: [orgMembers.id],
  }),
}))

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  org: one(orgs, {
    fields: [accounts.orgId],
    references: [orgs.id],
  }),
  members: many(accountMembers),
  transactions: many(transactions, {
    relationName: "accountTransactions",
  }),
  fromTransfers: many(transactions, {
    relationName: "fromAccountTransactions",
  }),
  toTransfers: many(transactions, {
    relationName: "toAccountTransactions",
  }),
  settledTransactions: many(transactions, {
    relationName: "settledAccountTransactions",
  }),
  investmentAccount: many(investmentAccounts),
}))

export const accountMembersRelations = relations(accountMembers, ({ one }) => ({
  account: one(accounts, {
    fields: [accountMembers.accountId],
    references: [accounts.id],
  }),
  member: one(orgMembers, {
    fields: [accountMembers.memberId],
    references: [orgMembers.id],
  }),
}))

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  org: one(orgs, {
    fields: [categories.orgId],
    references: [orgs.id],
  }),
  transactions: many(transactions),
  merchantRules: many(merchantRules),
  budgets: many(budgets),
  recurringTemplates: many(recurringTemplates),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  org: one(orgs, {
    fields: [tags.orgId],
    references: [orgs.id],
  }),
  transactionTags: many(transactionTags),
  merchantRuleTags: many(merchantRuleTags),
}))

export const merchantRulesRelations = relations(
  merchantRules,
  ({ one, many }) => ({
    org: one(orgs, {
      fields: [merchantRules.orgId],
      references: [orgs.id],
    }),
    category: one(categories, {
      fields: [merchantRules.categoryId],
      references: [categories.id],
    }),
    assignee: one(orgMembers, {
      fields: [merchantRules.assigneeId],
      references: [orgMembers.id],
    }),
    tags: many(merchantRuleTags),
  })
)

export const merchantRuleTagsRelations = relations(
  merchantRuleTags,
  ({ one }) => ({
    rule: one(merchantRules, {
      fields: [merchantRuleTags.ruleId],
      references: [merchantRules.id],
    }),
    tag: one(tags, {
      fields: [merchantRuleTags.tagId],
      references: [tags.id],
    }),
  })
)

// ---------------------------------------------------------------------------
// Import + Recurring
// ---------------------------------------------------------------------------

export const importBatchesRelations = relations(
  importBatches,
  ({ one, many }) => ({
    org: one(orgs, {
      fields: [importBatches.orgId],
      references: [orgs.id],
    }),
    transactions: many(transactions),
  })
)

export const recurringTemplatesRelations = relations(
  recurringTemplates,
  ({ one, many }) => ({
    org: one(orgs, {
      fields: [recurringTemplates.orgId],
      references: [orgs.id],
    }),
    account: one(accounts, {
      fields: [recurringTemplates.accountId],
      references: [accounts.id],
    }),
    category: one(categories, {
      fields: [recurringTemplates.categoryId],
      references: [categories.id],
    }),
    generatedTransactions: many(transactions),
  })
)

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const transactionsRelations = relations(
  transactions,
  ({ one, many }) => ({
    org: one(orgs, {
      fields: [transactions.orgId],
      references: [orgs.id],
    }),
    account: one(accounts, {
      fields: [transactions.accountId],
      references: [accounts.id],
      relationName: "accountTransactions",
    }),
    category: one(categories, {
      fields: [transactions.categoryId],
      references: [categories.id],
    }),
    fromAccount: one(accounts, {
      fields: [transactions.fromAccountId],
      references: [accounts.id],
      relationName: "fromAccountTransactions",
    }),
    toAccount: one(accounts, {
      fields: [transactions.toAccountId],
      references: [accounts.id],
      relationName: "toAccountTransactions",
    }),
    settledAccount: one(accounts, {
      fields: [transactions.settledAccountId],
      references: [accounts.id],
      relationName: "settledAccountTransactions",
    }),
    refundOf: one(transactions, {
      fields: [transactions.refundOfId],
      references: [transactions.id],
      relationName: "refundOf",
    }),
    refunds: many(transactions, {
      relationName: "refundOf",
    }),
    recurringTemplate: one(recurringTemplates, {
      fields: [transactions.recurringTemplateId],
      references: [recurringTemplates.id],
    }),
    importBatch: one(importBatches, {
      fields: [transactions.importBatchId],
      references: [importBatches.id],
    }),
    assignees: many(transactionAssignees),
    tags: many(transactionTags),
  })
)

export const transactionAssigneesRelations = relations(
  transactionAssignees,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionAssignees.transactionId],
      references: [transactions.id],
    }),
    member: one(orgMembers, {
      fields: [transactionAssignees.memberId],
      references: [orgMembers.id],
    }),
  })
)

export const transactionTagsRelations = relations(
  transactionTags,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionTags.transactionId],
      references: [transactions.id],
    }),
    tag: one(tags, {
      fields: [transactionTags.tagId],
      references: [tags.id],
    }),
  })
)

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export const budgetsRelations = relations(budgets, ({ one }) => ({
  org: one(orgs, {
    fields: [budgets.orgId],
    references: [orgs.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}))

// ---------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------

export const investmentAccountsRelations = relations(
  investmentAccounts,
  ({ one }) => ({
    org: one(orgs, {
      fields: [investmentAccounts.orgId],
      references: [orgs.id],
    }),
    member: one(orgMembers, {
      fields: [investmentAccounts.memberId],
      references: [orgMembers.id],
    }),
    account: one(accounts, {
      fields: [investmentAccounts.accountId],
      references: [accounts.id],
    }),
    roomSettings: one(contributionRoomSettings),
  })
)

export const contributionRoomSettingsRelations = relations(
  contributionRoomSettings,
  ({ one }) => ({
    investmentAccount: one(investmentAccounts, {
      fields: [contributionRoomSettings.investmentAccountId],
      references: [investmentAccounts.id],
    }),
    member: one(orgMembers, {
      fields: [contributionRoomSettings.memberId],
      references: [orgMembers.id],
    }),
  })
)

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationsRelations = relations(notifications, ({ one }) => ({
  org: one(orgs, {
    fields: [notifications.orgId],
    references: [orgs.id],
  }),
  member: one(orgMembers, {
    fields: [notifications.memberId],
    references: [orgMembers.id],
  }),
}))
