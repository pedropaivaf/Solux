import React, { useEffect, useState } from 'react';
import logo from './assets/logo.png';
import {
  apiDestrinchar,
  apiPerguntaComplementar,
  apiPlanoFinal,
  PlanoFinalOut,
} from './api/solux';

const textoDigitado = 'Solux vai organizar e apresentar soluções lógicas';

export default function SoluxPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Saídas do backend
  const [destrincharTexto, setDestrincharTexto] = useState(''); // vem de /api/destrinchar (string)
  const [novaPergunta, setNovaPergunta] = useState('');         // vem de /api/resposta-complementar
  const [respostaComplementar, setRespostaComplementar] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [planoFinal, setPlanoFinal] = useState('');             // texto, caso o server não gere PDF

  // Tipagem/efeito do subtítulo
  const [typedText, setTypedText] = useState('');
  useEffect(() => {
    let i = 0;
    setTypedText('');
    const interval = setInterval(() => {
      if (i < textoDigitado.length) {
        setTypedText(prev => prev + textoDigitado.charAt(i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 45);
    return () => clearInterval(interval);
  }, []);

  async function handleDestrinchar() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      // 1) destrinchar
      const out = await apiDestrinchar(input); // { resposta: string }
      setDestrincharTexto(out.resposta);

      // 2) primeira pergunta complementar
      const p = await apiPerguntaComplementar(input, '');
      setNovaPergunta(p.novaPergunta || '');
    } catch (err: any) {
      alert(err?.message || 'Erro ao destrinchar');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanoFinal() {
    if (!input.trim() || !respostaComplementar.trim()) return;
    setLoading(true);
    try {
      const out: PlanoFinalOut = await apiPlanoFinal(input, respostaComplementar, restricoes);
      if ('planoFinal' in out && out.planoFinal) {
        setPlanoFinal(out.planoFinal);
      } else {
        // Caso tenha baixado PDF, só avisamos
        setPlanoFinal('PDF gerado e baixado com sucesso.');
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar plano final');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-black flex flex-col items-center px-4 py-12">
      <div className="flex items-center gap-3 mb-2">
        <img src={logo} alt="Logo Solux" className="w-10 h-10" />
        <h1 className="text-4xl font-bold">SOLUX</h1>
      </div>

      <p className="text-lg text-center max-w-2xl">Descreva o problema que você está enfrentando detalhada</p>
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
        onClick={handleDestrinchar}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition mb-10"
      >
        {loading ? 'Analisando...' : 'Destrinchar'}
      </button>

      {/* Resultado do destrinchar (texto livre) */}
      {destrincharTexto && (
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <div className="bg-white w-full rounded-2xl shadow p-6 animate-fade-in">
            <h2 className="font-semibold text-xl mb-2">Análise</h2>
            <pre className="whitespace-pre-wrap text-gray-800">{destrincharTexto}</pre>
          </div>

          {/* Pergunta complementar + restrições */}
          {novaPergunta && (
            <div className="bg-white w-full rounded-2xl shadow p-6 animate-fade-in">
              <h2 className="font-semibold text-xl mb-2">Pergunta Complementar</h2>
              <p className="mb-3 text-gray-800">{novaPergunta}</p>

              <input
                type="text"
                value={respostaComplementar}
                onChange={(e) => setRespostaComplementar(e.target.value)}
                placeholder="Digite sua resposta aqui..."
                className="w-full p-3 border border-gray-300 rounded-md mb-3"
              />

              <input
                type="text"
                value={restricoes}
                onChange={(e) => setRestricoes(e.target.value)}
                placeholder="Deseja desconsiderar algo? Ex.: empréstimos, vender imóveis, etc."
                className="w-full p-3 border border-gray-300 rounded-md mb-4"
              />

              <button
                onClick={handlePlanoFinal}
                disabled={loading || !respostaComplementar.trim()}
                className="bg-green-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-green-700 transition"
              >
                {loading ? 'Gerando...' : 'Gerar Soluções Lógicas'}
              </button>
            </div>
          )}

          {/* Plano final (caso não gere PDF) */}
          {planoFinal && (
            <div className="bg-white w-full rounded-2xl shadow p-6 animate-fade-in">
              <h2 className="font-semibold text-xl mb-2">Soluções Lógicas e Plano Final</h2>
              <pre className="whitespace-pre-wrap text-gray-800">{planoFinal}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
