'use client';

import { createContext, useContext } from 'react';
import { cva } from 'class-variance-authority';
import { DEFAULT_I18N } from './filters-constants';
import type React from 'react';

import type { FilterI18nConfig } from './filters-types';

export interface FilterContextValue {
  variant: 'solid' | 'default';
  size: 'sm' | 'default' | 'lg';
  radius: 'default' | 'full';
  i18n: FilterI18nConfig;
  className?: string;
  showSearchInput?: boolean;
  trigger?: React.ReactNode;
  allowMultiple?: boolean;
}

export const FilterContext = createContext<FilterContextValue>({
  variant: 'default',
  size: 'default',
  radius: 'default',
  i18n: DEFAULT_I18N,
  className: undefined,
  showSearchInput: true,
  trigger: undefined,
  allowMultiple: true,
});

export const useFilterContext = () => useContext(FilterContext);

export const filtersContainerVariants = cva('flex flex-wrap items-center', {
  variants: {
    variant: {
      solid: 'gap-2',
      default: '',
    },
    size: {
      sm: 'gap-1.5',
      default: 'gap-2.5',
      lg: 'gap-3.5',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});
