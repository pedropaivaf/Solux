import express from 'express';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
// ====== STUB / Modo debug sem IA ======
const STUB = process.env.SOLUX_STUB === '1';
// ====== Prisma (reuso em dev) ======
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production')
    global.prisma = prisma;
// ====== Gemini (só inicializa se não for STUB) ======
let genAI = null;
if (!STUB) {
    if (!process.env.GOOGLE_API_KEY || !String(process.env.GOOGLE_API_KEY).trim()) {
        throw new Error('❌ GOOGLE_API_KEY não encontrada. Defina no .env ou ative SOLUX_STUB=1 para testar sem IA.');
    }
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
}
let _gerarPDF;
async function getGerarPDF() {
    if (_gerarPDF)
        return _gerarPDF;
    try {
        const mod = await import('../utils/gerarPDF.js');
        _gerarPDF = mod?.gerarPDF;
        return _gerarPDF;
    }
    catch {
        return undefined;
    }
}
// ====== Função de geração de resposta ======
async function gerarResposta(prompt) {
    if (STUB) {
        console.log('[STUB] gerarResposta() — prompt len:', prompt.length);
        return [
            'STUB: resposta simulada para debug.',
            '1) Categorias: ...',
            '2) Ignorar: ...',
            '3) Resolver agora: ...',
            '4) Precisa esperar: ...',
            '5) Melhor analisar: ...',
            '6) Mapa de riscos: ...',
            'Pergunta complementar: Qual é a principal restrição de orçamento/tempo?'
        ].join('\n');
    }
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
        const result = await model.generateContent(prompt);
        const text = result?.response?.text?.() ?? '';
        if (!text.trim())
            throw new Error('Resposta vazia do provedor');
        return text;
    }
    catch (e) {
        console.error('[IA ERROR]', e?.message || e);
        throw e;
    }
}
// ====== Schemas ======
const definirLimitesSchema = z.object({
    input: z.string().min(1, { message: 'Campo "input" é obrigatório.' }),
    respostaComplementar: z.string().min(1, { message: 'Campo "respostaComplementar" é obrigatório.' }),
    restricoes: z.string().optional(),
});
// ====== Rotas ======
// Healthcheck / Smoke
router.get('/ping', (_req, res) => res.json({ ok: true, ts: Date.now(), stub: STUB }));
// POST /api/destrinchar
router.post('/destrinchar', async (req, res) => {
    const { input } = req.body;
    if (!input)
        return res.status(400).json({ error: 'Campo "input" é obrigatório.' });
    const prompt = `Analise o problema a seguir e entregue no formato solicitado.
Problema: """${input}"""

ENTREGUE:
1. Categorias (lista)
2. O que pode ser ignorado (lista) — respeite se o usuário proibir empréstimos
3. O que pode ser resolvido agora (lista de ações com passos)
4. O que precisa esperar (lista com estimativa de tempo)
5. O que precisa ser melhor analisado (lista)
6. Mapa de riscos (itens com probabilidade: baixa|media|alta e mitigação)
Pergunta complementar final (1 pergunta objetiva que ajude a destravar o próximo passo).`;
    try {
        const resposta = await gerarResposta(prompt);
        res.json({ resposta });
    }
    catch (err) {
        console.error('[ERRO] /destrinchar:', err?.message || err);
        res.status(500).json({ error: 'Erro na IA ao destrinchar.' });
    }
});
// POST /api/resposta-complementar
router.post('/resposta-complementar', async (req, res) => {
    try {
        const { input, respostaComplementar } = req.body;
        if (!input || !respostaComplementar) {
            return res.status(400).json({ error: 'Campos "input" e "respostaComplementar" são obrigatórios.' });
        }
        const prompt = `Problema original: """${input}"""
Resposta do usuário à pergunta complementar: """${respostaComplementar}"""

Agora gere UMA nova pergunta objetiva para confirmar se o usuário deseja desconsiderar algo, como empréstimos ou venda de ativos, e/ou para coletar a principal restrição que afeta a execução imediata.`;
        const novaPergunta = await gerarResposta(prompt);
        res.json({ novaPergunta });
    }
    catch (err) {
        console.error('[ERRO] /resposta-complementar:', err?.message || err);
        res.status(500).json({ error: 'Erro ao gerar pergunta complementar.' });
    }
});
// POST /api/definir-limites (gera plano final + PDF opcional)
router.post('/definir-limites', async (req, res) => {
    const parsed = definirLimitesSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') });
    }
    const { input, respostaComplementar, restricoes } = parsed.data;
    const prompt = `Com base no problema: """${input}"""
Resposta complementar do usuário: """${respostaComplementar}"""
Restrições declaradas: """${restricoes || 'nenhuma informada'}"""

Monte um PLANO FINAL objetivo contendo:
- Ações imediatas (passo a passo, 3-7 itens)
- Ações que exigem tempo (com estimativa em dias/semanas)
- Riscos (probabilidade baixa|media|alta) e suas mitigações
- Lista priorizada de tarefas (ordem numérica e critério: impacto|esforco|risco|custo|tempo)
- Métricas de sucesso (lista)
Finalize com um RESUMO EXECUTIVO curto.`;
    try {
        const planoFinal = await gerarResposta(prompt);
        if (!planoFinal)
            throw new Error('Resposta da IA vazia');
        // Persistência
        try {
            await prisma.registro.create({
                data: { entrada: input, resposta: planoFinal, complemento: respostaComplementar, restricoes },
            });
        }
        catch (dbErr) {
            console.warn('[DB WARN] Falha ao salvar registro:', dbErr?.message || dbErr);
        }
        // PDF opcional
        const gerarPDF = await getGerarPDF();
        if (gerarPDF) {
            const pdfBuffer = await gerarPDF(planoFinal, 'Solux - Plano Final', input);
            const filename = 'Solux-PlanoFinal.pdf';
            res.setHeader('Content-Type', 'application/pdf');
            // nome compatível com UTF-8
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
            // expõe o header pro browser se precisar ler (CORS/proxy)
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            return res.send(pdfBuffer);
        }
        else {
            return res.json({ ok: true, planoFinal });
        }
    }
    catch (err) {
        console.error('[ERRO] /definir-limites:', err?.message || err);
        res.status(500).json({ error: 'Erro ao gerar plano final.' });
    }
});
// GET /api/registros
router.get('/registros', async (_req, res) => {
    try {
        const registros = await prisma.registro.findMany({ orderBy: { data: 'desc' } });
        res.json(registros);
    }
    catch (err) {
        console.error('[ERRO] /registros:', err?.message || err);
        res.status(500).json({ error: 'Erro ao buscar registros do banco.' });
    }
});
// DELETE /api/registros  -> apaga tudo
router.delete('/registros', async (_req, res) => {
    try {
        const out = await prisma.registro.deleteMany({});
        res.json({ ok: true, deleted: out.count });
    }
    catch (err) {
        console.error('[ERRO] DELETE /registros:', err);
        res.status(500).json({ ok: false, error: err.message || 'Erro ao limpar registros.' });
    }
});
// ✅ DELETE /api/registros/:id -> apaga um (SEM regex no path; valida internamente)
router.delete('/registros/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ ok: false, error: 'ID inválido' });
        }
        await prisma.registro.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        if (err?.code === 'P2025') {
            return res.status(404).json({ ok: false, error: 'Registro não encontrado' });
        }
        res.status(500).json({ ok: false, error: err?.message || 'Erro ao excluir registro.' });
    }
});
export const soluxRoutes = router;
