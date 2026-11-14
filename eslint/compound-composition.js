/**
 * Enforce @ploutizo/ui compound composition (InputGroup parts/order, Tabs).
 * Do not lint classNames or spacing.
 */

const INPUT_GROUP = 'InputGroup';
const INPUT_GROUP_PARTS = new Set([
  'InputGroupInput',
  'InputGroupTextarea',
  'InputGroupAddon',
  'InputGroupButton',
  'InputGroupText',
]);
const RAW_IN_INPUT_GROUP = new Set(['Input', 'Textarea']);

const jsxName = (node) => {
  const name = node?.openingElement?.name;
  if (!name) return null;
  if (name.type === 'JSXIdentifier') return name.name;
  return null;
};

const hasAncestorNamed = (ancestors, name) =>
  ancestors.some(
    (ancestor) => ancestor.type === 'JSXElement' && jsxName(ancestor) === name
  );

const attributeValue = (opening, attrName) => {
  const attr = opening.attributes?.find(
    (item) =>
      item.type === 'JSXAttribute' &&
      item.name?.type === 'JSXIdentifier' &&
      item.name.name === attrName
  );
  if (!attr?.value) return null;
  if (attr.value.type === 'Literal') return attr.value.value;
  if (
    attr.value.type === 'JSXExpressionContainer' &&
    attr.value.expression?.type === 'Literal'
  ) {
    return attr.value.expression.value;
  }
  return null;
};

const childElements = (node) =>
  (node.children ?? []).filter((child) => child.type === 'JSXElement');

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require documented @ploutizo/ui InputGroup and Tabs composition.',
    },
    schema: [],
    messages: {
      partOutsideGroup:
        'Use {{name}} inside {{parent}}. Do not compose this part on its own.',
      rawInputInGroup:
        'Do not put {{name}} inside InputGroup. Use InputGroupInput or InputGroupTextarea.',
      addonOrder:
        'Place InputGroupAddon after InputGroupInput, or set align="inline-start" when the addon comes first.',
      tabsTrigger:
        'TabsTrigger must be inside TabsList (and Tabs).',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      JSXElement(node) {
        const name = jsxName(node);
        if (!name) return;
        const ancestors = sourceCode.getAncestors(node);

        if (INPUT_GROUP_PARTS.has(name) && !hasAncestorNamed(ancestors, INPUT_GROUP)) {
          context.report({
            node: node.openingElement,
            messageId: 'partOutsideGroup',
            data: { name, parent: INPUT_GROUP },
          });
        }

        if (name === 'TabsTrigger') {
          if (
            !hasAncestorNamed(ancestors, 'TabsList') ||
            !hasAncestorNamed(ancestors, 'Tabs')
          ) {
            context.report({
              node: node.openingElement,
              messageId: 'tabsTrigger',
            });
          }
        }

        if (name !== INPUT_GROUP) return;

        const children = childElements(node);
        let inputIndex = -1;
        let addonIndex = -1;
        let addonNode = null;

        children.forEach((child, index) => {
          const childName = jsxName(child);
          if (!childName) return;
          if (RAW_IN_INPUT_GROUP.has(childName)) {
            context.report({
              node: child.openingElement,
              messageId: 'rawInputInGroup',
              data: { name: childName },
            });
          }
          if (
            (childName === 'InputGroupInput' ||
              childName === 'InputGroupTextarea') &&
            inputIndex < 0
          ) {
            inputIndex = index;
          }
          if (childName === 'InputGroupAddon' && addonIndex < 0) {
            addonIndex = index;
            addonNode = child;
          }
        });

        if (
          addonIndex >= 0 &&
          inputIndex >= 0 &&
          addonIndex < inputIndex &&
          attributeValue(addonNode.openingElement, 'align') !== 'inline-start'
        ) {
          context.report({
            node: addonNode.openingElement,
            messageId: 'addonOrder',
          });
        }
      },
    };
  },
};

export default {
  rules: {
    'compound-composition': rule,
  },
};
