const { spawn } = require('child_process');

console.log('Iniciando Servidor Proxy API e Expo...');

const start = spawn('npx', ['concurrently', '"npm run api"', '"expo start"'], {
  stdio: 'inherit',
  shell: true
});

start.on('error', (err) => {
  console.error('Falha ao iniciar processos:', err);
});
