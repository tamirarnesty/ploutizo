import { Link } from '@tanstack/react-router';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@ploutizo/ui/components/field';

interface AccountSlotEmptyStateProps {
  label: string;
}

export const AccountSlotEmptyState = ({
  label,
}: AccountSlotEmptyStateProps) => (
  <Field data-testid="account-slot-empty-state">
    <FieldLabel>{label}</FieldLabel>
    <FieldDescription>
      No eligible account is available.{' '}
      <Link to="/accounts">Create one in Accounts</Link>
    </FieldDescription>
  </Field>
);
