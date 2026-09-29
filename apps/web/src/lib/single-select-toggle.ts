/**
 * `onValueChange` for a ToggleGroup where one option is always pressed. The group reports an array, which is
 * empty when the pressed option is clicked again; that click keeps the current option instead of clearing it.
 */
export const singleSelectToggle =
  <T extends string>(
    isOption: (value: string) => value is T,
    onSelect: (option: T) => void
  ) =>
  (values: string[]) => {
    const option = values.at(-1);
    if (option !== undefined && isOption(option)) {
      onSelect(option);
    }
  };
