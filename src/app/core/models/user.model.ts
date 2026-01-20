export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
  createdAt?: string;
  updatedAt?: string;
}
