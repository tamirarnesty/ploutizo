import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDiscardImportDraft,
  useGetImportDraft,
  useGetImportDrafts,
  useGetImportHistory,
  useGetImportTargets,
  useUpdateImportDraftRow,
} from '@/lib/data-access/imports';
import { Import } from './Import';

const importMocks = vi.hoisted(() => ({
  createImportDraftMutate: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: {
    info: importMocks.toastInfo,
    success: importMocks.toastSuccess,
  },
}));

vi.mock('@ploutizo/ui/components/file-field', () => ({
  FileField: ({
    id,
    label,
    value,
    onChange,
    disabled,
  }: {
    id?: string;
    label?: string;
    value: File | null;
    onChange: (file: File | null) => void;
    disabled?: boolean;
  }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="file"
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.item(0) ?? null)}
      />
      {value ? <button type="button">{value.name}</button> : null}
    </div>
  ),
}));

vi.mock('@ploutizo/ui/components/field', () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@ploutizo/ui/components/loading-button', () => ({
  LoadingButton: ({
    children,
    loading,
    ...props
  }: React.ComponentProps<'button'> & { loading?: boolean }) => (
    <button disabled={loading || props.disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/lib/data-access/imports', () => ({
  useCreateImportDraft: () => ({
    mutate: importMocks.createImportDraftMutate,
    isPending: false,
  }),
  useDiscardImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
  useGetImportDrafts: vi.fn(),
  useGetImportHistory: vi.fn(),
  useGetImportTargets: vi.fn(),
  useUpdateImportDraftRow: vi.fn(),
}));

const draftSummary = {
  id: 'draft_1',
  accountId: 'acct_1',
  accountName: 'Visa',
  accountInstitution: 'TD',
  accountLastFour: '1234',
  source: 'ploutizo_normalized',
  status: 'draft' as const,
  fileName: 'statement.csv',
  rowCount: 2,
  validRowCount: 1,
  invalidRowCount: 1,
  importedAt: '2026-05-20T12:00:00.000Z',
  completedAt: null,
  discardedAt: null,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-20T12:00:00.000Z',
};

const draft = {
  ...draftSummary,
  rows: [
    {
      id: 'row_1',
      batchId: 'draft_1',
      rowNumber: 2,
      status: 'ready' as const,
      invalidReason: null,
      rawData: { date: '2026-05-02', description: 'Coffee' },
      externalId: 'visa-1001',
      sourceDate: '2026-05-02',
      sourceAmount: '42.18',
      sourceDescription: 'Coffee',
      sourceType: 'expense',
      parsedDate: '2026-05-02',
      parsedAmount: 4218,
      parsedType: 'expense' as const,
      parsedDescription: 'Coffee',
      reviewDate: '2026-05-02',
      reviewAmount: 4218,
      reviewType: 'expense' as const,
      reviewDescription: 'Coffee',
      reviewCategoryName: 'Dining',
      reviewAssigneeHint: null,
      reviewRefundLinkHint: null,
      reviewNotes: null,
      reviewTags: [],
      createdAt: '2026-05-20T12:00:00.000Z',
      updatedAt: '2026-05-20T12:00:00.000Z',
    },
    {
      id: 'row_2',
      batchId: 'draft_1',
      rowNumber: 3,
      status: 'invalid' as const,
      invalidReason: 'Date must be a valid YYYY-MM-DD value.',
      rawData: { date: 'bad', amount: 'nope' },
      externalId: null,
      sourceDate: 'bad',
      sourceAmount: 'nope',
      sourceDescription: null,
      sourceType: 'wat',
      parsedDate: null,
      parsedAmount: null,
      parsedType: null,
      parsedDescription: null,
      reviewDate: null,
      reviewAmount: null,
      reviewType: null,
      reviewDescription: null,
      reviewCategoryName: null,
      reviewAssigneeHint: null,
      reviewRefundLinkHint: null,
      reviewNotes: null,
      reviewTags: [],
      createdAt: '2026-05-20T12:00:00.000Z',
      updatedAt: '2026-05-20T12:00:00.000Z',
    },
  ],
};

