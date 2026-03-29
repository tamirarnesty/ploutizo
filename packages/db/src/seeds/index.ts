import { seedOrgCategories } from './categories.js'
import { seedOrgMerchantRules } from './merchantRules.js'

// seedOrg: called at org creation to populate default tenant data.
// Both functions are called — do not call them individually unless testing.
export const seedOrg = async (orgId: string): Promise<void> => {
  await seedOrgCategories(orgId)
  await seedOrgMerchantRules(orgId)
}

export { seedOrgCategories, seedOrgMerchantRules }
