// scripts/check-solux-env.mjs
const required = ['GOOGLE_API_KEY', 'DATABASE_URL'];
const missing = required.filter(k => !process.env[k] || !String(process.env[k]).trim());

if (missing.length) {
  console.error('❌ Variáveis ausentes:', missing.join(', '));
  process.exit(1);
}

console.log('✅ Ambiente OK');
console.log('PORT =', process.env.PORT || '3001');
console.log('DATABASE_URL =', process.env.DATABASE_URL);
console.log('SOLUX_LANG =', process.env.SOLUX_LANG || 'pt-BR');
