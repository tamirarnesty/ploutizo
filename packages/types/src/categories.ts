import { BILL_PAYMENT_CATEGORY_NAME } from './imports';
import type { ColourToken } from './colours';

export type HouseholdDefaultCategory = {
  name: string;
  icon: string;
  colour: ColourToken;
};

/** Default household categories (spend categories plus Bill Payment). */
export const HOUSEHOLD_DEFAULT_CATEGORIES: readonly HouseholdDefaultCategory[] =
  [
    { name: 'Bills', icon: 'Receipt', colour: 'orange-500' },
    { name: 'Entertainment', icon: 'Tv', colour: 'purple-500' },
    { name: 'Takeout', icon: 'Pizza', colour: 'red-500' },
    { name: 'Restaurants', icon: 'UtensilsCrossed', colour: 'rose-500' },
    { name: 'Drinks & Treats', icon: 'Coffee', colour: 'amber-500' },
    { name: 'Groceries', icon: 'ShoppingCart', colour: 'green-500' },
    { name: 'House', icon: 'Home', colour: 'teal-500' },
    { name: 'Health & Wellbeing', icon: 'HeartPulse', colour: 'emerald-500' },
    { name: 'Shopping', icon: 'ShoppingBag', colour: 'pink-500' },
    { name: 'Subscriptions', icon: 'Repeat', colour: 'violet-500' },
    { name: 'Transport', icon: 'Bus', colour: 'blue-500' },
    { name: 'Gas', icon: 'Fuel', colour: 'yellow-500' },
    { name: 'Travel', icon: 'Plane', colour: 'sky-500' },
    { name: 'Gifts', icon: 'Gift', colour: 'fuchsia-500' },
    { name: 'Car Maintenance', icon: 'Wrench', colour: 'indigo-500' },
    { name: 'Other', icon: 'MoreHorizontal', colour: 'lime-500' },
    {
      name: BILL_PAYMENT_CATEGORY_NAME,
      icon: 'CreditCard',
      colour: 'cyan-500',
    },
  ];

export const HOUSEHOLD_DEFAULT_CATEGORY_ICONS: readonly string[] = [
  ...new Set(HOUSEHOLD_DEFAULT_CATEGORIES.map((category) => category.icon)),
];
