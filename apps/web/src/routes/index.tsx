import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';

const App = () => {
  return (
    <div>
      <h1>Index Route</h1>
      <Show when="signed-in">
        <UserButton />
      </Show>
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
    </div>
  );
};

export const Route = createFileRoute('/')({ component: App });
