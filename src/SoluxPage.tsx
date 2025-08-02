import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logo from './assets/logo.png';

const textoDigitado = 'Solux vai organizar e apresentar soluções lógicas';

export default function SoluxPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resposta, setResposta] = useState<any>(null);
  const [perguntaExtra, setPerguntaExtra] = useState('');
  const [mostrarPergunta, setMostrarPergunta] = useState(false);
  const [restricoes, setRestricoes] = useState('');
  const [mostrarRestricoes, setMostrarRestricoes] = useState(false);
  const [planoFinal, setPlanoFinal] = useState('');
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    let i = 0;
    setTypedText('');
    const texto = textoDigitado;
    const interval = setInterval(() => {
      if (i < texto.length) {
        setTypedText((prev) => prev + texto.charAt(i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 45);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/destrinchar', { input });
      setResposta(data);
      setMostrarPergunta(true);
    } catch (err) {
      alert('Erro ao tentar destrinchar.');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPlanoFinal = async () => {
    if (!input || !perguntaExtra || !restricoes) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/definir-limites', {
        input,
        respostaComplementar: perguntaExtra,
        restricoes,
      });
      setPlanoFinal(data.planoFinal);
    } catch (err) {
      alert('Erro ao gerar plano final.');
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (titulo: string, conteudo: any, isList = false) => (
    <div className="bg-white w-full rounded-2xl shadow p-6 animate-fade-in">
      <h2 className="font-semibold text-xl mb-2">{titulo}</h2>
      {isList ? (
        <ul className="list-disc list-inside space-y-1">
          {conteudo.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-800 leading-relaxed whitespace-pre-line">{conteudo}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-black flex flex-col items-center px-4 py-12">
      <div className="flex items-center gap-3 mb-2">
        <img src={logo} alt="Logo Solux" className="w-10 h-10" />
        <h1 className="text-4xl font-bold">SOLUX</h1>
      </div>

      <p className="text-lg text-center max-w-2xl">Descreva o problema que você está enfrentando</p>
      <p className="text-sm text-center text-gray-600 h-6 mb-6">
        {typedText}<span className="animate-pulse">|</span>
      </p>

      <textarea
        rows={5}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ex: Quero desistir do meu projeto..."
        className="w-full max-w-2xl p-4 rounded-md border border-gray-300 resize-none mb-4 shadow-sm"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition mb-10"
      >
        {loading ? 'Analisando...' : 'Destrinchar'}
      </button>

      {resposta && (
        <div className="w-full max-w-2xl flex flex-col gap-6">
          {renderCard('Categorias', resposta.categorias)}
          {renderCard('Ignorar', resposta.ignorar)}
          {renderCard('Resolver Agora', resposta.resolverAgora, true)}
          {renderCard('Esperar', resposta.esperar)}
          {renderCard('Analisar Mais', resposta.analisarMais)}
          {renderCard('Mapa de Riscos', resposta.mapaDeRiscos, true)}

          {mostrarPergunta && (
            <div className="bg-white w-full rounded-2xl shadow p-6 animate-fade-in">
              <h2 className="font-semibold text-xl mb-2">Pergunta Complementar</h2>
              <p className="mb-3 text-gray-800">{resposta.perguntaComplementar}</p>
              <input
                type="text"
                value={perguntaExtra}
                onChange={(e) => setPerguntaExtra(e.target.value)}
                placeholder="Digite sua resposta aqui..."
                className="w-full p-3 border border-gray-300 rounded-md mb-4"
              />
              <button
                className="text-blue-600 underline text-sm"
                onClick={() => setMostrarRestricoes(true)}
              >
                Deseja desconsiderar algo? (Clique aqui)
              </button>
            </div>
          )}

          {mostrarRestricoes && (
            <div className="bg-white w-full rounded-2xl shadow p-6 animate-fade-in">
              <h2 className="font-semibold text-xl mb-2">O que deseja desconsiderar?</h2>
              <input
                type="text"
                value={restricoes}
                onChange={(e) => setRestricoes(e.target.value)}
                placeholder="Ex: empréstimos, vender imóveis, etc."
                className="w-full p-3 border border-gray-300 rounded-md mb-4"
              />
              <button
                onClick={handleGerarPlanoFinal}
                className="bg-green-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-green-700 transition"
              >
                Gerar Soluções Lógicas
              </button>
            </div>
          )}

          {planoFinal && renderCard('Soluções Lógicas e Plano Final', planoFinal)}
        </div>
      )}
    </div>
  );
}
