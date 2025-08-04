import express from 'express';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { gerarPDF } from '../utils/gerarPDF.js';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
// A verificação correta para a chave do Google
if (!process.env.GOOGLE_API_KEY) {
    throw new Error('❌ GOOGLE_API_KEY não encontrada. Verifique seu .env');
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production')
    global.prisma = prisma;
async function gerarResposta(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    }
    catch (error) {
        console.error("Erro ao chamar a API do Gemini:", error);
        throw new Error("Falha na comunicação com a IA do Google.");
    }
}
router.post('/destrinchar', async (req, res) => {
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
    }
    catch (err) {
        console.error('[ERRO] /destrinchar:', err);
        res.status(500).json({ error: 'Erro na IA ao destrinchar.' });
    }
});
router.post('/resposta-complementar', async (req, res) => {
    try {
        const { input, respostaComplementar } = req.body;
        if (!input || !respostaComplementar) {
            return res.status(400).json({ error: 'Campos "input" e "respostaComplementar" são obrigatórios.' });
        }
        const prompt = `Problema original: "${input}". O usuário respondeu: "${respostaComplementar}".
Com base nisso, pergunte se ele deseja desconsiderar algo, como empréstimos ou venda de ativos.`;
        const novaPergunta = await gerarResposta(prompt);
        res.json({ novaPergunta });
    }
    catch (err) {
        console.error('[ERRO] /resposta-complementar:', err);
        res.status(500).json({ error: 'Erro ao gerar pergunta sobre restrições.' });
    }
});
const definirLimitesSchema = z.object({
    input: z.string().min(1, { message: 'Campo "input" é obrigatório.' }),
    respostaComplementar: z.string().min(1, { message: 'Campo "respostaComplementar" é obrigatório.' }),
    restricoes: z.string().optional(),
});
router.post('/definir-limites', async (req, res) => {
    const validationResult = definirLimitesSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(400).json({ errors: validationResult.error.flatten().fieldErrors });
    }
    const { input, respostaComplementar, restricoes } = validationResult.data;
    const prompt = `Com base nesse problema: "${input}", e na resposta complementar: "${respostaComplementar}", considerando as restrições: "${restricoes}".
Gere uma lista de soluções racionais e realistas, considerando o contexto. Seja direto, prático, e evite repetir informações. Finalize com um plano de ação.`;
    try {
        const planoFinal = await gerarResposta(prompt);
        if (!planoFinal) {
            throw new Error('Resposta da IA vazia');
        }
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
    }
    catch (err) {
        console.error('[ERRO] /definir-limites:', err);
        res.status(500).json({ error: 'Erro ao gerar plano final.' });
    }
});
router.get('/registros', async (_req, res) => {
    try {
        const registros = await prisma.registro.findMany({
            orderBy: { data: 'desc' },
        });
        res.json(registros);
    }
    catch (err) {
        console.error('[ERRO] /registros:', err);
        res.status(500).json({ error: 'Erro ao buscar registros do banco.' });
    }
});
export const soluxRoutes = router;
