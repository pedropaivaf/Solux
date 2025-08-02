import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SoluxPage from './SoluxPage';
import RegistrosSalvos from './components/RegistrosSalvos';

function App() {
  return (
    <Router>
      <div className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="font-bold text-xl">SOLUX</h1>
        <nav className="flex gap-4">
          <Link to="/" className="hover:underline">Início</Link>
          <Link to="/registros" className="hover:underline">Registros</Link>
        </nav>
      </div>

      <main className="p-6 min-h-screen bg-gray-100 text-gray-900">
        <Routes>
          <Route path="/" element={<SoluxPage />} />
          <Route path="/registros" element={<RegistrosSalvos />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
