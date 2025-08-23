import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { apiLimparRegistros, apiExcluirRegistro } from '../api/solux';

interface Registro {
  id: number;
  entrada: string;
  resposta: string;
  data: string;
}

/* ---------- Helpers de visual (iguais aos do Destrinchar) ---------- */

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
  // pinta baixo / médio / alto (com e sem acento)
  const regex = /\b(baixa|baixo|m[eé]dia|medio|alta|alto)\b/gi;
  const parts: React.ReactNode[] = [];
  let last = 0;

  s.replace(regex, (match, _g1, offset) => {
    parts.push(s.slice(last, offset));

    const key = match
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    let cls = 'bg-blue-500/15 text-blue-400 ring-blue-400/30'; // baixo
    if (key === 'media' || key === 'medio') cls = 'bg-amber-500/15 text-amber-400 ring-amber-400/30';
    if (key === 'alta' || key === 'alto') cls = 'bg-rose-500/15 text-rose-400 ring-rose-400/30';

    parts.push(
      <Badge key={offset} className={cls}>
        {match}
      </Badge>
    );
    last = offset + match.length;
    return match;
  });

  parts.push(s.slice(last));
  return parts;
}

function SmartText({ text }: { text: string }) {
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

    // "## Título"
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

    // "**Tópico:** Conteúdo" (remove ** e destaca tópico)
    const topic = line.match(/^\*\*\s*\d*\.?\s*([^*]+?)\s*\*\*:?/);
    if (topic) {
      flushList();
      out.push(
        <h4 key={'t-' + i} className="mt-3 mb-1 font-semibold text-emerald-500 dark:text-emerald-300">
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

    // "* item" / "- item"
    if (line.startsWith('* ') || line.startsWith('- ')) {
      const item = line.replace(/^[*-]\s*/, '');
      list.push(
        <li key={'li-' + i} className="text-slate-800 dark:text-slate-200">
          {colorizeRisks(item)}
        </li>
      );
      return;
    }

    // parágrafo
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

/* -------------------- Componente -------------------- */

export default function RegistrosSalvos() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregarRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const res =
        await axios.get('/api/registros').catch(async () => {
          const r = await fetch('http://localhost:3001/api/registros');
          if (!r.ok) throw new Error('Falha ao buscar registros');
          return { data: await r.json() };
        });
      setRegistros(res.data as Registro[]);
      setErro('');
    } catch {
      setErro('Erro ao buscar registros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarRegistros();
  }, [carregarRegistros]);

  async function handleLimparHistorico() {
    if (!confirm('Tem certeza que deseja apagar TODOS os registros?')) return;
    try {
      const { deleted } = await apiLimparRegistros();
      alert(`Histórico limpo (${deleted} itens).`);
      await carregarRegistros();
    } catch (e: any) {
      alert(e?.message || 'Falha ao limpar histórico');
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Excluir este registro?')) return;
    try {
      await apiExcluirRegistro(id);
      await carregarRegistros();
    } catch (e: any) {
      alert(e?.message || 'Falha ao excluir');
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Registros Salvos</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-70">{registros.length} itens</span>
          <button
            onClick={handleLimparHistorico}
            className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-sm"
          >
            Limpar histórico
          </button>
          <Link
            to="/destrinchar"
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white text-sm"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      {loading && <p className="text-slate-500 dark:text-slate-400">Carregando registros...</p>}
      {erro && <p className="text-rose-600">{erro}</p>}

      {!loading && !erro && registros.length === 0 && (
        <p className="text-slate-600 dark:text-slate-300">Nenhum registro encontrado.</p>
      )}

      <ul className="space-y-5">
        {registros.map((reg) => (
          <li
            key={reg.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 p-5"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(reg.data).toLocaleString('pt-BR')}
              </p>
              <button
                onClick={() => handleExcluir(reg.id)}
                className="text-rose-600 hover:underline text-sm"
              >
                Excluir
              </button>
            </div>

            <p className="font-medium mb-3">
              <span className="opacity-70">Entrada:</span> {reg.entrada}
            </p>

            <div>
              <SmartText text={reg.resposta} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
