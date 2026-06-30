import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@expo/vector-icons', () => ({
  AntDesign: 'AntDesign',
  FontAwesome5: 'FontAwesome5',
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve()),
    signIn: jest.fn(() => Promise.resolve({ type: 'cancelled' })),
  },
}));

jest.mock('../../../src/lib/auth-client', () => ({
  authClient: {
    signIn: {
      social: jest.fn(),
    },
  },
}));

jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({ refetch: jest.fn() }),
}));

import SignInScreen from '../sign-in';

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sign-in buttons', async () => {
    await render(<SignInScreen />);
    expect(screen.getByTestId('google-button')).toBeTruthy();
    expect(screen.getByTestId('apple-button')).toBeTruthy();
  });

  it('shows loading overlay and disables button while signing in', async () => {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    let resolveSignIn: (value: unknown) => void;
    GoogleSignin.signIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    await render(<SignInScreen />);

    fireEvent.press(screen.getByTestId('google-button'));

    const loadingText = await screen.findByText('Signing in...', {}, { timeout: 3000 });
    expect(loadingText).toBeTruthy();

    const button = screen.getByTestId('google-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);

    resolveSignIn!({ type: 'cancelled' });
    await waitFor(() => {
      expect(screen.queryByText('Signing in...')).toBeNull();
    });
  });

  it('Google button is enabled by default', async () => {
    await render(<SignInScreen />);
    const button = screen.getByTestId('google-button');
    expect(button.props.accessibilityState?.disabled).toBe(false);
  });
});
