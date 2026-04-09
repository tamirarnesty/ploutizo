---
status: awaiting_human_verify
trigger: "The error message in the categories dialog does not correctly show the error message"
created: 2026-04-09T00:00:00Z
updated: 2026-04-09T00:00:00Z
---

## Current Focus

hypothesis: field.state.meta.errors[0]?.toString() produces "[object Object]" because TanStack Form stores Zod v4 Standard Schema issue objects (not strings) in field.state.meta.errors
test: Confirmed by tracing standardSchemaValidators.validate → returns result.issues (Standard Schema Issue objects with {message, path, ...}) → stored flat in field.state.meta.errors → toString() on plain object = "[object Object]"
expecting: Fix must extract .message from the issue object, or use FieldError errors prop
next_action: Apply fix to CategoryForm.tsx — change field error display from .toString() to .message extraction

## Symptoms

expected: When a form-level error occurs in the CategoryDialog (either from TanStack Form's onSubmit validator OR from the mutation's onError callback via setErrorMap), a user-readable error message should appear below the form fields.
actual: The error message does not correctly show (either not showing at all, or showing incorrect content like "[object Object]" or similar).
errors: Visual UI bug — no JS console error reported yet
reproduction: Open the Categories dialog in Settings. Try to submit with an empty name field.
timeline: Discovered during phase 02.4.1 (mobile UI/UX fixes).

## Eliminated

- hypothesis: form.Subscribe selector doesn't reactively update when setErrorMap is called
  evidence: useStore(form.store, selector) uses useSyncExternalStoreWithSelector with strict equality — string primitives compare by value, so updates trigger re-render correctly
  timestamp: 2026-04-09

- hypothesis: setErrorMap doesn't correctly store the string value
  evidence: setErrorMap else branch: baseStore.setState(prev => ({ ...prev, errorMap: { ...prev.errorMap, [key]: value } })) — plain string passes isGlobalFormValidationError check as false, stored directly
  timestamp: 2026-04-09

- hypothesis: form-level Subscribe shows object because form-level validator returns object
  evidence: Form-level onSubmit validator is a plain function returning string (not a Zod schema), so normalizeError returns {formError: string}
  timestamp: 2026-04-09

- hypothesis: mutation onError callback doesn't fire
  evidence: TanStack Query v5 MutationObserver fires #mutateOptions.onError when hasListeners() is true (component still mounted). Dialog is still open on error so component is mounted.
  timestamp: 2026-04-09

## Evidence

- timestamp: 2026-04-09
  checked: CategoryForm.tsx lines 83-85
  found: field.state.meta.errors[0]?.toString() used to display field error
  implication: If meta.errors[0] is an object, toString() → "[object Object]"

- timestamp: 2026-04-09
  checked: TanStack Form form-core FormApi.js standardSchemaValidator.js
  found: standardSchemaValidators.validate with validationSource="field" returns result.issues (array of Standard Schema Issue objects: {message: string, path?: ...})
  implication: These objects are stored flat in fieldMeta.errors via flat(1); each element is {message, path, ...} — not a string

- timestamp: 2026-04-09
  checked: Zod v4 ~standard.validate return value
  found: Returns {issues: r.error?.issues} where r.error.issues are Standard Schema Issue objects {message: string, ...}
  implication: field.state.meta.errors[0] IS a Standard Schema Issue object when using validators={{ onChange: ZodSchema }}

- timestamp: 2026-04-09
  checked: FieldError component in packages/ui/src/components/field.tsx
  found: Accepts errors?: Array<{message?: string} | undefined> prop OR children. When given errors prop, renders error.message
  implication: Fix should either pass errors prop OR extract .message manually

- timestamp: 2026-04-09
  checked: Form-level error display (lines 115-121)
  found: String(err) where err = s.errorMap.onSubmit. Form validator returns string; setErrorMap sets string. String(string) → correct.
  implication: Form-level display is correct for both code paths. The bug is ONLY in the field-level display.

- timestamp: 2026-04-09
  checked: ValidationLogic.js case "submit"
  found: On submit, onChange validator ALSO runs (not just onSubmit). So field onChange Zod schema runs on form submit.
  implication: Empty name on submit → field's onChange Zod validator fires → issue objects in meta.errors → toString() = "[object Object]" shown in FieldError

## Resolution

root_cause: TanStack Form stores Zod v4 Standard Schema Issue objects (not strings) in field.state.meta.errors when a Zod schema is used as a validator (validators={{ onChange: ZodSchema }}). The field error display in CategoryForm calls field.state.meta.errors[0]?.toString() which produces "[object Object]" instead of the human-readable message. Fix: extract .message from the issue object.

fix: In CategoryForm.tsx line 84, replace field.state.meta.errors[0]?.toString() with a message-safe extraction. Use the errors prop of FieldError (which already expects {message?: string} objects) instead of children with toString().

verification: Fix applied. TypeScript reports no errors in CategoryForm.tsx. Awaiting user confirmation that field errors now display the message text instead of [object Object].
files_changed: [apps/web/src/components/settings/CategoryForm.tsx]
