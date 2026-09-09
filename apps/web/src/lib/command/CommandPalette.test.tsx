import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeImportDraftSummary } from '@/components/imports/test-fixtures/importDraft';
import { useGetImportDrafts } from '@/lib/data-access/imports';
import { CommandPalette } from './CommandPalette';
import { CommandPaletteContextProvider } from './useCommandPalette';

const commandMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  drafts: [] as ReturnType<typeof makeImportDraftSummary>[],
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => commandMocks.navigate,
}));

vi.mock('@/lib/data-access/imports', () => ({
  useGetImportDrafts: vi.fn(() => ({ data: commandMocks.drafts })),
}));

const draft = makeImportDraftSummary();

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
