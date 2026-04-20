export interface AuthPayload {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