const setImportPageData = ({
  activeDrafts = [],
  selectedDraft,
  discardPending = false,
  discardingDraftId,
}: {
  activeDrafts?: (typeof draftSummary)[];
  selectedDraft?: typeof draft;
  discardPending?: boolean;
  discardingDraftId?: string;
} = {}) => {
  vi.mocked(useGetImportTargets).mockReturnValue({
    data: [
      {
        id: 'acct_1',
        name: 'Visa',
        institution: 'TD',
        lastFour: '1234',
      },
    ],
    isLoading: false,
  } as never);
  vi.mocked(useGetImportDrafts).mockReturnValue({
    data: activeDrafts,
    isLoading: false,
  } as never);
  vi.mocked(useGetImportHistory).mockReturnValue({
    data: [],
    isLoading: false,
  } as never);
  vi.mocked(useGetImportDraft).mockReturnValue({
    data: selectedDraft,
    isLoading: false,
  } as never);
  vi.mocked(useDiscardImportDraft).mockReturnValue({
    mutate: vi.fn(),
    isPending: discardPending,
    variables: discardingDraftId,
  } as never);
  vi.mocked(useUpdateImportDraftRow).mockReturnValue({
    mutate: vi.fn(),
  } as never);
};

describe('Import', () => {
  beforeEach(() => {
    importMocks.createImportDraftMutate.mockReset();
    importMocks.toastInfo.mockReset();
    importMocks.toastSuccess.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:csv'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('shows the no-credit-card empty state', () => {
    vi.mocked(useGetImportTargets).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useGetImportDrafts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useGetImportHistory).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useGetImportDraft).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never);
    vi.mocked(useDiscardImportDraft).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useUpdateImportDraftRow).mockReturnValue({
      mutate: vi.fn(),
    } as never);

    render(<Import />);

    expect(screen.getByText('No credit cards')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /add credit card/i })
    ).toHaveAttribute('href', '/accounts');
  });

  it('opens the CSV guide in app', async () => {
    const user = userEvent.setup();
    setImportPageData();

    render(<Import />);

    const dialog = screen
      .getByText('CSV import guide')
      .closest('[data-slot="dialog"]');
    expect(dialog).toHaveAttribute('data-open', 'false');

    await user.click(screen.getByRole('button', { name: 'Guide' }));

    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Required columns')).toBeInTheDocument();
    expect(screen.getByText('Optional columns')).toBeInTheDocument();
  });

  it('submits the selected CSV file from the compact upload field', async () => {
    const user = userEvent.setup();
    setImportPageData();

    render(<Import />);

    const content =
      'date,amount,description,type\n2026-05-02,42.18,Coffee,expense';
    const file = new File([content], 'statement.csv', { type: 'text/csv' });

    await user.upload(screen.getByLabelText('CSV file'), file);

    expect(
      screen.getByRole('button', { name: /statement.csv/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() =>
      expect(importMocks.createImportDraftMutate).toHaveBeenCalledWith(
        { accountId: 'acct_1', fileName: 'statement.csv', content },
        expect.any(Object)
      )
    );
  });

  it('reviews invalid rows and persists edited review fields', async () => {
    const user = userEvent.setup();
    const updateRow = vi.fn();
    vi.mocked(useGetImportTargets).mockReturnValue({
      data: [
        {
          id: 'acct_1',
          name: 'Visa',
          institution: 'TD',
          lastFour: '1234',
        },
      ],
      isLoading: false,
    } as never);
    vi.mocked(useGetImportDrafts).mockReturnValue({
      data: [draftSummary],
      isLoading: false,
    } as never);
    vi.mocked(useGetImportHistory).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useGetImportDraft).mockReturnValue({
      data: draft,
      isLoading: false,
    } as never);
    vi.mocked(useDiscardImportDraft).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useUpdateImportDraftRow).mockReturnValue({
      mutate: updateRow,
    } as never);

    render(<Import />);

    await user.click(screen.getAllByRole('button', { name: /continue/i })[0]);

    expect(
      screen.getByText('Date must be a valid YYYY-MM-DD value.')
    ).toBeInTheDocument();

    const descriptionInput = screen.getByDisplayValue('Coffee');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Coffee shop');
    await user.tab();

    expect(updateRow).toHaveBeenCalledWith({
      draftId: 'draft_1',
      rowId: 'row_1',
      body: { reviewDescription: 'Coffee shop' },
    });
  });

  it('shows loading only on the draft being discarded', () => {
    setImportPageData({
      activeDrafts: [
        draftSummary,
        { ...draftSummary, id: 'draft_2', fileName: 'other.csv' },
      ],
      discardPending: true,
      discardingDraftId: 'draft_1',
    });

    render(<Import />);

    const discardButtons = screen.getAllByRole('button', { name: /discard/i });
    expect(discardButtons[0]).toBeDisabled();
    expect(discardButtons[1]).not.toBeDisabled();
  });
});
