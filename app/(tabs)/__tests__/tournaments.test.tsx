import React from 'react';
import { render, act } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

let focusCallback: (() => void) | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: any) => {
    focusCallback = cb;
  },
}));

jest.mock('../../../src/context/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

jest.mock('../../../src/lib/auth-client', () => ({
  authClient: {
    $fetch: jest.fn(),
  },
  BACKEND_URL: 'http://test-url',
}));

import TournamentsScreen from '../tournaments';

const SERVER_TIME = 1_000_000_000;
const LOCAL_TIME_AHEAD = SERVER_TIME + 600_000;
const FIXTURE_BASE = {
  playerAId: 'user1',
  playerBId: 'user2',
  playerAScore: 0,
  playerBScore: 0,
  playerATeam: 'TeamA',
  playerBTeam: 'TeamB',
  playerAReady: false,
  playerBReady: false,
};

describe('TournamentsScreen - Server Time Offset', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    const mod = require('../../../src/lib/auth-client');
    mockFetch = mod.authClient.$fetch;
    mockFetch.mockReset();
    focusCallback = null;
  });

  afterEach(() => {
    focusCallback = null;
    jest.restoreAllMocks();
  });

  function setupMockResponses(fixtures: any[]) {
    mockFetch
      .mockResolvedValueOnce({ data: { id: 'user1', serverTime: SERVER_TIME }, error: null })
      .mockResolvedValueOnce({ data: { id: 'league-1', status: 'active', name: 'Test League' }, error: null })
      .mockResolvedValueOnce({ data: [{ userId: 'user1', gamerTag: 'Player1', points: 10 }], error: null })
      .mockResolvedValueOnce({ data: fixtures, error: null });
    mockFetch.mockResolvedValue({ data: null, error: null });
  }

  it('computes serverTimeOffset to correct pre-fetch local clock manipulation for match window', async () => {
    const matchScheduledAt = new Date((SERVER_TIME + 300_000) * 1).toISOString();
    const fixtures = [{
      id: 1, status: 'pending', scheduledAt: matchScheduledAt,
      ...FIXTURE_BASE,
    }];
    setupMockResponses(fixtures);

    const view = await render(<TournamentsScreen />);

    jest.spyOn(Date, 'now').mockReturnValue(LOCAL_TIME_AHEAD);

    await act(async () => {
      focusCallback?.();
      await Promise.resolve();
    });

    expect(view.getByText('Match button opens exactly at scheduled time.')).toBeTruthy();
  }, 15000);

  it('protects 15-minute gameplay rule from pre-fetch clock manipulation', async () => {
    const matchStartedAt = new Date((SERVER_TIME - 300_000) * 1).toISOString();
    const matchScheduledAt = new Date((SERVER_TIME - 600_000) * 1).toISOString();
    const fixtures = [{
      id: 1, status: 'in_progress', scheduledAt: matchScheduledAt, startedAt: matchStartedAt,
      dlsInviteCode: 'XYZ789',
      playerAReady: true, playerBReady: true,
      ...FIXTURE_BASE,
    }];
    setupMockResponses(fixtures);

    const view = await render(<TournamentsScreen />);

    jest.spyOn(Date, 'now').mockReturnValue(LOCAL_TIME_AHEAD);

    await act(async () => {
      focusCallback?.();
      await Promise.resolve();
    });

    expect(view.getByText('Results verifiable after 15 mins of gameplay.')).toBeTruthy();
  });

  it('changing local clock after fetch does not affect minsSinceStart logic', async () => {
    const matchStartedAt = new Date((SERVER_TIME - 300_000) * 1).toISOString();
    const matchScheduledAt = new Date((SERVER_TIME - 600_000) * 1).toISOString();
    const fixtures = [{
      id: 1, status: 'in_progress', scheduledAt: matchScheduledAt, startedAt: matchStartedAt,
      dlsInviteCode: 'XYZ789',
      playerAReady: true, playerBReady: true,
      ...FIXTURE_BASE,
    }];
    setupMockResponses(fixtures);

    const view = await render(<TournamentsScreen />);

    const dateNowSpy = jest.spyOn(Date, 'now');
    dateNowSpy.mockReturnValue(LOCAL_TIME_AHEAD);

    await act(async () => {
      focusCallback?.();
      await Promise.resolve();
    });

    expect(view.getByText('Results verifiable after 15 mins of gameplay.')).toBeTruthy();

    dateNowSpy.mockReturnValue(LOCAL_TIME_AHEAD + 120_000);

    expect(view.getByText('Results verifiable after 15 mins of gameplay.')).toBeTruthy();
  });
});
