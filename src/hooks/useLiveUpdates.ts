import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

interface UseLiveUpdatesProps {
  onRefreshData: (silent?: boolean) => void;
}

export function useLiveUpdates({ onRefreshData }: UseLiveUpdatesProps) {
  const { socket } = useSocket();
  const fetchRef = useRef(onRefreshData);

  // Keep the ref fresh to avoid stale closures
  useEffect(() => {
    fetchRef.current = onRefreshData;
  }, [onRefreshData]);

  useEffect(() => {
    if (!socket) return;

    // Listen to the global app_update event to silently trigger the data fetch
    // This handles ready states, proposed times, and scraped match resolutions.
    const handleAppUpdate = () => {
      fetchRef.current(true); 
    };

    socket.on('app_update', handleAppUpdate);

    return () => {
      socket.off('app_update', handleAppUpdate);
    };
  }, [socket]);
}
