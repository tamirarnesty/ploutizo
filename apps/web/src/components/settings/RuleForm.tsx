import { useAppForm } from '@ploutizo/ui/components/form';
import { Button } from '@ploutizo/ui/components/button';
import { Input } from '@ploutizo/ui/components/input';
import { DialogFooter } from '@ploutizo/ui/components/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@ploutizo/ui/components/field';
import { Text } from '@ploutizo/ui/components/text';
import type { RuleForm as RuleFormType } from '@ploutizo/validators';
import type { MerchantRule } from '@/lib/data-access/merchant-rules';
import {
  useCreateMerchantRule,
  useUpdateMerchantRule,
} from '@/lib/data-access/merchant-rules';
import { useGetCategories } from '@/lib/data-access/categories';

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: 'Exact',
  contains: 'Contains',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  regex: 'Regex',
};

interface RuleFormProps {
  rule: MerchantRule | null;
  onClose: () => void;
}

export const RuleForm = ({ rule, onClose }: RuleFormProps) => {
  const isEditing = rule !== null;
  const { data: categories = [] } = useGetCategories();
  const createRule = useCreateMerchantRule();
  const updateRule = useUpdateMerchantRule(rule?.id ?? '');

  const form = useAppForm({
    defaultValues: {
      pattern: rule?.pattern ?? '',
      matchType: rule?.matchType ?? 'contains',
      renameTo: rule?.renameTo ?? '',
      categoryId: rule?.categoryId ?? null, // null — NOT "__none__" (D-06)
    } satisfies RuleFormType,
    validators: {
      onSubmit: (): string | undefined => undefined,
    },
    onSubmit: ({ value }) => {
      const payload = {
        pattern: value.pattern.trim(),
        matchType: value.matchType,
        renameTo: value.renameTo.trim() || undefined,
        categoryId: value.categoryId, // already null — no conversion needed
      };
      const mutation = isEditing ? updateRule : createRule;
      mutation.mutate(payload, {
        onSuccess: onClose,
        onError: (err: unknown) => {
          const e = err as { error?: { code: string } };
          if (e.error?.code === 'INVALID_REGEX') {
            form.setFieldMeta('pattern', (prev) => ({
              ...prev,
              errors: ['Invalid regular expression.'],
            }));
          } else {
            form.setErrorMap({
              onSubmit:
                "Couldn't save changes. Check your connection and try again.",
            });
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
    >
      <FieldGroup>
        {/* Field 1: matchType */}
        <form.AppField name="matchType">
          {(field) => (
            <Field>
              <FieldLabel>Match type</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(v) =>
                  field.handleChange(v as MerchantRule['matchType'])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) => MATCH_TYPE_LABELS[v] ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(MATCH_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.AppField>

        {/* Field 2: pattern — required + cross-field regex validator on blur */}
        <form.AppField
          name="pattern"
          validators={{
            onChange: ({ value }) =>
              !value.trim() ? 'Pattern is required.' : undefined,
            onSubmit: ({ value }) =>
              !value.trim() ? 'Pattern is required.' : undefined,
            onBlur: ({ value, fieldApi }) => {
              const matchType = fieldApi.form.getFieldValue('matchType');
              if (matchType !== 'regex') return undefined;
              try {
                new RegExp(value);
                return undefined;
              } catch {
                return 'Invalid regular expression.';
              }
            },
          }}
        >
          {(field) => (
            <Field
              data-invalid={field.state.meta.errors.length > 0 || undefined}
            >
              <FieldLabel>Pattern</FieldLabel>
              <Input
                autoComplete="off"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={
                  form.getFieldValue('matchType') === 'regex'
                    ? '^AMAZON.*'
                    : 'AMAZON'
                }
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors.length > 0 ? (
                <FieldError errors={field.state.meta.errors as { message?: string }[]} />
              ) : null}
            </Field>
          )}
        </form.AppField>

        {/* Field 3: renameTo */}
        <form.AppField name="renameTo">
          {(field) => (
            <Field>
              <FieldLabel>
                Rename to{' '}
                <Text
                  as="span"
                  variant="body-sm"
                  className="font-normal text-muted-foreground"
                >
                  (optional)
                </Text>
              </FieldLabel>
              <Input
                autoComplete="off"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </Field>
          )}
        </form.AppField>

        {/* Field 4: categoryId — null bridge for Radix Select (D-06) */}
        <form.AppField name="categoryId">
          {(field) => (
            <Field>
              <FieldLabel>
                Category{' '}
                <Text
                  as="span"
                  variant="body-sm"
                  className="font-normal text-muted-foreground"
                >
                  (optional)
                </Text>
              </FieldLabel>
              <Select
                value={field.state.value ?? ''}
                onValueChange={(v) => field.handleChange(v === '' ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) =>
                      v ? (
                        (categories.find((c) => c.id === v)?.name ?? v)
                      ) : (
                        <Text
                          as="span"
                          variant="body-sm"
                          className="text-muted-foreground"
                        >
                          No category
                        </Text>
                      )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {/* NO SelectItem with value="" — Radix throws at runtime */}
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.AppField>
      </FieldGroup>

      <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
        {(err) => (err ? <Text variant="error">{String(err)}</Text> : null)}
      </form.Subscribe>

      <DialogFooter className="mt-4">
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <form.Subscribe
          selector={(s) => [s.isSubmitting, s.canSubmit] as const}
        >
          {([isSubmitting, canSubmit]) => (
            <Button type="submit" disabled={isSubmitting || !canSubmit}>
              Save rule
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
};
