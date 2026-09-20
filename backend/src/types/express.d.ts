export type UserRole = 'PARTICIPANT' | 'STAFF' | 'SPONSOR' | 'ADMIN';

export interface AuthUser {
  uid: string;
  email?: string;
  role: UserRole;
  emailVerified?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
