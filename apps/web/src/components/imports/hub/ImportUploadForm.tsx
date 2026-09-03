import {
  ImportUploadProvider,
  useImportUpload,
} from './upload/ImportUploadContext';
import { ImportUploadFormatStep } from './upload/ImportUploadFormatStep';
import { ImportUploadIdleStep } from './upload/ImportUploadIdleStep';
import type { ImportUploadFormProps } from './upload/ImportUploadContext';

const ImportUploadFlow = () => {
  const { step } = useImportUpload();

  if (step.kind === 'choose_format') {
    return <ImportUploadFormatStep />;
  }

  return <ImportUploadIdleStep />;
};

export const ImportUploadForm = (props: ImportUploadFormProps) => (
  <ImportUploadProvider {...props}>
    <ImportUploadFlow />
  </ImportUploadProvider>
);
