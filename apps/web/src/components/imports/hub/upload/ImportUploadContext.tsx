import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import type {
  ImportContentProfileId,
  ImportContentSelection,
  ImportDraftSummary,
  ImportTargetAccount,
} from '@ploutizo/types';
import { useCreateImportDraft } from '@/lib/data-access/imports';
import { getApiErrorMessage } from '@/lib/queryClient';
import type { ReactNode } from 'react';

export type ImportUploadChooseFormatStep = {
  kind: 'choose_format';
  content: string;
  fileName: string;
  accountId: string;
  candidateProfileIds: ImportContentProfileId[];
  columns: string[];
  sampleRows: string[][];
};

export type ImportUploadStep = { kind: 'idle' } | ImportUploadChooseFormatStep;

type ImportUploadProviderProps = {
  targets: ImportTargetAccount[];
  targetsLoading?: boolean;
  activeDrafts: ImportDraftSummary[];
  activeDraftsLoading?: boolean;
  children: ReactNode;
};

export type ImportUploadFormProps = Omit<ImportUploadProviderProps, 'children'>;

type ImportUploadContextValue = {
  targets: ImportTargetAccount[];
  targetsLoading: boolean;
  activeDraftsLoading: boolean;
  activeDraftByAccount: Map<string, ImportDraftSummary>;
  firstTargetId: string;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  uploadError: string | null;
  setUploadError: (message: string | null) => void;
  step: ImportUploadStep;
  isSubmitting: boolean;
  submitDraft: (
    accountId: string,
    fileName: string,
    content: string,
    selection?: ImportContentSelection
  ) => void;
  cancelFormatChoice: () => void;
  goToDraftReview: (draftId: string) => void;
};

const ImportUploadContext = createContext<ImportUploadContextValue | null>(
  null
);

export const ImportUploadProvider = ({
  targets,
  targetsLoading = false,
  activeDrafts,
  activeDraftsLoading = false,
  children,
}: ImportUploadProviderProps) => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [step, setStep] = useState<ImportUploadStep>({ kind: 'idle' });

  const createDraft = useCreateImportDraft();
  const isSubmitting = createDraft.isPending;
  const firstTargetId = targets[0]?.id ?? '';

  const activeDraftByAccount = useMemo(() => {
    const map = new Map<string, ImportDraftSummary>();
    for (const draft of activeDrafts) map.set(draft.account.id, draft);
    return map;
  }, [activeDrafts]);

  const goToDraftReview = useCallback(
    (draftId: string) => {
      void navigate({
        to: '/transactions/import/$draftId',
        params: { draftId },
      });
    },
    [navigate]
  );

  const submitDraft = useCallback(
    (
      accountId: string,
      fileName: string,
      content: string,
      selection?: ImportContentSelection
    ) => {
      createDraft.mutate(
        { accountId, fileName, content, selection },
        {
          onSuccess: (response) => {
            if (response.kind === 'mapping_required') {
              setStep({
                kind: 'choose_format',
                content,
                fileName,
                accountId,
                candidateProfileIds: response.candidateProfileIds,
                columns: response.columns,
                sampleRows: response.sampleRows,
              });
              return;
            }
            setSelectedFile(null);
            setUploadError(null);
            setStep({ kind: 'idle' });
            goToDraftReview(response.data.id);
          },
          onError: (error) => {
            setUploadError(
              getApiErrorMessage(error, "Couldn't process that CSV.")
            );
          },
        }
      );
    },
    [createDraft, goToDraftReview]
  );

  const cancelFormatChoice = useCallback(() => {
    setStep({ kind: 'idle' });
    setUploadError(null);
  }, []);

  const value = useMemo(
    () => ({
      targets,
      targetsLoading,
      activeDraftsLoading,
      activeDraftByAccount,
      firstTargetId,
      selectedFile,
      setSelectedFile,
      uploadError,
      setUploadError,
      step,
      isSubmitting,
      submitDraft,
      cancelFormatChoice,
      goToDraftReview,
    }),
    [
      targets,
      targetsLoading,
      activeDraftsLoading,
      activeDraftByAccount,
      firstTargetId,
      selectedFile,
      uploadError,
      step,
      isSubmitting,
      submitDraft,
      cancelFormatChoice,
      goToDraftReview,
    ]
  );

  return (
    <ImportUploadContext.Provider value={value}>
      {children}
    </ImportUploadContext.Provider>
  );
};

export const useImportUpload = () => {
  const context = useContext(ImportUploadContext);
  if (!context) {
    throw new Error('useImportUpload must be used within ImportUploadProvider');
  }
  return context;
};
