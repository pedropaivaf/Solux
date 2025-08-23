export type DestrincharOut = { resposta: string };
export type PerguntaOut = { novaPergunta: string };
export type PlanoFinalOut =
  | { ok: true; planoFinal: string }
  | { ok: true; pdf: true };

// Tenta rota relativa (proxy/prod). Se falhar (erro de rede), cai para :3001.
async function tryFetch(url: string, init?: RequestInit) {
  try {
    return await fetch(url, init);
  } catch {
    const abs = url.startsWith('/api') ? `http://localhost:3001${url}` : url;
    return fetch(abs, init);
  }
}

async function jsonFetch<T>(url: string, body?: unknown): Promise<T> {
  const r = await tryFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const ct = r.headers.get('content-type') || '';
  let payload: any = null;

  if (ct.includes('application/json')) {
    payload = await r.json().catch(() => null);
  } else {
    const txt = await r.text().catch(() => '');
    payload = txt ? { message: txt } : null;
  }

  if (!r.ok) {
    const msg = payload?.error || payload?.message || r.statusText || 'Erro desconhecido';
    throw new Error(`Erro ${r.status}: ${msg}`);
  }
  return (payload ?? ({} as any)) as T;
}

export async function apiDestrinchar(input: string) {
  return jsonFetch<DestrincharOut>('/api/destrinchar', { input });
}

export async function apiPerguntaComplementar(input: string, respostaComplementar: string) {
  return jsonFetch<PerguntaOut>('/api/resposta-complementar', { input, respostaComplementar });
}

export async function apiPlanoFinal(input: string, respostaComplementar: string, restricoes?: string) {
  const r = await tryFetch('/api/definir-limites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, respostaComplementar, restricoes }),
  });

  // PDF?
  if (r.headers.get('content-type')?.includes('application/pdf')) {
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // tenta pegar do header; se não vier, usa nosso padrão
    const cd = r.headers.get('content-disposition');
    const m = cd?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    const serverName = m ? decodeURIComponent(m[1]).replace(/^["']|["']$/g, '') : null;

    a.download = serverName || 'Solux-PlanoFinal.pdf';
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true, pdf: true } as const;
  }

  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('application/json')
    ? await r.json().catch(() => ({}))
    : { message: await r.text().catch(() => '') };

  if (!r.ok) {
    const msg = (data as any)?.error || (data as any)?.message || r.statusText || 'Erro desconhecido';
    throw new Error(`Erro ${r.status}: ${msg}`);
  }
  return data as PlanoFinalOut;
}

export async function apiLimparRegistros() {
  const r = await fetch('/api/registros', { method: 'DELETE' }).catch(() =>
    fetch('http://localhost:3001/api/registros', { method: 'DELETE' })
  );
  if (!r.ok) throw new Error(`Erro ${r.status}: ${await r.text()}`);
  return r.json() as Promise<{ ok: boolean; deleted: number }>;
}

export async function apiExcluirRegistro(id: number) {
  const r = await fetch(`/api/registros/${id}`, { method: 'DELETE' }).catch(() =>
    fetch(`http://localhost:3001/api/registros/${id}`, { method: 'DELETE' })
  );
  if (!r.ok) throw new Error(`Erro ${r.status}: ${await r.text()}`);
  return r.json() as Promise<{ ok: boolean }>;
}
