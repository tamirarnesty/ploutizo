import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/components/home/HomePage';
import { AccessPolicyBoundary } from '@/lib/access';

const Page = () => (
  <AccessPolicyBoundary policy="guest">
    <HomePage />
  </AccessPolicyBoundary>
);

export const Route = createFileRoute('/')({
  component: Page,
});
