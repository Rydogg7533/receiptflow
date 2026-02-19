import { redirect } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/server';

export async function AdminGuard({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  
  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminUserId = process.env.ADMIN_USER_ID;

  // Check if user is authenticated and is admin
  if (!user || user.id !== adminUserId) {
    redirect('/');
  }

  return <>{children}</>;
}

// For client-side checks (if needed)
export function useAdminCheck() {
  const adminUserId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  
  return {
    isAdmin: (userId: string | undefined) => userId === adminUserId,
  };
}
