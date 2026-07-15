import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDiscardImportDraft,
  useGetImportDrafts,
  useGetImportHistory,
  useGetImportTargets,
} from '@/lib/data-access/imports';
import { Import } from './Import';

const importMocks = vi.hoisted(() => ({
  createImportDraftMutate: vi.fn(),
  navigate: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode;
    to: string;
    params?: { draftId?: string };
  }) => (
    <a href={params?.draftId ? to.replace('$draftId', params.draftId) : to}>
      {children}
    </a>
  ),
  useNavigate: () => importMocks.navigate,
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
    icon,
    loading,
    disabled,
    ...props
  }: React.ComponentProps<'button'> & {
    icon?: React.ReactNode;
    loading?: boolean;
  }) => (
    <button {...props} disabled={loading || disabled}>
      {loading ? 'Loading ' : icon}
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
  useGetImportDrafts: vi.fn(),
  useGetImportHistory: vi.fn(),
  useGetImportTargets: vi.fn(),
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

const setImportPageData = ({
  activeDrafts = [],
  discardPending = false,
  discardingDraftId,
}: {
  activeDrafts?: (typeof draftSummary)[];
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
  vi.mocked(useDiscardImportDraft).mockReturnValue({
    mutate: vi.fn(),
    isPending: discardPending,
    variables: discardingDraftId,
  } as never);
};

describe('Import', () => {
  beforeEach(() => {
    importMocks.createImportDraftMutate.mockReset();
    importMocks.navigate.mockReset();
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
    vi.mocked(useDiscardImportDraft).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<Import />);

    expect(screen.getByText('No credit cards')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /add credit card/i })
    ).toHaveAttribute('href', '/accounts');
  });

  it('keeps static import controls available while page data loads', async () => {
    const user = userEvent.setup();

    vi.mocked(useGetImportTargets).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);
    vi.mocked(useGetImportDrafts).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);
    vi.mocked(useGetImportHistory).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);
    vi.mocked(useDiscardImportDraft).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<Import />);

    expect(screen.getByRole('heading', { name: 'Import' })).toBeInTheDocument();
    expect(screen.getByText('Credit card')).toBeInTheDocument();
    expect(screen.getByText('CSV file')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Guide' }));

    expect(screen.getByText('Required columns')).toBeInTheDocument();
  });

  it('blocks upload only while active draft status is loading', () => {
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
      data: undefined,
      isLoading: true,
    } as never);
    vi.mocked(useGetImportHistory).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useDiscardImportDraft).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<Import />);

    expect(screen.getByLabelText('CSV file')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guide' })).toBeEnabled();
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

  it('navigates to the review route after upload success', async () => {
    const user = userEvent.setup();
    setImportPageData();

    importMocks.createImportDraftMutate.mockImplementation(
      (_payload, options) => {
        options?.onSuccess?.({
          data: { id: 'draft_1' },
          meta: { reusedExisting: false },
        });
      }
    );

    render(<Import />);

    const content =
      'date,amount,description,type\n2026-05-02,42.18,Coffee,expense';
    const file = new File([content], 'statement.csv', { type: 'text/csv' });

    await user.upload(screen.getByLabelText('CSV file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() =>
      expect(importMocks.navigate).toHaveBeenCalledWith({
        to: '/transactions/import/$draftId',
        params: { draftId: 'draft_1' },
      })
    );
  });

  it('links active draft cards to the review route', () => {
    setImportPageData({ activeDrafts: [draftSummary] });

    render(<Import />);

    expect(screen.getByRole('link', { name: /continue/i })).toHaveAttribute(
      'href',
      '/transactions/import/draft_1'
    );
    expect(
      screen.queryByText('Date must be a valid YYYY-MM-DD value.')
    ).not.toBeInTheDocument();
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
