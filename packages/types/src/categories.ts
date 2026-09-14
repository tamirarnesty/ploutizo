import { BILL_PAYMENT_CATEGORY_NAME } from './imports';

export type HouseholdDefaultCategory = {
  name: string;
  icon: string;
};

/** Default household categories (spend categories plus Bill Payment). */
export const HOUSEHOLD_DEFAULT_CATEGORIES: readonly HouseholdDefaultCategory[] =
  [
    { name: 'Bills', icon: 'Receipt' },
    { name: 'Entertainment', icon: 'Tv' },
    { name: 'Takeout', icon: 'Pizza' },
    { name: 'Restaurants', icon: 'UtensilsCrossed' },
    { name: 'Drinks & Treats', icon: 'Coffee' },
    { name: 'Groceries', icon: 'ShoppingCart' },
    { name: 'House', icon: 'Home' },
    { name: 'Health & Wellbeing', icon: 'HeartPulse' },
    { name: 'Shopping', icon: 'ShoppingBag' },
    { name: 'Subscriptions', icon: 'Repeat' },
    { name: 'Transport', icon: 'Bus' },
    { name: 'Gas', icon: 'Fuel' },
    { name: 'Travel', icon: 'Plane' },
    { name: 'Gifts', icon: 'Gift' },
    { name: 'Car Maintenance', icon: 'Wrench' },
    { name: 'Other', icon: 'MoreHorizontal' },
    { name: BILL_PAYMENT_CATEGORY_NAME, icon: 'CreditCard' },
  ];

export const HOUSEHOLD_DEFAULT_CATEGORY_ICONS: readonly string[] = [
  ...new Set(HOUSEHOLD_DEFAULT_CATEGORIES.map((category) => category.icon)),
];
