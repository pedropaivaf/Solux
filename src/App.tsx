import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Destrinchar from './components/Destrinchar';
import RegistrosSalvos from './components/RegistrosSalvos';
import SoluxPage from './SoluxPage'; // se não precisar, remova essa import/rota
import ThemeToggle from './components/ThemeToggle';

function App() {
  return (
    <Router>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur bg-brand-700/90 dark:bg-slate-900/80 border-b border-black/10 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between text-white">
          <div className="font-bold tracking-wide">SOLUX</div>
          <nav className="flex items-center gap-6">
            <NavLink
              to="/destrinchar"
              className={({isActive}) => `text-sm ${isActive ? 'underline' : 'opacity-90 hover:opacity-100'}`}
            >
              Destrinchar
            </NavLink>
            <NavLink
              to="/registros"
              className={({isActive}) => `text-sm ${isActive ? 'underline' : 'opacity-90 hover:opacity-100'}`}
            >
              Registros
            </NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/destrinchar" replace />} />
            <Route path="/destrinchar" element={<Destrinchar />} />
            <Route path="/registros" element={<RegistrosSalvos />} />
            <Route path="/old" element={<SoluxPage />} />
            <Route path="*" element={<Navigate to="/destrinchar" replace />} />
          </Routes>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
          Solux • modo {document.documentElement.classList.contains('dark') ? 'escuro' : 'claro'}
        </div>
      </footer>
    </Router>
  );
}
export default App;
