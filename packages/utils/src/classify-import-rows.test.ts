import { describe, expect, it } from 'vitest';
import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import { classifyImportRows } from './classify-import-rows';
import type {
  ClassifyImportContext,
  ClassifyImportRowInput,
} from './classify-import-rows';

const BILL_PAYMENT_CATEGORY_ID = 'cat-bill-payment';
const DINING_CATEGORY_ID = 'cat-dining';
const GROCERIES_CATEGORY_ID = 'cat-groceries';
const TAMIR_ID = 'member-tamir';
const ALEX_ID = 'member-alex';
const OTHER_TAMIR_ID = 'member-tamir-other';
const FOOD_TAG_ID = 'tag-food';
const ERRANDS_TAG_ID = 'tag-errands';
const RULE_TAG_ID = 'tag-rule';

const baseRow = (
  overrides: Partial<ClassifyImportRowInput> = {}
): ClassifyImportRowInput => ({
  parsedType: 'expense',
  parsedDescription: 'Coffee',
  csvCategoryName: null,
  csvAssigneeName: null,
  csvTagNames: [],
  externalId: null,
  ...overrides,
});

const baseContext = (
  overrides: Partial<ClassifyImportContext> = {}
): ClassifyImportContext => ({
  catalogs: {
    categories: [
      { id: BILL_PAYMENT_CATEGORY_ID, name: BILL_PAYMENT_CATEGORY_NAME },
      { id: DINING_CATEGORY_ID, name: 'Dining' },
      { id: GROCERIES_CATEGORY_ID, name: 'Groceries' },
    ],
    tags: [
      { id: FOOD_TAG_ID, name: 'food' },
      { id: ERRANDS_TAG_ID, name: 'errands' },
      { id: RULE_TAG_ID, name: 'rewards' },
    ],
    members: [
      { id: TAMIR_ID, displayName: 'Tamir Arnesty', firstName: 'Tamir' },
      { id: ALEX_ID, displayName: 'Alex Smith', firstName: 'Alex' },
    ],
  },
  merchantRules: [],
  accountOwnerMemberIds: [],
  ...overrides,
});

const classifyOne = (
  row: ClassifyImportRowInput,
  context: ClassifyImportContext = baseContext()
) => classifyImportRows([row], context)[0];

describe('classifyImportRows — settlement', () => {
  it('classifies a refund bill-payment phrase as a settlement', () => {
    expect(
      classifyOne(
        baseRow({
          parsedType: 'refund',
          parsedDescription: 'PAYMENT THANK YOU',
        })
      )
    ).toEqual({
      reviewType: 'settlement',
      reviewDescription: BILL_PAYMENT_CATEGORY_NAME,
      reviewCategoryId: BILL_PAYMENT_CATEGORY_ID,
      reviewAssigneeMemberIds: [],
      reviewTagIds: [],
      reviewCounterpartAccountId: null,
      reviewRefundOf: null,
    });
  });

  it('classifies sanitized bill-payment phrases after punctuation and whitespace collapse', () => {
    expect(
      classifyOne(
        baseRow({
          parsedType: 'refund',
          parsedDescription: '  payment-received   thank you. ',
        })
      ).reviewType
    ).toBe('settlement');
    expect(
      classifyOne(
        baseRow({
          parsedType: 'refund',
          parsedDescription: 'paiement-merci',
        })
      ).reviewType
    ).toBe('settlement');
  });

  it('does not substring-match bill-payment phrases', () => {
    expect(
      classifyOne(
        baseRow({
          parsedType: 'refund',
          parsedDescription: 'PAYMENT THANK YOU FROM JANE',
        })
      ).reviewType
    ).toBe('refund');
  });

  it('does not convert an expense into a settlement from its description', () => {
    expect(
      classifyOne(
        baseRow({
          parsedDescription: 'PAYMENT THANK YOU',
        })
      ).reviewType
    ).toBe('expense');
  });

  it('classifies a bill-payment hint as a settlement even on an expense baseline', () => {
    expect(
      classifyOne(
        baseRow({
          parsedDescription: 'PC FINANCIAL PAYMENT',
          classificationHint: 'bill_payment',
        })
      ).reviewType
    ).toBe('settlement');
  });

  it('classifies a bill-payment hint on a refund as a settlement', () => {
    expect(
      classifyOne(
        baseRow({
          parsedType: 'refund',
          parsedDescription: 'PC FINANCIAL PAYMENT',
          classificationHint: 'bill_payment',
        })
      ).reviewType
    ).toBe('settlement');
  });

  it('protects an explicit parsed settlement and still assigns Bill Payment', () => {
    expect(
      classifyOne(
        baseRow({
          parsedType: 'settlement',
          parsedDescription: 'Visa payment',
        })
      )
    ).toMatchObject({
      reviewType: 'settlement',
      reviewDescription: BILL_PAYMENT_CATEGORY_NAME,
      reviewCategoryId: BILL_PAYMENT_CATEGORY_ID,
      reviewAssigneeMemberIds: [],
      reviewTagIds: [],
      reviewCounterpartAccountId: null,
      reviewRefundOf: null,
    });
  });

  it('does not apply merchant rules or ownership defaults to settlements', () => {
    const classified = classifyOne(
      baseRow({
        parsedType: 'refund',
        parsedDescription: 'PAYMENT THANK YOU',
        csvCategoryName: 'Dining',
        csvAssigneeName: 'Tamir Arnesty',
        csvTagNames: ['food'],
      }),
      baseContext({
        merchantRules: [
          {
            pattern: 'PAYMENT THANK YOU',
            matchType: 'contains',
            renameTo: 'Should Not Apply',
            categoryId: DINING_CATEGORY_ID,
            assigneeId: TAMIR_ID,
            tagIds: [RULE_TAG_ID],
          },
        ],
        accountOwnerMemberIds: [TAMIR_ID, ALEX_ID],
      })
    );

    expect(classified).toMatchObject({
      reviewType: 'settlement',
      reviewDescription: BILL_PAYMENT_CATEGORY_NAME,
      reviewCategoryId: BILL_PAYMENT_CATEGORY_ID,
      reviewAssigneeMemberIds: [],
      reviewTagIds: [],
    });
  });

  it('leaves settlement category empty when Bill Payment is missing from catalogs', () => {
    expect(
      classifyOne(
        baseRow({
          parsedType: 'settlement',
          parsedDescription: 'Visa payment',
        }),
        baseContext({
          catalogs: {
            categories: [{ id: DINING_CATEGORY_ID, name: 'Dining' }],
            tags: [],
            members: [],
          },
        })
      ).reviewCategoryId
    ).toBeNull();
  });
});

