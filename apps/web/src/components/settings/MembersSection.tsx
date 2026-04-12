import { useUser } from "@clerk/tanstack-react-start"
import { useGetOrgMembers, useRemoveMember } from "@/lib/data-access/org"
import { InviteMemberForm } from "./InviteMemberForm"
import { MemberRow } from "./MemberRow"

export const MembersSection = () => {
  const { data: members = [], isLoading } = useGetOrgMembers()
  const { user } = useUser()
  const removeMutation = useRemoveMember()

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold">Members</h2>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted motion-safe:animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">This household has no other members.</p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isCurrentUser={member.externalId === user?.id}
              onRemove={removeMutation.mutate}
            />
          ))}
        </ul>
      )}

      <InviteMemberForm />
    </section>
  )
}
