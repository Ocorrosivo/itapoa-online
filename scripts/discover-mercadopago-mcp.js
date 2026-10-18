import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || 'Bearer_Token_Required';

console.log('==================================================');
console.log('Testing Mercado Pago Official MCP Remote Bridge...');
console.log('Endpoint: https://mcp.mercadopago.com/mcp');

const args = [
  '-y',
  'mcp-remote',
  'https://mcp.mercadopago.com/mcp',
  '--header',
  `Authorization: Bearer ${mpToken}`
];

const child = spawn('npx', args, {
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe']
});

let outputData = '';
let errorData = '';

child.stdout.on('data', (data) => {
  const str = data.toString();
  console.log('[MCP STDOUT]', str);
  outputData += str;
});

child.stderr.on('data', (data) => {
  const str = data.toString();
  console.error('[MCP STDERR]', str);
  errorData += str;
});

// Send JSON-RPC initialize
const initMsg = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'antigravity-mcp-client', version: '1.0.0' }
  }
}) + '\n';

setTimeout(() => {
  console.log('--> Sending initialize request over stdio...');
  child.stdin.write(initMsg);
}, 2000);

setTimeout(() => {
  const listToolsMsg = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  }) + '\n';
  console.log('--> Sending tools/list request over stdio...');
  child.stdin.write(listToolsMsg);
}, 4000);

setTimeout(() => {
  console.log('--> Exiting test...');
  child.kill();
}, 7000);
