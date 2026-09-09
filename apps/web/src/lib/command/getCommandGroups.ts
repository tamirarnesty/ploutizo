import { FileUp } from 'lucide-react';

import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportDraftSummary } from '@ploutizo/types';
import { staticCommandGroups } from '@/lib/command/staticCommandGroups';
import type {
  CommandGroupDefinition,
  ImportDraftCommand,
} from '@/lib/command/types';

const toImportDraftCommand = (
  draft: ImportDraftSummary
): ImportDraftCommand => {
  const accountLabel = formatAccountLabel(draft.account);
  const fileName = draft.fileName ?? 'Untitled CSV';

  return {
    type: 'import-draft',
    id: `import-draft-${draft.id}`,
    label: `${accountLabel} — ${fileName}`,
    draftId: draft.id,
    icon: FileUp,
    keywords: ['continue', 'draft', accountLabel, fileName],
  };
};

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
