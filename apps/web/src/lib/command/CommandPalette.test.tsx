import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportDraftSummary } from '@ploutizo/types';
import { useGetImportDrafts } from '@/lib/data-access/imports';
import { CommandPalette } from './CommandPalette';
import { CommandPaletteContextProvider } from './useCommandPalette';

const commandMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  drafts: [] as ImportDraftSummary[],
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => commandMocks.navigate,
}));

vi.mock('@/lib/data-access/imports', () => ({
  useGetImportDrafts: vi.fn(() => ({ data: commandMocks.drafts })),
}));

const draft: ImportDraftSummary = {
  id: 'draft_123',
  account: {
    id: 'account_123',
    name: 'Visa',
    institutionId: null,
    lastFour: '1234',
  },
  contentProfileId: null,
  status: 'draft',
  fileName: 'august.csv',
  rowCount: 12,
  validRowCount: 12,
  invalidRowCount: 0,
  importedAt: '2026-09-09T00:00:00.000Z',
  completedAt: null,
  discardedAt: null,
  createdAt: '2026-09-09T00:00:00.000Z',
  updatedAt: '2026-09-09T00:00:00.000Z',
};

const renderPalette = (open = true) =>
  render(
    <CommandPaletteContextProvider value={{ open, setOpen: vi.fn() }}>
      <CommandPalette />
    </CommandPaletteContextProvider>
  );

describe('CommandPalette', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    commandMocks.navigate.mockReset();
    commandMocks.drafts = [];
    vi.mocked(useGetImportDrafts).mockClear();
  });

  it('loads drafts for the authenticated session even while closed', () => {
    renderPalette(false);

    expect(useGetImportDrafts).toHaveBeenCalledWith();
  });

  it('omits Continue Import when there are no active drafts', () => {
    renderPalette();

    expect(screen.queryByText('Continue Import')).not.toBeInTheDocument();
    expect(
      [...document.querySelectorAll('[cmdk-group-heading]')].map(
        (heading) => heading.textContent
      )
    ).toEqual(['Navigation', 'Settings']);
  });

  it('places Continue Import first and resumes the draft', async () => {
    const user = userEvent.setup();
    commandMocks.drafts = [draft];
    renderPalette();

    const headings = [...document.querySelectorAll('[cmdk-group-heading]')].map(
      (heading) => heading.textContent
    );
    expect(headings).toEqual(['Continue Import', 'Navigation', 'Settings']);

    await user.click(screen.getByText('Visa · ••1234 — august.csv'));

    expect(commandMocks.navigate).toHaveBeenCalledWith({
      to: '/import/$draftId',
      params: { draftId: draft.id },
    });
  });
});
