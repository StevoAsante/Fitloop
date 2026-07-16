// ------------------------------------------------------
// index.tsx — Entry Redirect
// ------------------------------------------------------
// This route's only job is redirecting. Doing the check
// here rather than just making /login the actual entry
// point means that once sessions persist across restarts
// (see the note in auth-context.tsx), a signed-in person
// lands straight on /home instead of seeing a login screen
// flash by first
// ------------------------------------------------------

import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? '/home' : '/login'} />;
}
