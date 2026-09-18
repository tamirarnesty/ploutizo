import { FileUp } from 'lucide-react';

import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportDraftSummary } from '@ploutizo/types';
import { collectNav } from '@/lib/navigation/collect-nav';
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
  router: Parameters<typeof collectNav>[0],
  drafts: readonly ImportDraftSummary[] = []
): readonly CommandGroupDefinition[] => {
  const { commandGroups } = collectNav(router);

  if (drafts.length === 0) return commandGroups;

  return [
    {
      heading: 'Continue Import',
      commands: drafts.map(toImportDraftCommand),
    },
    ...commandGroups,
  ];
};
