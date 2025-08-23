import { useState } from 'react';
import { apiDestrinchar, apiPlanoFinal } from '../api/solux';

/* ---------- Helpers de visual ---------- */

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ' +
        className
      }
    >
      {children}
    </span>
  );
}

function colorizeRisks(s: string) {
  // pinta baixo / médio / alto (case-insensitive + acentos)
  const regex = /\b(baixa|baixo|m[eé]dia|medio|alta|alto)\b/gi;
  const parts: React.ReactNode[] = [];
  let last = 0;

  s.replace(regex, (match, _g1, offset) => {
    parts.push(s.slice(last, offset));

    const key = match
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    let cls =
      'bg-blue-500/15 text-blue-400 ring-blue-400/30'; // default: baixo
    if (key === 'media' || key === 'medio')
      cls = 'bg-amber-500/15 text-amber-400 ring-amber-400/30';
    if (key === 'alta' || key === 'alto')
      cls = 'bg-rose-500/15 text-rose-400 ring-rose-400/30';

    parts.push(<Badge key={offset} className={cls}>{match}</Badge>);
    last = offset + match.length;
    return match;
  });

  parts.push(s.slice(last));
  return parts;
}

function SmartText({ text }: { text: string }) {
  // Renderizador leve: headings "##", tópicos "**X:**", listas "* "
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];

  const flushList = () => {
    if (list.length) {
      out.push(
        <ul key={'ul-' + out.length} className="list-disc ml-6 space-y-1">
          {list}
        </ul>
      );
      list = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();

    if (!line) {
      flushList();
      out.push(<div key={'sp-' + i} className="h-2" />);
      return;
    }

    // ## Heading
    if (line.startsWith('##')) {
      flushList();
      out.push(
        <h3
          key={'h-' + i}
          className="mt-4 mb-2 text-lg font-semibold text-brand-400 dark:text-brand-300 border-l-4 border-brand-500 pl-3"
        >
          {line.replace(/^##\s*/, '')}
        </h3>
      );
      return;
    }

    // **Tópico:** conteúdo    (remove ** e destaca o tópico)
    const topic = line.match(/^\*\*\s*\d*\.?\s*([^*]+?)\s*\*\*:?/);
    if (topic) {
      flushList();
      out.push(
        <h4
          key={'t-' + i}
          className="mt-3 mb-1 font-semibold text-emerald-400 dark:text-emerald-300"
        >
          {topic[1].trim()}
        </h4>
      );
      const rest = line.replace(/^\*\*.*\*\*:?/, '').trim();
      if (rest) {
        out.push(
          <p key={'tp-' + i} className="text-slate-800 dark:text-slate-200">
            {colorizeRisks(rest)}
          </p>
        );
      }
      return;
    }

    // Lista
    if (line.startsWith('* ') || line.startsWith('- ')) {
      const item = line.replace(/^[*-]\s*/, '');
      list.push(
        <li key={'li-' + i} className="text-slate-800 dark:text-slate-200">
          {colorizeRisks(item)}
        </li>
      );
      return;
    }

    // Parágrafo normal
    flushList();
    out.push(
      <p key={'p-' + i} className="text-slate-800 dark:text-slate-200">
        {colorizeRisks(line)}
      </p>
    );
  });

  flushList();
  return <div className="space-y-1">{out}</div>;
}

/* ---------- Lógica do fluxo ---------- */

function extrairPergunta(texto: string): string {
  const m = texto.match(/pergunta complementar[^:\n]*:\s*([\s\S]*?)$/i);
  if (m && m[1]) return m[1].trim();
  const lines = texto.split('\n').map(s => s.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].endsWith('?')) return lines[i];
  }
  return '';
}

export default function Destrinchar() {
  const [input, setInput] = useState('');
  const [resposta, setResposta] = useState('');
  const [pergunta, setPergunta] = useState('');
  const [respCompl, setRespCompl] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [gerandoPlano, setGerandoPlano] = useState(false);

  async function handleDestrinchar() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const { resposta } = await apiDestrinchar(input);
      setResposta(resposta);
      setPergunta(extrairPergunta(resposta));
      setRespCompl('');
      setRestricoes('');
    } catch (e: any) {
      alert(e.message || 'Erro ao destrinchar');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanoFinal() {
    if (!respCompl.trim()) {
      alert('Digite a resposta complementar.');
      return;
    }
    setGerandoPlano(true);
    try {
      const out = await apiPlanoFinal(input, respCompl, restricoes);
      if ('planoFinal' in out) setResposta(out.planoFinal);
      // se for PDF, já baixou no helper
    } catch (e: any) {
      alert(e.message || 'Erro ao gerar plano final');
    } finally {
      setGerandoPlano(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Solux — Destrinchar</h1>
        <p className="text-slate-600 dark:text-slate-300 mt-1">
          Descreva detalhadamente um problema e receba um plano prático com riscos e próximos passos.
        </p>
      </div>

      <div className="max-w-3xl space-y-3">
        <textarea
          className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700
                     focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600"
          rows={5}
          placeholder="Descreva seu problema aqui..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          onClick={handleDestrinchar}
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700
                     text-white disabled:opacity-50"
        >
          {loading ? 'Processando...' : 'Destrinchar'}
        </button>
      </div>

      {resposta && (
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
          <article className="md:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-700
                              bg-white/70 dark:bg-slate-800/60 backdrop-blur">
            <h2 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">Análise</h2>
            <SmartText text={resposta} />
          </article>

          <article className="md:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-700
                              bg-white/70 dark:bg-slate-800/60 backdrop-blur space-y-3">
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Responda e gere o plano final</h3>

            {pergunta && (
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-medium">Pergunta do Solux:</span> {pergunta}
              </p>
            )}

            <input
              className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
              placeholder="Sua resposta complementar (ex.: Sem empréstimos, prazo X, etc.)"
              value={respCompl}
              onChange={e => setRespCompl(e.target.value)}
            />
            <input
              className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
              placeholder="Restrições (opcional — ex.: Sem vender bens)"
              value={restricoes}
              onChange={e => setRestricoes(e.target.value)}
            />

            <button
              onClick={handlePlanoFinal}
              disabled={gerandoPlano || !respCompl.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700
                         text-white disabled:opacity-50"
            >
              {gerandoPlano ? 'Gerando...' : 'Gerar plano final'}
            </button>
          </article>
        </div>
      )}
    </section>
  );
}