describe('classifyImportRows — merchant rules and precedence', () => {
  const coffeeRule = {
    pattern: 'STARBUCKS',
    matchType: 'contains' as const,
    renameTo: 'Starbucks',
    categoryId: DINING_CATEGORY_ID,
    assigneeId: TAMIR_ID,
    tagIds: [RULE_TAG_ID],
  };

  it('applies a matching merchant rule to a refund', () => {
    expect(
      classifyOne(
        baseRow({
          parsedType: 'refund',
          parsedDescription: 'STARBUCKS #123',
        }),
        baseContext({ merchantRules: [coffeeRule] })
      )
    ).toMatchObject({
      reviewType: 'refund',
      reviewDescription: 'Starbucks',
      reviewCategoryId: DINING_CATEGORY_ID,
      reviewAssigneeMemberIds: [TAMIR_ID],
      reviewTagIds: [RULE_TAG_ID],
    });
  });

  it('applies the first matching merchant rule to an expense', () => {
    expect(
      classifyOne(
        baseRow({
          parsedDescription: 'STARBUCKS #123',
        }),
        baseContext({
          merchantRules: [
            coffeeRule,
            {
              ...coffeeRule,
              pattern: 'STARBUCKS #123',
              matchType: 'exact',
              renameTo: 'Later Rule',
              categoryId: GROCERIES_CATEGORY_ID,
            },
          ],
        })
      )
    ).toMatchObject({
      reviewType: 'expense',
      reviewDescription: 'Starbucks',
      reviewCategoryId: DINING_CATEGORY_ID,
      reviewAssigneeMemberIds: [TAMIR_ID],
      reviewTagIds: [RULE_TAG_ID],
    });
  });

  it('lets resolved CSV hints override merchant-rule values', () => {
    expect(
      classifyOne(
        baseRow({
          parsedDescription: 'STARBUCKS #123',
          csvCategoryName: 'Groceries',
          csvAssigneeName: 'Alex Smith',
          csvTagNames: ['food', 'errands'],
        }),
        baseContext({ merchantRules: [coffeeRule] })
      )
    ).toMatchObject({
      reviewDescription: 'Starbucks',
      reviewCategoryId: GROCERIES_CATEGORY_ID,
      reviewAssigneeMemberIds: [ALEX_ID],
      reviewTagIds: [FOOD_TAG_ID, ERRANDS_TAG_ID],
    });
  });

  it('treats unresolved CSV hints as absent and continues to the next fallback', () => {
    expect(
      classifyOne(
        baseRow({
          parsedDescription: 'STARBUCKS #123',
          csvCategoryName: 'Travel',
          csvAssigneeName: 'Unknown Person',
          csvTagNames: ['missing'],
        }),
        baseContext({ merchantRules: [coffeeRule] })
      )
    ).toMatchObject({
      reviewCategoryId: DINING_CATEGORY_ID,
      reviewAssigneeMemberIds: [TAMIR_ID],
      reviewTagIds: [RULE_TAG_ID],
    });
  });

  it('does not merge rule tags with resolved CSV tags', () => {
    expect(
      classifyOne(
        baseRow({
          parsedDescription: 'STARBUCKS #123',
          csvTagNames: ['food'],
        }),
        baseContext({ merchantRules: [coffeeRule] })
      ).reviewTagIds
    ).toEqual([FOOD_TAG_ID]);
  });

  it('falls back to account ownership when no rule or CSV assignee resolves', () => {
    expect(
      classifyOne(baseRow(), baseContext({ accountOwnerMemberIds: [TAMIR_ID] }))
        .reviewAssigneeMemberIds
    ).toEqual([TAMIR_ID]);
    expect(
      classifyOne(
        baseRow(),
        baseContext({ accountOwnerMemberIds: [TAMIR_ID, ALEX_ID] })
      ).reviewAssigneeMemberIds
    ).toEqual([TAMIR_ID, ALEX_ID]);
    expect(classifyOne(baseRow()).reviewAssigneeMemberIds).toEqual([]);
  });

  it('leaves unresolved category, tags, and assignee empty without failing', () => {
    expect(classifyOne(baseRow())).toMatchObject({
      reviewType: 'expense',
      reviewDescription: 'Coffee',
      reviewCategoryId: null,
      reviewAssigneeMemberIds: [],
      reviewTagIds: [],
    });
  });

  it('ignores legacy seeded bill-payment merchant rules on expense rows', () => {
    expect(
      classifyOne(
        baseRow({
          parsedDescription: 'PAYMENT THANK YOU',
        }),
        baseContext({
          merchantRules: [
            {
              pattern: 'PAYMENT THANK YOU',
              matchType: 'contains',
              renameTo: BILL_PAYMENT_CATEGORY_NAME,
              categoryId: BILL_PAYMENT_CATEGORY_ID,
              assigneeId: null,
              tagIds: [],
            },
          ],
        })
      )
    ).toMatchObject({
      reviewType: 'expense',
      reviewDescription: 'PAYMENT THANK YOU',
      reviewCategoryId: null,
    });
  });

  it('ignores legacy bill-payment merchant rules on non-exact refund phrases', () => {
    expect(
      classifyOne(
        baseRow({
          parsedType: 'refund',
          parsedDescription: 'PAYMENT THANK YOU FROM JANE',
        }),
        baseContext({
          merchantRules: [
            {
              pattern: 'PAYMENT THANK YOU',
              matchType: 'contains',
              renameTo: BILL_PAYMENT_CATEGORY_NAME,
              categoryId: BILL_PAYMENT_CATEGORY_ID,
              assigneeId: null,
              tagIds: [],
            },
          ],
        })
      )
    ).toMatchObject({
      reviewType: 'refund',
      reviewDescription: 'PAYMENT THANK YOU FROM JANE',
      reviewCategoryId: null,
    });
  });
});

