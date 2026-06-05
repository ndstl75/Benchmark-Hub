/** True when built with `VITE_DEPLOY_MODE=static` (GitHub Pages read-only). */
export const isStaticDeploy = import.meta.env.VITE_DEPLOY_MODE === "static";
