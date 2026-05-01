import { toast } from '@ploutizo/ui/components/sonner';
import { InviteMemberFormSchema } from '@ploutizo/validators';
import { Button } from '@ploutizo/ui/components/button';
import { FieldError } from '@ploutizo/ui/components/field';
import { useAppForm } from '@ploutizo/ui/components/form';
import { Input } from '@ploutizo/ui/components/input';
import { Label } from '@ploutizo/ui/components/label';
import { useInviteMember } from '@/lib/data-access/org';

export const InviteMemberForm = () => {
  const inviteMutation = useInviteMember();

  const form = useAppForm({
    defaultValues: { email: '' },
    validators: {
      onSubmit: ({ value }: { value: { email: string } }) => {
        const r = InviteMemberFormSchema.safeParse(value);
        if (!r.success)
          return r.error.issues
            .map((i: { message: string }) => i.message)
            .join(', ');
      },
    },
    onSubmit: ({ value }) => {
      inviteMutation.mutate(value.email, {
        onSuccess: () => {
          form.reset();
          toast.success(`Invite sent to ${value.email}.`);
        },
        onError: (err) => {
          const code = (err as { error?: { code?: string } }).error?.code;
          if (code === 'ALREADY_MEMBER') {
            toast.error('Already a member of this household.');
          } else if (code === 'INVITATION_PENDING') {
            toast.error('An invitation is already pending for this email.');
          } else if (code === 'QUOTA_EXCEEDED') {
            toast.error('Member limit reached for this household.');
          } else {
            toast.error('Failed to send invite. Try again.');
          }
        },
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="invite-email" className="text-sm font-medium">
        Invite member
      </Label>
      <div className="flex gap-2">
        <form.AppField
          name="email"
          validators={{
            onBlur: ({ value }: { value: string }) => {
              if (!value) return undefined;
              const r = InviteMemberFormSchema.shape.email.safeParse(value);
              if (!r.success)
                return r.error.issues
                  .map((i: { message: string }) => i.message)
                  .join(', ');
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
                <FieldError
                  errors={field.state.meta.errors as { message?: string }[]}
                />
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
  );
};
