export interface SupabaseUser {
  id: string;
  email?: string | null;
  provider: string;
  subscribed: boolean;
  created_at?: string;
  updated_at?: string;
} 