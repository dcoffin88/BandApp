import { useState, useEffect, useCallback } from 'react';
import {
  CURRENT_APP_VERSION,
  fetchVersionInfo,
  type AppVersionInfo,
} from '../utils/versionService.ts';

export function useAppVersion() {
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo>({
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    latestTag: `v${CURRENT_APP_VERSION}`,
    updateAvailable: false,
    releaseName: `RehearsalHQ v${CURRENT_APP_VERSION}`,
    releaseUrl: 'https://github.com/dcoffin88/RehearsalHQ/releases/latest',
    publishedAt: null,
    checkedAt: new Date().toISOString(),
    repoUrl: 'https://github.com/dcoffin88/RehearsalHQ',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const checkUpdates = useCallback(async (force = false) => {
    setIsLoading(true);
    try {
      const info = await fetchVersionInfo(force);
      setVersionInfo(info);
    } catch (e) {
      console.warn('Failed to check latest RehearsalHQ version:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount
    void checkUpdates(false);

    // Periodic check every 30 minutes if tab remains open
    const interval = setInterval(() => {
      void checkUpdates(true);
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkUpdates]);

  return {
    versionInfo,
    isLoading,
    checkUpdates,
    isModalOpen,
    setIsModalOpen,
  };
}
