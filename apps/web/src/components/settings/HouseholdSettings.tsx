import { useUser } from "@clerk/tanstack-react-start"
import { Trash2 } from "lucide-react"
import { toast } from "@ploutizo/ui/components/sonner"
import { InviteMemberFormSchema } from "@ploutizo/validators"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ploutizo/ui/components/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@ploutizo/ui/components/avatar"
import { Badge } from "@ploutizo/ui/components/badge"
import { Button } from "@ploutizo/ui/components/button"
import { useAppForm } from "@ploutizo/ui/components/form"
import { Input } from "@ploutizo/ui/components/input"
import { Label } from "@ploutizo/ui/components/label"
import { Separator } from "@ploutizo/ui/components/separator"
import { HouseholdSettingsForm } from "./HouseholdSettingsForm"
import { useGetHouseholdOverview } from "@/lib/data-access/household"
import { useGetOrgMembers, useInviteMember, useRemoveMember } from "@/lib/data-access/org"

export const HouseholdSettings = () => {
  const { data: overview, isLoading: overviewLoading } = useGetHouseholdOverview()
  const { data: members = [], isLoading: membersLoading } = useGetOrgMembers()
  const { user } = useUser()
  const inviteMutation = useInviteMember()
  const removeMutation = useRemoveMember()

  const form = useAppForm({
    defaultValues: { email: "" },
    validators: {
      onSubmit: ({ value }: { value: { email: string } }) => {
        const r = InviteMemberFormSchema.safeParse(value)
        if (!r.success) return r.error.issues.map((i: { message: string }) => i.message).join(", ")
      },
    },
    onSubmit: ({ value }) => {
      inviteMutation.mutate(value.email, {
        onSuccess: () => {
          form.reset()
          toast.success(`Invite sent to ${value.email}.`)
        },
        onError: (err) => {
          const code = (err as { error?: { code?: string } })?.error?.code
          if (code === "ALREADY_MEMBER") {
            toast.error("Already a member of this household.")
          } else if (code === "INVITATION_PENDING") {
            toast.error("An invitation is already pending for this email.")
          } else {
            toast.error("Failed to send invite. Try again.")
          }
        },
      })
    },
  })

  return (
    <div className="flex max-w-2xl flex-col gap-8">

      {/* Section 1: Household Overview (D-04, D-05) */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold">Household</h2>
        {overviewLoading ? (
          <div className="h-10 w-48 animate-pulse rounded bg-muted motion-safe:animate-pulse" />
        ) : (
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={overview?.imageUrl ?? undefined} />
              <AvatarFallback>
                {overview?.name?.charAt(0).toUpperCase() ?? "H"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold">{overview?.name ?? "—"}</span>
          </div>
        )}
      </section>

      <Separator />

      {/* Section 2: Members + invite form (D-06, D-07, D-08, D-10, D-11, D-12, D-13) */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-semibold">Members</h2>

        {membersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted motion-safe:animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">This household has no other members.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.externalId === user?.id
              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={member.imageUrl ?? undefined} />
                      <AvatarFallback>
                        {(member.firstName ?? member.displayName).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 truncate font-semibold">{member.displayName}</span>
                    {isCurrentUser ? (
                      <Badge variant="secondary">You</Badge>
                    ) : null}
                  </span>
                  <span className="ml-4 flex shrink-0 items-center gap-2">
                    <span className="text-xs capitalize text-muted-foreground">{member.role}</span>
                    {!isCurrentUser ? (
                      <AlertDialog>
                        <AlertDialogTrigger
                          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Remove ${member.displayName}`}
                        >
                          <Trash2 className="size-4" />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
                          <AlertDialogTitle>
                            Remove {member.firstName ?? member.displayName}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove {member.displayName} from this household? They will lose access immediately.
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep member</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => removeMutation.mutate(member.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {/* Inline invite form (D-03, D-10, D-11) */}
        <form
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
          className="flex flex-col gap-2"
        >
          <Label htmlFor="invite-email" className="text-sm font-medium">
            Invite member
          </Label>
          <div className="flex gap-2">
            <form.AppField
              name="email"
              validators={{
                onChange: ({ value }: { value: string }) => {
                  if (!value) return undefined
                  const r = InviteMemberFormSchema.shape.email.safeParse(value)
                  if (!r.success) return r.error.issues.map((i: { message: string }) => i.message).join(", ")
                },
              }}
            >
              {(field) => (
                <div className="flex flex-1 flex-col gap-1">
                  <Input
                    id="invite-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email address"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="flex-1"
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                  ) : null}
                </div>
              )}
            </form.AppField>
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  Send invite
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </section>

      <Separator />

      {/* Section 3: Settlement Threshold (existing, unchanged — D-02) */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="settlement-threshold" className="text-sm font-medium">
            Settlement reminder threshold
          </Label>
          <p className="text-xs text-muted-foreground">
            You&apos;ll be reminded when the shared balance exceeds this amount.
          </p>
        </div>
        <HouseholdSettingsForm />
      </section>

    </div>
  )
}
