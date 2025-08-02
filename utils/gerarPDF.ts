import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

// Tipagem global para evitar recriar o PrismaClient no modo dev
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function gerarPDF(
  conteudo: string,
  titulo = 'Plano Final',
  entradaOriginal = ''
): Promise<Buffer> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const dataHora = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });

  const html = `
  <html>
    <head>
      <style>
        body { font-family: 'Arial', sans-serif; padding: 2rem; color: #333; }
        h1 { color: #0044cc; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem; }
        p { line-height: 1.6; margin-top: 1rem; }
        footer { margin-top: 2rem; font-size: 0.9rem; color: #888; border-top: 1px solid #eee; padding-top: 1rem; }
      </style>
    </head>
    <body>
      <h1>${titulo}</h1>
      <p>${conteudo.replace(/\n/g, '<br>')}</p>
      <footer>Gerado pelo Solux em ${dataHora}</footer>
    </body>
  </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const buffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  // Salvar no banco de dados
  await prisma.registro.create({
    data: {
      entrada: entradaOriginal,
      resposta: conteudo,
    },
  });

  return Buffer.from(buffer);
}
