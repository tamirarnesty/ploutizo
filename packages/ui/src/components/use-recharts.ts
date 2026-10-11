import { use } from 'react';

const rechartsModulePromise = import('recharts');

export const useRechartsModule = () => use(rechartsModulePromise);
