import { describe, expect, it } from 'vitest';
import * as utilsRoot from '../index';
import { resolveTransactionDescriptionLock } from './description-lock';
import {
  formatContributionDescription,
  formatGeneratedTransactionDescription,
  formatLinkedRefundDescription,
  formatSettlementDescription,
  formatTransferDescription,
} from './descriptions';

const transferCandidate = formatTransferDescription('Chequing', 'Savings');
const settlementCandidate = formatSettlementDescription(
  'Amex Cobalt',
  'Emily WS'
);
const contributionCandidate = formatContributionDescription('Chequing', 'FHSA');
const linkedRefundCandidate = formatLinkedRefundDescription('Coffee');

describe('resolveTransactionDescriptionLock', () => {
  describe('manual policy types', () => {
    it('keeps expense and income descriptions manual', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'expense',
          currentDescription: 'Coffee',
          generatedCandidate: '',
        })
      ).toEqual({
        policyMode: 'manual',
        userUnlocked: false,
        locked: false,
        description: 'Coffee',
      });
      expect(
        resolveTransactionDescriptionLock({
          type: 'income',
          currentDescription: 'Payday',
          generatedCandidate: '',
        })
      ).toEqual({
        policyMode: 'manual',
        userUnlocked: false,
        locked: false,
        description: 'Payday',
      });
    });

    it('keeps unlinked refunds manual', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'refund',
          refundOf: '',
          currentDescription: 'Store credit',
          generatedCandidate: '',
        })
      ).toEqual({
        policyMode: 'manual',
        userUnlocked: false,
        locked: false,
        description: 'Store credit',
      });
    });
  });

  describe('generated policy types open as locked when they match', () => {
    it.each([
      {
        type: 'transfer' as const,
        currentDescription: transferCandidate,
        generatedCandidate: transferCandidate,
      },
      {
        type: 'settlement' as const,
        currentDescription: settlementCandidate,
        generatedCandidate: settlementCandidate,
      },
      {
        type: 'contribution' as const,
        currentDescription: contributionCandidate,
        generatedCandidate: contributionCandidate,
      },
    ])('$type stays generated and adopts the candidate', (input) => {
      expect(resolveTransactionDescriptionLock(input)).toEqual({
        policyMode: 'generated',
        userUnlocked: false,
        locked: true,
        description: input.generatedCandidate,
      });
    });

    it('fills an empty generated description from the candidate', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'transfer',
          currentDescription: '',
          generatedCandidate: transferCandidate,
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: false,
        locked: true,
        description: transferCandidate,
      });
    });

    it('normalizes whitespace-only stored generated text to the candidate', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'settlement',
          currentDescription: `  ${settlementCandidate}  `,
          generatedCandidate: settlementCandidate,
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: false,
        locked: true,
        description: settlementCandidate,
      });
    });
  });

  describe('custom and legacy descriptions open as manual', () => {
    it('unlocks a custom transfer description that does not match the candidate', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'transfer',
          currentDescription: 'Move rent to savings',
          generatedCandidate: transferCandidate,
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: true,
        locked: false,
        description: 'Move rent to savings',
      });
    });

    it('unlocks a legacy settlement description that uses the card-only template', () => {
      const legacy = formatSettlementDescription('Amex Cobalt');
      expect(legacy).toBe('Settlement: Amex Cobalt');
      expect(
        resolveTransactionDescriptionLock({
          type: 'settlement',
          currentDescription: legacy,
          generatedCandidate: settlementCandidate,
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: true,
        locked: false,
        description: legacy,
      });
    });

    it('unlocks a custom contribution description', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'contribution',
          currentDescription: 'FHSA top-up',
          generatedCandidate: contributionCandidate,
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: true,
        locked: false,
        description: 'FHSA top-up',
      });
    });
  });

  describe('linked refund', () => {
    it('locks a generated linked-refund description that matches the candidate', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'refund',
          refundOf: 'tx-1',
          currentDescription: linkedRefundCandidate,
          generatedCandidate: linkedRefundCandidate,
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: false,
        locked: true,
        description: linkedRefundCandidate,
      });
    });

    it('unlocks a custom linked-refund description when the candidate is known', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'refund',
          refundOf: 'tx-1',
          currentDescription: 'Got money back',
          generatedCandidate: linkedRefundCandidate,
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: true,
        locked: false,
        description: 'Got money back',
      });
    });

    it('keeps custom linked-refund text while the original description is still loading', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'refund',
          refundOf: 'tx-1',
          currentDescription: 'Got money back',
          generatedCandidate: '',
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: false,
        locked: true,
        description: 'Got money back',
      });
    });

    it('unlocks custom linked-refund text when the candidate first resolves to a mismatch', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'refund',
          refundOf: 'tx-1',
          currentDescription: 'Got money back',
          generatedCandidate: linkedRefundCandidate,
          previousGeneratedCandidate: '',
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: true,
        locked: false,
        description: 'Got money back',
      });
    });

    it('fills an empty linked-refund description when the candidate first resolves', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'refund',
          refundOf: 'tx-1',
          currentDescription: '',
          generatedCandidate: linkedRefundCandidate,
          previousGeneratedCandidate: '',
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: false,
        locked: true,
        description: linkedRefundCandidate,
      });
    });
  });

  describe('lock/unlock: match updates, edit stays manual', () => {
    it('updates a generated transfer when the candidate changes and the field still matches', () => {
      const nextCandidate = formatTransferDescription('Chequing', 'FHSA');
      expect(
        resolveTransactionDescriptionLock({
          type: 'transfer',
          currentDescription: transferCandidate,
          generatedCandidate: nextCandidate,
          previousGeneratedCandidate: transferCandidate,
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: false,
        locked: true,
        description: nextCandidate,
      });
    });

    it('updates generated settlement and contribution candidates the same way', () => {
      const nextSettlement = formatSettlementDescription(
        'Amex Cobalt',
        'Tamir WS'
      );
      const nextContribution = formatContributionDescription('Savings', 'FHSA');

      expect(
        resolveTransactionDescriptionLock({
          type: 'settlement',
          currentDescription: settlementCandidate,
          generatedCandidate: nextSettlement,
          previousGeneratedCandidate: settlementCandidate,
        }).description
      ).toBe(nextSettlement);
      expect(
        resolveTransactionDescriptionLock({
          type: 'contribution',
          currentDescription: contributionCandidate,
          generatedCandidate: nextContribution,
          previousGeneratedCandidate: contributionCandidate,
        }).description
      ).toBe(nextContribution);
    });

    it('becomes manual after a user edit and does not re-lock when the candidate changes', () => {
      const edited = resolveTransactionDescriptionLock({
        type: 'transfer',
        currentDescription: 'Rent sweep',
        generatedCandidate: transferCandidate,
        previousGeneratedCandidate: transferCandidate,
        userUnlocked: true,
      });
      expect(edited).toEqual({
        policyMode: 'generated',
        userUnlocked: true,
        locked: false,
        description: 'Rent sweep',
      });

      const nextCandidate = formatTransferDescription('Chequing', 'FHSA');
      expect(
        resolveTransactionDescriptionLock({
          type: 'transfer',
          currentDescription: edited.description,
          generatedCandidate: nextCandidate,
          previousGeneratedCandidate: transferCandidate,
          userUnlocked: edited.userUnlocked,
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: true,
        locked: false,
        description: 'Rent sweep',
      });
    });

    it('stays manual even if the edited text later equals the generated candidate', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'settlement',
          currentDescription: settlementCandidate,
          generatedCandidate: settlementCandidate,
          userUnlocked: true,
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: true,
        locked: false,
        description: settlementCandidate,
      });
    });

    it('does not overwrite a locked empty field while the candidate is still empty', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'refund',
          refundOf: 'tx-1',
          currentDescription: '',
          generatedCandidate: '',
          previousGeneratedCandidate: '',
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: false,
        locked: true,
        description: '',
      });
    });

    it('adopts a new candidate when the caller marks leftover text as still following', () => {
      expect(
        resolveTransactionDescriptionLock({
          type: 'transfer',
          currentDescription: 'Coffee',
          generatedCandidate: transferCandidate,
          previousGeneratedCandidate: 'Coffee',
        })
      ).toEqual({
        policyMode: 'generated',
        userUnlocked: false,
        locked: true,
        description: transferCandidate,
      });
    });
  });
});

