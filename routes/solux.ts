import express, { Request, Response } from 'express';
import { OpenAI } from 'openai';
import { gerarPDF } from '../utils/gerarPDF.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();

// 🚨 Validação antecipada de variável sensível
if (!process.env.OPENAI_API_KEY) {
  throw new Error('❌ OPENAI_API_KEY não encontrada. Verifique seu .env');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Tipagem global para evitar recriação do PrismaClient em dev
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// 🔧 Auxiliar: gera resposta via OpenAI
async function gerarResposta(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          'Você é um especialista em análise lógica de problemas pessoais e financeiros. Seja direto, categórico, e ofereça soluções racionais.',
      },
      { role: 'user', content: prompt },
    ],
  });

  return completion.choices?.[0]?.message?.content ?? '';
}

// 1. Destrinchar problema inicial
router.post('/destrinchar', async (req: Request, res: Response) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'Campo "input" é obrigatório.' });
  }

  const prompt = `Analise este problema: "${input}". Categorize-o em:
1. Categorias
2. O que pode ser ignorado
3. O que pode ser resolvido agora
4. O que precisa esperar
5. O que precisa ser melhor analisado
6. Mapa de riscos
Finalize com uma pergunta complementar para entender melhor o contexto.`;

  try {
    const resposta = await gerarResposta(prompt);
    res.json({ resposta });
  } catch (err) {
    console.error('[ERRO] /destrinchar:', err);
    res.status(500).json({ error: 'Erro na IA ao destrinchar.' });
  }
});

// 2. Perguntar sobre restrições
router.post('/resposta-complementar', async (req: Request, res: Response) => {
  try {
    const { input, respostaComplementar } = req.body;

    if (!input || !respostaComplementar) {
      return res.status(400).json({ error: 'Campos "input" e "respostaComplementar" são obrigatórios.' });
    }

    const prompt = `Problema original: "${input}". O usuário respondeu: "${respostaComplementar}".
Com base nisso, pergunte se ele deseja desconsiderar algo, como empréstimos ou venda de ativos.`;

    const novaPergunta = await gerarResposta(prompt);
    res.json({ novaPergunta });
  } catch (err) {
    console.error('[ERRO] /resposta-complementar:', err);
    res.status(500).json({ error: 'Erro ao gerar pergunta sobre restrições.' });
  }
});

// 3. Gerar plano final e retornar PDF
router.post('/definir-limites', async (req: Request, res: Response) => {
  const { input, respostaComplementar, restricoes } = req.body;

  if (!input || !respostaComplementar) {
    return res.status(400).json({ error: 'Campos "input" e "respostaComplementar" são obrigatórios.' });
  }

  const prompt = `Com base nesse problema: "${input}", e na resposta complementar: "${respostaComplementar}", considerando as restrições: "${restricoes}".
Gere uma lista de soluções racionais e realistas, considerando o contexto. Seja direto, prático, e evite repetir informações. Finalize com um plano de ação.`;

  try {
    const planoFinal = await gerarResposta(prompt);
    if (!planoFinal) throw new Error('Resposta da IA vazia');

    await prisma.registro.create({
      data: {
        entrada: input,
        resposta: planoFinal,
        complemento: respostaComplementar,
        restricoes,
      },
    });

    const pdfBuffer = await gerarPDF(planoFinal);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="plano-final.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[ERRO] /definir-limites:', err);
    res.status(500).json({ error: 'Erro ao gerar plano final.' });
  }
});

// 4. Listar registros
router.get('/registros', async (_req: Request, res: Response) => {
  try {
    const registros = await prisma.registro.findMany({
      orderBy: { data: 'desc' },
    });
    res.json(registros);
  } catch (err) {
    console.error('[ERRO] /registros:', err);
    res.status(500).json({ error: 'Erro ao buscar registros do banco.' });
  }
});

export const soluxRoutes = router;
