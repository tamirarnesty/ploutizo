import reactDoctor from 'eslint-plugin-react-doctor';

/** Framework-agnostic React Doctor rules (TanStack Start SPA — not Next/RN/Preact). */
export const reactDoctorRecommended = reactDoctor.configs.recommended;

/** TanStack Start + TanStack Query presets for `apps/web`. */
export const reactDoctorTanstackStart = reactDoctor.configs['tanstack-start'];
export const reactDoctorTanstackQuery = reactDoctor.configs['tanstack-query'];