describe('classifyImportRows — member-name matching', () => {
  it('resolves a cardholder hint against a unique first or full name', () => {
    expect(
      classifyOne(baseRow({ csvAssigneeName: 'tamir' })).reviewAssigneeMemberIds
    ).toEqual([TAMIR_ID]);
    expect(
      classifyOne(baseRow({ csvAssigneeName: 'TAMIR ARNESTY' }))
        .reviewAssigneeMemberIds
    ).toEqual([TAMIR_ID]);
  });

  it('leaves assignees empty when a first name is ambiguous', () => {
    expect(
      classifyOne(
        baseRow({ csvAssigneeName: 'Tamir' }),
        baseContext({
          catalogs: {
            categories: [],
            tags: [],
            members: [
              {
                id: TAMIR_ID,
                displayName: 'Tamir Arnesty',
                firstName: 'Tamir',
              },
              {
                id: OTHER_TAMIR_ID,
                displayName: 'Tamir Smith',
                firstName: 'Tamir',
              },
            ],
          },
        })
      ).reviewAssigneeMemberIds
    ).toEqual([]);
  });

  it('still resolves a unique full name when the first name is shared', () => {
    expect(
      classifyOne(
        baseRow({ csvAssigneeName: 'Tamir Smith' }),
        baseContext({
          catalogs: {
            categories: [],
            tags: [],
            members: [
              {
                id: TAMIR_ID,
                displayName: 'Tamir Arnesty',
                firstName: 'Tamir',
              },
              {
                id: OTHER_TAMIR_ID,
                displayName: 'Tamir Smith',
                firstName: 'Tamir',
              },
            ],
          },
        })
      ).reviewAssigneeMemberIds
    ).toEqual([OTHER_TAMIR_ID]);
  });
});
