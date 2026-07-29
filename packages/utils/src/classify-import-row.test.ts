import { describe, expect, it } from 'vitest';
import {
  BILL_PAYMENT_DESCRIPTION_PATTERN,
  classifyImportRow,
  isBillPaymentDescription,
} from './classify-import-row';
import { matchesMerchantRule } from './match-merchant-rule';

const billPaymentCategoryId = 'cat-bill-payment';
const groceriesId = 'cat-groceries';
const ownerA = 'member-a';
const ownerB = 'member-b';
const ruleAssignee = 'member-rule';

describe('isBillPaymentDescription', () => {
  it('detects seeded payment thank you pattern case-insensitively', () => {
    expect(isBillPaymentDescription('PAYMENT THANK YOU - VISA')).toBe(true);
    expect(isBillPaymentDescription('payment thank you')).toBe(true);
    expect(isBillPaymentDescription('GROCERY STORE')).toBe(false);
  });
});

describe('matchesMerchantRule', () => {
  it('supports contains, exact, starts_with, ends_with, and regex', () => {
    expect(
      matchesMerchantRule('TIM HORTONS #123', {
        pattern: 'TIM HORTONS',
        matchType: 'contains',
      })
    ).toBe(true);
    expect(
      matchesMerchantRule('NETFLIX.COM', {
        pattern: 'NETFLIX.COM',
        matchType: 'exact',
      })
    ).toBe(true);
    expect(
      matchesMerchantRule('STARBUCKS STORE', {
        pattern: 'STARBUCKS',
        matchType: 'starts_with',
      })
    ).toBe(true);
    expect(
      matchesMerchantRule('ONLINE SPOTIFY', {
        pattern: 'SPOTIFY',
        matchType: 'ends_with',
      })
    ).toBe(true);
    expect(
      matchesMerchantRule('Amazon Marketplace', {
        pattern: 'amazon',
        matchType: 'regex',
      })
    ).toBe(true);
  });
});

describe('classifyImportRow', () => {
  it('detects bill payments before merchant rules and forces settlement', () => {
    const result = classifyImportRow({
      sourceDescription: `ONLINE ${BILL_PAYMENT_DESCRIPTION_PATTERN}`,
      parsedType: 'expense',
      parsedDescription: `ONLINE ${BILL_PAYMENT_DESCRIPTION_PATTERN}`,
      csvCategoryId: groceriesId,
      csvAssigneeMemberIds: [ownerA],
      csvTagIds: [],
      merchantRules: [
        {
          pattern: 'PAYMENT',
          matchType: 'contains',
          renameTo: 'Should not win type',
          categoryId: groceriesId,
          assigneeId: ruleAssignee,
          tagIds: ['tag-1'],
        },
      ],
      billPaymentCategoryId,
      accountOwnerMemberIds: [ownerA, ownerB],
    });

    expect(result.detectedBillPayment).toBe(true);
    expect(result.reviewType).toBe('settlement');
    expect(result.reviewCategoryId).toBe(billPaymentCategoryId);
    // Matching merchant rule may still rename description / set assignee / tags.
    expect(result.matchedMerchantRule).toBe(true);
    expect(result.reviewDescription).toBe('Should not win type');
    expect(result.reviewAssigneeMemberIds).toEqual([ruleAssignee]);
  });

  it('applies merchant-rule values then ownership defaults for gaps', () => {
    const result = classifyImportRow({
      sourceDescription: 'TIM HORTONS #99',
      parsedType: 'expense',
      parsedDescription: 'TIM HORTONS #99',
      csvCategoryId: null,
      csvAssigneeMemberIds: [],
      csvTagIds: [],
      merchantRules: [
        {
          pattern: 'TIM HORTONS',
          matchType: 'contains',
          renameTo: 'Tim Hortons',
          categoryId: groceriesId,
          assigneeId: null,
          tagIds: ['tag-coffee'],
        },
      ],
      billPaymentCategoryId,
      accountOwnerMemberIds: [ownerA, ownerB],
    });

    expect(result.reviewType).toBe('expense');
    expect(result.reviewDescription).toBe('Tim Hortons');
    expect(result.reviewCategoryId).toBe(groceriesId);
    expect(result.reviewTagIds).toEqual(['tag-coffee']);
    expect(result.reviewAssigneeMemberIds).toEqual([ownerA, ownerB]);
  });

  it('lets CSV hints fill only empty classification fields', () => {
    const result = classifyImportRow({
      sourceDescription: 'Unknown Merchant',
      parsedType: 'expense',
      parsedDescription: 'Unknown Merchant',
      csvCategoryId: groceriesId,
      csvAssigneeMemberIds: [ownerA],
      csvTagIds: ['tag-csv'],
      merchantRules: [],
      billPaymentCategoryId,
      accountOwnerMemberIds: [ownerA, ownerB],
    });

    // Ownership defaults apply before CSV gap-fill when assignees empty after rules.
    // Defaults already filled assignees, so CSV assignee does not replace them.
    expect(result.reviewAssigneeMemberIds).toEqual([ownerA, ownerB]);
    expect(result.reviewCategoryId).toBe(groceriesId);
    expect(result.reviewTagIds).toEqual(['tag-csv']);
  });

  it('assigns Bill Payment category to explicit settlement rows', () => {
    const result = classifyImportRow({
      sourceDescription: 'Card payment',
      parsedType: 'settlement',
      parsedDescription: 'Card payment',
      csvCategoryId: null,
      csvAssigneeMemberIds: [],
      csvTagIds: [],
      merchantRules: [],
      billPaymentCategoryId,
      accountOwnerMemberIds: [ownerA],
    });

    expect(result.reviewType).toBe('settlement');
    expect(result.reviewCategoryId).toBe(billPaymentCategoryId);
    expect(result.reviewAssigneeMemberIds).toEqual([ownerA]);
  });
});
