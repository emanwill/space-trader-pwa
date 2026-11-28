// Light or dark. The choice is per device (localStorage), not per game.
// index.html applies it before the first paint; this keeps it up to date.

export type ThemeChoice = 'system' | 'dark' | 'light';

const KEY = 'space-trader-theme';
const COLORS = { dark: '#0b0e1a', light: '#f3f4f9' };

function read(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    if (value === 'dark' || value === 'light') return value;
  } catch {
    // Storage blocked: follow the system.
  }
  return 'system';
}

class Theme {
  choice = $state<ThemeChoice>(read());
  private media =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: light)')
      : null;

  constructor() {
    this.media?.addEventListener('change', () => this.apply());
  }

  set(choice: ThemeChoice): void {
    this.choice = choice;
    try {
      if (choice === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      // Applies for this visit only.
    }
    this.apply();
  }

  apply(): void {
    if (typeof document === 'undefined') return;
    const resolved =
      this.choice === 'system' ? (this.media?.matches ? 'light' : 'dark') : this.choice;
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[resolved]);
  }
}

export const theme = new Theme();
