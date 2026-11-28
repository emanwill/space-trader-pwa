// The service worker: offline play and updates. A new version waits until the
// player chooses to reload (UpdateBanner), and not while a trip is under way.

import { registerSW } from 'virtual:pwa-register';
import { ui } from './web-ui.svelte';

const HOUR = 60 * 60 * 1000;

class Pwa {
  /** A new version is installed and waiting. */
  needRefresh = $state(false);
  private updateSW: ((reload?: boolean) => Promise<void>) | null = null;

  start(): void {
    if (!('serviceWorker' in navigator)) return;
    this.updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => (this.needRefresh = true),
      onOfflineReady: () =>
        ui.toast('Ready to play offline', 'The game now works without a connection.'),
      onRegisteredSW: (_url, registration) => {
        // Look for new versions while the app stays open.
        if (registration) setInterval(() => void registration.update(), HOUR);
      },
    });
  }

  /** Switches to the new version (reloads the page; the autosave resumes the game). */
  async update(): Promise<void> {
    await this.updateSW?.(true);
  }

  dismiss(): void {
    this.needRefresh = false;
  }
}

export const pwa = new Pwa();
