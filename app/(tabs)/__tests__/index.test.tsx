import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 0, longitude: 0 },
  })),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([])),
  Accuracy: { Balanced: 0 },
}));

jest.mock('../../../src/lib/auth-client', () => ({
  authClient: {
    $fetch: jest.fn(),
  },
  BACKEND_URL: 'http://test-url',
}));

let capturedOnRequireScroll: ((y: number) => void) | null = null;

jest.mock('../../../src/components/home/RegistrationCard', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  const MockRegistrationCard = (props: any) => {
    capturedOnRequireScroll = props.onRequireScroll;
    return React.createElement(TouchableOpacity, { testID: 'mock-registration-card' },
      React.createElement(Text, null, 'Mock RegistrationCard')
    );
  };
  return { __esModule: true, default: MockRegistrationCard };
});

jest.mock('../../../src/components/home/ArenaHeader', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return { __esModule: true, default: () => React.createElement(View, { testID: 'mock-arena-header' }) };
});

jest.mock('../../../src/components/home/RewardCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: () => React.createElement(View, { testID: 'mock-reward-card' }) };
});

jest.mock('../../../src/components/home/HamburgerMenuModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: () => React.createElement(View, { testID: 'mock-hamburger-menu' }) };
});

import DlsHubHomeScreen from '../index';

describe('HomeScreen', () => {
  beforeEach(() => {
    capturedOnRequireScroll = null;
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    await render(<DlsHubHomeScreen />);
  });

  it('passes onRequireScroll to RegistrationCard', async () => {
    await render(<DlsHubHomeScreen />);
    expect(capturedOnRequireScroll).toBeDefined();
    expect(typeof capturedOnRequireScroll).toBe('function');
  });
});
