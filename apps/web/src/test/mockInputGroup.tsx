import { vi } from 'vitest';
import type { ComponentProps } from 'react';

export const inputGroupMock = {
  InputGroup: ({
    children,
    className,
  }: ComponentProps<'div'> & { className?: string }) => (
    <div className={className}>{children}</div>
  ),
  InputGroupAddon: ({ children }: ComponentProps<'div'>) => (
    <div>{children}</div>
  ),
  InputGroupText: ({ children }: ComponentProps<'span'>) => (
    <span>{children}</span>
  ),
  InputGroupInput: (props: ComponentProps<'input'>) => <input {...props} />,
};

vi.mock('@ploutizo/ui/components/input-group', () => inputGroupMock);
