import {
  ACCOUNT_TYPE_VALUES,
  FINANCIAL_INSTITUTION_IDS,
  accountRequiresFinancialInstitution,
} from '@ploutizo/types';
import { z } from 'zod';
import type { AccountType } from '@ploutizo/types';

const emptyToNull = (value: unknown) => (value === '' ? null : value);

const institutionIdSchema = z.preprocess(
  emptyToNull,
  z.enum(FINANCIAL_INSTITUTION_IDS).nullable().optional()
);

export const OWNERS_REQUIRED_MESSAGE = 'At least one owner is required.';
export const STATEMENT_DUE_DAY_MESSAGE =
  'Statement due day must be between 1 and 31.';

const ownerIdsSchema = z
  .array(z.string().uuid())
  .min(1, OWNERS_REQUIRED_MESSAGE);

const preprocessStatementDueDay = (value: unknown) => {
  if (value === '') return null;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return value;
};

export const statementDueDaySchema = z.preprocess(
  preprocessStatementDueDay,
  z
    .number()
    .int()
    .min(1, STATEMENT_DUE_DAY_MESSAGE)
    .max(31, STATEMENT_DUE_DAY_MESSAGE)
    .nullable()
);

/** Credit cards keep a 1–31 day or null; every other type persists null. */
export const persistAccountStatementDueDay = (
  type: AccountType,
  statementDueDay: number | null | undefined
): number | null => (type === 'credit_card' ? (statementDueDay ?? null) : null);

export const accountInstitutionViolation = (
  type: AccountType,
  institutionId: string | null | undefined
): string | null => {
  if (!accountRequiresFinancialInstitution(type)) return null;
  return institutionId ? null : 'Financial institution is required.';
};

/** Validates institution rules after merging a partial PATCH with the stored account. */
export const mergeAccountInstitutionViolation = (
  existing: { type: AccountType; institutionId: string | null },
  patch: { type?: AccountType; institutionId?: string | null | undefined }
): string | null => {
  const type = patch.type ?? existing.type;
  const institutionId =
    patch.institutionId !== undefined
      ? patch.institutionId
      : existing.institutionId;
  return accountInstitutionViolation(type, institutionId);
};

/**
 * PATCH merge for statement due day. Non-credit-card writes always persist null.
 * Credit cards apply an explicit patch day, or leave the column unchanged when omitted.
 */
export const mergeAccountStatementDueDay = (
  existing: { type: AccountType; statementDueDay: number | null },
  patch: { type?: AccountType; statementDueDay?: number | null }
): number | null | undefined => {
  const type = patch.type ?? existing.type;
  if (patch.statementDueDay !== undefined) {
    return persistAccountStatementDueDay(type, patch.statementDueDay);
  }
  if (type !== 'credit_card') return null;
  return undefined;
};

const refineAccountInstitution = (
  data: { type?: string; institutionId?: string | null },
  ctx: z.RefinementCtx
) => {
  const type = data.type as AccountType | undefined;
  const cleared = data.institutionId === null;
  if (type != null) {
    const message = accountInstitutionViolation(type, data.institutionId);
    if (message) {
      ctx.addIssue({
        code: 'custom',
        path: ['institutionId'],
        message,
      });
      return;
    }
  }
  if (cleared && type == null) {
    ctx.addIssue({
      code: 'custom',
      path: ['institutionId'],
      message: 'Financial institution is required.',
    });
  }
};

const refineAccountStatementDueDay = (
  data: { type: AccountType; statementDueDay?: string | number | null },
  ctx: z.RefinementCtx
) => {
  if (data.type !== 'credit_card') return;
  const result = statementDueDaySchema.safeParse(data.statementDueDay);
  if (!result.success) {
    ctx.addIssue({
      code: 'custom',
      path: ['statementDueDay'],
      message: result.error.issues[0]?.message ?? STATEMENT_DUE_DAY_MESSAGE,
    });
  }
};

export const toAccountWritePayload = (data: {
  name: string;
  type: AccountType;
  institutionId?: string | null;
  lastFour?: string;
  statementDueDay?: string | number | null;
  memberIds: string[];
}) => ({
  name: data.name.trim(),
  type: data.type,
  institutionId: data.institutionId ?? null,
  lastFour: data.lastFour?.trim() || undefined,
  statementDueDay: persistAccountStatementDueDay(
    data.type,
    data.type === 'credit_card'
      ? statementDueDaySchema.parse(data.statementDueDay ?? null)
      : null
  ),
  memberIds: data.memberIds,
});

export const createAccountSchema = z
  .object({
    name: z.string().min(1, 'Account name is required.'),
    type: z.enum(ACCOUNT_TYPE_VALUES, { error: 'Account type is required.' }),
    institutionId: institutionIdSchema,
    lastFour: z.string().max(4).optional(),
    statementDueDay: statementDueDaySchema.optional(),
    memberIds: ownerIdsSchema,
  })
  .superRefine(refineAccountInstitution)
  .transform((data) => toAccountWritePayload(data));

export const updateAccountSchema = z
  .object({
    name: z.string().min(1, 'Account name is required.').optional(),
    type: z.enum(ACCOUNT_TYPE_VALUES).optional(),
    institutionId: institutionIdSchema,
    lastFour: z.string().max(4).optional().nullable(),
    statementDueDay: statementDueDaySchema.optional(),
    memberIds: ownerIdsSchema.optional(),
    archivedAt: z.string().datetime().nullable().optional(),
  })
  .superRefine(refineAccountInstitution);

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const accountFormFieldsSchema = z
  .object({
    name: z.string().min(1, 'Account name is required.'),
    type: z.enum(ACCOUNT_TYPE_VALUES, { error: 'Account type is required.' }),
    institutionId: institutionIdSchema,
    lastFour: z.string().max(4).optional(),
    statementDueDay: z.string().optional(),
    memberIds: ownerIdsSchema,
  })
  .superRefine(refineAccountInstitution)
  .superRefine(refineAccountStatementDueDay);

export const AccountFormSchema = accountFormFieldsSchema.transform(
  toAccountWritePayload
);

export type AccountFormValues = z.input<typeof accountFormFieldsSchema>;
export type AccountForm = z.output<typeof AccountFormSchema>;
