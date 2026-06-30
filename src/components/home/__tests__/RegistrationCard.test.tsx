import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 0, longitude: 0 },
  })),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([])),
  Accuracy: { Balanced: 0 },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../../lib/auth-client', () => ({
  authClient: {
    $fetch: jest.fn(),
  },
  BACKEND_URL: 'http://test-url',
}));

import RegistrationCard from '../RegistrationCard';

describe('RegistrationCard', () => {
  const defaultProps = {
    activeLeague: null,
    onJoinSuccess: jest.fn(),
    onRequireScroll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onRequireScroll when joining with empty time slots', async () => {
    const { getByTestId } = await render(<RegistrationCard {...defaultProps} />);

    const timeSection = getByTestId('available-hours-section');
    await fireEvent(timeSection, 'layout', {
      nativeEvent: { layout: { y: 400, width: 350, height: 200, x: 0 } },
    });

    const joinButton = getByTestId('join-league-button');
    await fireEvent.press(joinButton);

    await waitFor(() => {
      expect(defaultProps.onRequireScroll).toHaveBeenCalledTimes(1);
    });

    expect(defaultProps.onRequireScroll).toHaveBeenCalledWith(600);
  });

  it('shows alert when joining with empty time slots', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = await render(<RegistrationCard {...defaultProps} />);

    const joinButton = getByTestId('join-league-button');
    await fireEvent.press(joinButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Action Required',
        'Please select your available playing hours before joining.',
      );
    });

    alertSpy.mockRestore();
  });

  it('does not call onRequireScroll when activeLeague is set', async () => {
    const { queryByTestId } = await render(
      <RegistrationCard {...defaultProps} activeLeague={{ league: { name: 'Test League' } }} />,
    );

    expect(queryByTestId('join-league-button')).toBeNull();
    expect(defaultProps.onRequireScroll).not.toHaveBeenCalled();
  });

  it('does not call onRequireScroll when onRequireScroll is not provided', async () => {
    const { getByTestId } = await render(<RegistrationCard activeLeague={null} onJoinSuccess={jest.fn()} />);

    const joinButton = getByTestId('join-league-button');
    await fireEvent.press(joinButton);

    await waitFor(() => {
      expect(defaultProps.onRequireScroll).not.toHaveBeenCalled();
    });
  });
});
