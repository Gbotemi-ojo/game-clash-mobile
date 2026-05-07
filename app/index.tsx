// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // Right now, this just forces the app to open the sign-in screen.
  // Later, we will add logic here: If logged in -> go to tabs. If not -> go to auth.
  return <Redirect href="/(auth)/sign-in" />;
}
