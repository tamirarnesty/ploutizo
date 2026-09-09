import { FileUp } from 'lucide-react';

import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportDraftSummary } from '@ploutizo/types';
import { staticCommandGroups } from '@/lib/navigation';
import type {
  CommandGroupDefinition,
  ImportDraftCommand,
} from '@/lib/command/types';

const toImportDraftCommand = (
  draft: ImportDraftSummary
): ImportDraftCommand => ({
  type: 'import-draft',
  id: `import-draft-${draft.id}`,
  label: `${formatAccountLabel(draft.account)} — ${
    draft.fileName ?? 'Untitled CSV'
  }`,
  draftId: draft.id,
  icon: FileUp,
  keywords: [
    'continue',
    'draft',
    formatAccountLabel(draft.account),
    draft.fileName ?? '',
  ],
});

export const getCommandGroups = (
  drafts: readonly ImportDraftSummary[] = []
): readonly CommandGroupDefinition[] => {
  if (drafts.length === 0) return staticCommandGroups;

  return [
    {
      heading: 'Continue Import',
      commands: drafts.map(toImportDraftCommand),
    },
    ...staticCommandGroups,
  ];
};
