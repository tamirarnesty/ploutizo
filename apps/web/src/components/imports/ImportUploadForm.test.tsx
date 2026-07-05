import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportDraftSummary, ImportTargetAccount } from '@ploutizo/types';
import { ImportUploadForm } from './ImportUploadForm';

const uploadMocks = vi.hoisted(() => ({
  createImportDraftMutate: vi.fn(),
  navigate: vi.fn(),
  readCsvFile: vi.fn(),
  isPending: false,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => uploadMocks.navigate,
}));

vi.mock('@/lib/data-access/imports', () => ({
  useCreateImportDraft: () => ({
    mutate: uploadMocks.createImportDraftMutate,
    isPending: uploadMocks.isPending,
  }),
}));

vi.mock('@/lib/imports/readCsvFile', () => ({
  readCsvFile: (...args: unknown[]) => uploadMocks.readCsvFile(...args),
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

const targets: ImportTargetAccount[] = [
  {
    id: 'acct_1',
    name: 'Visa',
    institution: 'TD',
    lastFour: '1234',
  },
];

const activeDraft: ImportDraftSummary = {
  id: 'draft_1',
  accountId: 'acct_1',
  accountName: 'Visa',
  accountInstitution: 'TD',
  accountLastFour: '1234',
  source: 'ploutizo_normalized',
  status: 'draft',
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

const renderUploadForm = (
  props: Partial<React.ComponentProps<typeof ImportUploadForm>> = {}
) =>
  render(
    <TooltipProvider delay={0}>
      <ImportUploadForm targets={targets} activeDrafts={[]} {...props} />
    </TooltipProvider>
  );

describe('ImportUploadForm', () => {
  beforeEach(() => {
    uploadMocks.createImportDraftMutate.mockReset();
    uploadMocks.navigate.mockReset();
    uploadMocks.readCsvFile.mockReset();
    uploadMocks.isPending = false;
    uploadMocks.readCsvFile.mockResolvedValue(
      'date,amount,description,type\n2026-05-02,42.18,Coffee,expense'
    );
  });

  it('shows a validation error when submitting without a file', async () => {
    const user = userEvent.setup();
    renderUploadForm();

    await user.click(screen.getByRole('button', { name: 'Upload' }));

    expect(screen.getByText('Choose a CSV file first.')).toBeInTheDocument();
    expect(uploadMocks.createImportDraftMutate).not.toHaveBeenCalled();
  });

  it('shows a read error when the CSV file cannot be read', async () => {
    const user = userEvent.setup();
    uploadMocks.readCsvFile.mockRejectedValue({});
    renderUploadForm();

    const file = new File(['bad'], 'statement.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText('CSV file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't read that CSV file.")
      ).toBeInTheDocument()
    );
    expect(uploadMocks.createImportDraftMutate).not.toHaveBeenCalled();
  });

  it('shows a processing error when draft creation fails', async () => {
    const user = userEvent.setup();
    uploadMocks.createImportDraftMutate.mockImplementation(
      (_payload, options) => {
        options?.onError?.({});
      }
    );
    renderUploadForm();

    const file = new File(['csv'], 'statement.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText('CSV file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() =>
      expect(screen.getByText("Couldn't process that CSV.")).toBeInTheDocument()
    );
  });

  it('disables upload and shows Continue when the account already has an active draft', async () => {
    const user = userEvent.setup();
    renderUploadForm({ activeDrafts: [activeDraft] });

    expect(screen.getByLabelText('CSV file')).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Upload' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue' })
    ).toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Continue reviewing the active draft for this credit card.'
        )
      ).toBeInTheDocument()
    );
  });

  it('opens and closes the CSV guide dialog', async () => {
    const user = userEvent.setup();
    renderUploadForm();

    const dialog = screen
      .getByText('CSV import guide')
      .closest('[data-slot="dialog"]');
    expect(dialog).toHaveAttribute('data-open', 'false');

    await user.click(screen.getByRole('button', { name: 'Guide' }));

    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Required columns')).toBeInTheDocument();
  });
});
