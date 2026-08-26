import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // LINK CONTROL uses effects to hydrate remote Supabase-backed state when
      // dialogs/scopes open. These are deliberate synchronization points, not
      // render-derived state. Keep exhaustive-deps active, but do not reject
      // this valid application pattern globally.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**"]),
]);
