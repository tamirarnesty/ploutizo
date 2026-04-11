import { useUser } from "@clerk/tanstack-react-start"
import { Badge } from "@ploutizo/ui/components/badge"
import { useGetOrgMembers } from "@/lib/data-access/org"

export const OrganizationMembersSettings = () => {
  const { data: members = [], isLoading } = useGetOrgMembers()
  const { user } = useUser()

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading text-xl font-semibold">Members</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members found.</p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-md border px-4 py-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{member.displayName}</span>
                {member.externalId === user?.id && (
                  <Badge variant="secondary">You</Badge>
                )}
              </span>
              <span className="ml-4 shrink-0 text-xs capitalize text-muted-foreground">
                {member.role}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
