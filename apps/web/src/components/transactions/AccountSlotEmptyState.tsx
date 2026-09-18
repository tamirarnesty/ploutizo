import { Link } from '@tanstack/react-router';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@ploutizo/ui/components/field';
import type { AccountType } from '@ploutizo/types';
import { accountCreateRoute } from '@/lib/navigation';

interface AccountSlotEmptyStateProps {
  label: string;
  createAccountType: AccountType;
}

export const AccountSlotEmptyState = ({
  label,
  createAccountType,
}: AccountSlotEmptyStateProps) => (
  <Field data-testid="account-slot-empty-state">
    <FieldLabel>{label}</FieldLabel>
    <FieldDescription>
      No eligible account is available.{' '}
      <Link {...accountCreateRoute(createAccountType)}>
        Create one in Accounts
      </Link>
    </FieldDescription>
  </Field>
);
