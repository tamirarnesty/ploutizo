/** Clerk person projection shared by roster embeds (owners, settlement rows, etc.). */
export interface MemberIdentity {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string | null;
}