describe('formatGeneratedTransactionDescription coverage used by lock tests', () => {
  it('builds transfer, contribution, and linked-refund copy', () => {
    expect(
      formatGeneratedTransactionDescription({
        type: 'transfer',
        accountName: 'Chequing',
        counterpartAccountName: 'Savings',
      })
    ).toBe(transferCandidate);
    expect(
      formatGeneratedTransactionDescription({
        type: 'contribution',
        accountName: 'Chequing',
        counterpartAccountName: 'FHSA',
      })
    ).toBe(contributionCandidate);
    expect(
      formatGeneratedTransactionDescription({
        type: 'refund',
        accountName: 'Chequing',
        refundOf: 'tx-1',
        refundOriginalDescription: 'Coffee',
      })
    ).toBe(linkedRefundCandidate);
  });
});

describe('utils root barrel', () => {
  it('does not re-export description helpers from the package root', () => {
    expect(utilsRoot).not.toHaveProperty('resolveTransactionDescriptionLock');
    expect(utilsRoot).not.toHaveProperty('resolveTransactionDescriptionPolicy');
    expect(utilsRoot).not.toHaveProperty(
      'formatGeneratedTransactionDescription'
    );
    expect(utilsRoot).not.toHaveProperty(
      'formatGeneratedTransactionDescriptionFromAccounts'
    );
    expect(utilsRoot).not.toHaveProperty('formatTransferDescription');
    expect(utilsRoot).not.toHaveProperty('formatSettlementDescription');
    expect(utilsRoot).not.toHaveProperty('formatContributionDescription');
    expect(utilsRoot).not.toHaveProperty('formatLinkedRefundDescription');
  });
});
