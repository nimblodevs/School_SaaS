import type { AuthContext } from "../modules/auth/auth.types.js";

interface TenantContext {
  schoolId: string;
}

interface BranchContext {
  id: string;
  schoolId: string;
}

interface RlsContext {
  schoolId: string;
  role: string;
  branchIds: string[];
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      tenant?: TenantContext;
      branch?: BranchContext;
      rls?: RlsContext;
    }
  }
}

export {};
