export interface SessionUser {
  id: number | string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: { id: number | string; name?: string } | null;
}
