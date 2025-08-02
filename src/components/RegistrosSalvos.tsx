import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Registro {
  id: number;
  entrada: string;
  resposta: string;
  data: string;
}

export default function RegistrosSalvos() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/registros')
      .then((res) => setRegistros(res.data))
      .catch(() => setErro('Erro ao buscar registros.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4">
      <button
        onClick={() => navigate('/')}
        className="mb-6 bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition"
      >
        ← Voltar
      </button>

      <h1 className="text-3xl font-bold mb-6">📚 Registros Salvos</h1>

      {loading && <p className="text-gray-500">Carregando registros...</p>}
      {erro && <p className="text-red-600">{erro}</p>}

      {!loading && !erro && registros.length === 0 && (
        <p className="text-gray-600">Nenhum registro encontrado.</p>
      )}

      <ul className="space-y-6">
        {registros.map((reg) => (
          <li key={reg.id} className="bg-white p-6 rounded-xl shadow border border-gray-200">
            <p className="text-sm text-gray-400 mb-2">
              {new Date(reg.data).toLocaleString('pt-BR')}
            </p>
            <p className="font-medium text-gray-800 mb-2">
              <strong>Entrada:</strong> {reg.entrada}
            </p>
            <p className="text-gray-700 whitespace-pre-line">
              <strong>Resposta:</strong><br />{reg.resposta}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
