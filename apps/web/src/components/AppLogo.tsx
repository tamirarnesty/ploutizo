import { Text } from '@ploutizo/ui/components/text';

export const AppLogo = () => {
  // body variant = text-base; override with text-lg for brand mark size
  return (
    <Text
      as="span"
      variant="body"
      className="text-lg font-medium text-foreground"
    >
      Ploutizo
    </Text>
  );
};
