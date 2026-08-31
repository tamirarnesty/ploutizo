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

export const createAccountSchema = z
  .object({
    name: z.string().min(1, 'Account name is required.'),
    type: z.enum(ACCOUNT_TYPE_VALUES, { error: 'Account type is required.' }),
    institutionId: institutionIdSchema,
    lastFour: z.string().max(4).optional(),
    memberIds: z.array(z.string().uuid()).optional().default([]),
  })
  .superRefine(refineAccountInstitution);

export const updateAccountSchema = z
  .object({
    name: z.string().min(1, 'Account name is required.').optional(),
    type: z.enum(ACCOUNT_TYPE_VALUES).optional(),
    institutionId: institutionIdSchema,
    lastFour: z.string().max(4).optional().nullable(),
    memberIds: z.array(z.string().uuid()).optional(),
    archivedAt: z.string().datetime().nullable().optional(),
  })
  .superRefine(refineAccountInstitution);

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const AccountFormSchema = z
  .object({
    name: z.string().min(1, 'Account name is required.'),
    type: z.enum(ACCOUNT_TYPE_VALUES, { error: 'Account type is required.' }),
    institutionId: institutionIdSchema,
    lastFour: z.string().max(4).optional(),
    ownership: z.enum(['personal', 'shared']),
    memberIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine(refineAccountInstitution);
export type AccountForm = z.infer<typeof AccountFormSchema>;
