import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileUp, Settings } from 'lucide-react';
import { resetRouterMocks, routerMocks } from '@/test/mockTanstackRouter';
import { makeImportDraftSummary } from '@/components/imports/test-fixtures/importDraft';
import { useGetImportDrafts } from '@/lib/data-access/imports';
import { importDraftReviewRoute } from '@/lib/navigation';
import { CommandPalette } from './CommandPalette';
import { CommandPaletteContextProvider } from './useCommandPalette';

const commandMocks = vi.hoisted(() => ({
  drafts: [] as ReturnType<typeof makeImportDraftSummary>[],
}));

vi.mock('@/lib/data-access/imports', () => ({
  useGetImportDrafts: vi.fn(() => ({ data: commandMocks.drafts })),
}));

vi.mock('@/lib/command/getCommandGroups', () => ({
  getCommandGroups: (
    _router: unknown,
    drafts: ReturnType<typeof makeImportDraftSummary>[] = []
  ) => {
    const staticGroups = [
      {
        heading: 'Navigation',
        commands: [
          {
            type: 'nav',
            id: 'nav-dashboard',
            label: 'Dashboard',
            to: '/dashboard',
            icon: FileUp,
          },
        ],
      },
      {
        heading: 'Settings',
        commands: [
          {
            type: 'nav',
            id: 'nav-settings',
            label: 'Settings',
            to: '/settings',
            icon: Settings,
          },
        ],
      },
    ];

    if (drafts.length === 0) return staticGroups;

    return [
      {
        heading: 'Continue Import',
        commands: drafts.map((draft) => ({
          type: 'import-draft',
          id: `import-draft-${draft.id}`,
          label: 'Visa · ••1234 — august.csv',
          draftId: draft.id,
          icon: FileUp,
        })),
      },
      ...staticGroups,
    ];
  },
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
    resetRouterMocks();
    commandMocks.drafts = [];
    vi.mocked(useGetImportDrafts).mockClear();
  });

  it('only subscribes to drafts while the palette is open', () => {
    renderPalette(false);
    expect(useGetImportDrafts).toHaveBeenCalledWith({ enabled: false });

    vi.mocked(useGetImportDrafts).mockClear();
    renderPalette(true);
    expect(useGetImportDrafts).toHaveBeenCalledWith({ enabled: true });
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

    expect(routerMocks.navigate).toHaveBeenCalledWith(
      importDraftReviewRoute(draft.id)
    );
  });
});
