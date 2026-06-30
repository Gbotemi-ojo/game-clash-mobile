import React from 'react';
import { render, fireEvent, waitFor, cleanup, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('expo-router', () => {
  const useRouter = jest.fn();
  useRouter.mockReturnValue({ push: jest.fn() });
  return { useRouter };
});

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

const selectValidTimeSlot = async (screen: any) => {
  await act(() => {
    fireEvent.press(screen.getByTestId('time-start-1'));
  });
  await waitFor(() => {
    expect(screen.getByTestId('time-option-08:00')).toBeTruthy();
  });
  await act(() => {
    fireEvent.press(screen.getByTestId('time-option-08:00'));
  });

  await act(() => {
    fireEvent.press(screen.getByTestId('time-end-1'));
  });
  await waitFor(() => {
    expect(screen.getByTestId('time-option-09:00')).toBeTruthy();
  });
  await act(() => {
    fireEvent.press(screen.getByTestId('time-option-09:00'));
  });
};

describe('RegistrationCard', () => {
  const defaultProps = {
    activeLeague: null,
    onJoinSuccess: jest.fn(),
    onRequireScroll: jest.fn(),
  };

  afterEach(cleanup);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onRequireScroll when joining with empty time slots', async () => {
    const screen = await render(<RegistrationCard {...defaultProps} />);

    const timeSection = screen.getByTestId('available-hours-section');
    await act(() => {
      fireEvent(timeSection, 'layout', {
        nativeEvent: { layout: { y: 400, width: 350, height: 200, x: 0 } },
      });
    });

    const joinButton = screen.getByTestId('join-league-button');
    await act(() => {
      fireEvent.press(joinButton);
    });

    await waitFor(() => {
      expect(defaultProps.onRequireScroll).toHaveBeenCalledTimes(1);
    }, { timeout: 10000 });

    expect(defaultProps.onRequireScroll).toHaveBeenCalledWith(600);
  });

  it('shows alert when joining with empty time slots', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = await render(<RegistrationCard {...defaultProps} />);

    const joinButton = screen.getByTestId('join-league-button');
    await act(() => {
      fireEvent.press(joinButton);
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Action Required',
        'Please select your available playing hours before joining.',
      );
    });

    alertSpy.mockRestore();
  });

  it('does not call onRequireScroll when activeLeague is set', async () => {
    const screen = await render(
      <RegistrationCard {...defaultProps} activeLeague={{ league: { name: 'Test League' } }} />,
    );

    expect(screen.queryByTestId('join-league-button')).toBeNull();
    expect(defaultProps.onRequireScroll).not.toHaveBeenCalled();
  });

  it('does not call onRequireScroll when onRequireScroll is not provided', async () => {
    const screen = await render(<RegistrationCard activeLeague={null} onJoinSuccess={jest.fn()} />);

    const joinButton = screen.getByTestId('join-league-button');
    await act(() => {
      fireEvent.press(joinButton);
    });

    expect(defaultProps.onRequireScroll).not.toHaveBeenCalled();
  });

  describe('DLS Game ID error handling', () => {
    it('shows Go to Profile button when API returns DLS-related error', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const screen = await render(<RegistrationCard {...defaultProps} />);

      await selectValidTimeSlot(screen);

      const mockFetch = require('../../../lib/auth-client').authClient.$fetch;
      mockFetch.mockResolvedValueOnce({
        error: { error: 'Please link your DLS Game ID first' },
      });

      await act(() => {
        fireEvent.press(screen.getByTestId('join-league-button'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Registration Denied',
          'Please link your DLS Game ID first',
          expect.arrayContaining([
            expect.objectContaining({ text: 'OK' }),
            expect.objectContaining({ text: 'Go to Profile' }),
          ]),
        );
      });

      alertSpy.mockRestore();
    });

    it('navigates to profile tab when Go to Profile is pressed', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const screen = await render(<RegistrationCard {...defaultProps} />);

      await selectValidTimeSlot(screen);

      const mockFetch = require('../../../lib/auth-client').authClient.$fetch;
      mockFetch.mockResolvedValueOnce({
        error: { error: 'DLS player ID is required for matchmaking' },
      });

      await act(() => {
        fireEvent.press(screen.getByTestId('join-league-button'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      const alertCall = alertSpy.mock.calls.find(
        (call) => call[0] === 'Registration Denied',
      );
      expect(alertCall).toBeDefined();

      const buttons = alertCall![2] as Array<{ text: string; onPress?: () => void }>;
      const goToProfileButton = buttons.find((b) => b.text === 'Go to Profile');
      expect(goToProfileButton).toBeDefined();

      await act(() => {
        goToProfileButton!.onPress!();
      });

      const { useRouter } = require('expo-router');
      expect(useRouter().push).toHaveBeenCalledWith('/(tabs)/profile');

      alertSpy.mockRestore();
    });

    it('shows plain alert for non-DLS errors', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const screen = await render(<RegistrationCard {...defaultProps} />);

      await selectValidTimeSlot(screen);

      const mockFetch = require('../../../lib/auth-client').authClient.$fetch;
      mockFetch.mockResolvedValueOnce({
        error: { error: 'League is full' },
      });

      await act(() => {
        fireEvent.press(screen.getByTestId('join-league-button'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Registration Denied',
          'League is full',
        );
      });

      alertSpy.mockRestore();
    });
  });
});
