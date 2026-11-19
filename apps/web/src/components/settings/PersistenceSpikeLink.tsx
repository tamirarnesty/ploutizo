import { Link } from '@tanstack/react-router';
import { Button } from '@ploutizo/ui/components/button';

export const PersistenceSpikeLink = () => (
  <Button
    nativeButton={false}
    variant="link"
    render={<Link to="/persistence-spike" />}
  >
    Persistence spike
  </Button>
);
