// Reactive media queries.

function query(q: string): { readonly matches: boolean } {
  const state = $state({ matches: false });
  if (typeof window !== 'undefined' && window.matchMedia) {
    const list = window.matchMedia(q);
    state.matches = list.matches;
    list.addEventListener('change', (e) => (state.matches = e.matches));
  }
  return state;
}

/** Wide enough for the map pane beside the other screens. */
export const wide = query('(min-width: 64rem)');
