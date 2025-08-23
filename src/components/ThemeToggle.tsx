import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // inicial: localStorage -> sistema
    const saved = localStorage.getItem('theme') as Theme | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: Theme = saved ?? (systemDark ? 'dark' : 'light');
    applyTheme(initial);
  }, []);

  function applyTheme(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    if (next === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', next);
  }

  return (
    <button
      onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm
                 bg-white/70 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700"
      aria-label="Alternar tema"
      title="Alternar tema"
    >
      {theme === 'dark' ? (
        <>
          <SunIcon className="size-4" /> Claro
        </>
      ) : (
        <>
          <MoonIcon className="size-4" /> Escuro
        </>
      )}
    </button>
  );
}

function SunIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={props.className}>
      <circle cx="12" cy="12" r="4" strokeWidth="2"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeWidth="2"/>
    </svg>
  );
}
function MoonIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79z"/>
    </svg>
  );
}
