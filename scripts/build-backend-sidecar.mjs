/**
 * Prepara o backend WhatsApp (Express + Baileys) para ser embutido como
 * sidecar do Tauri:
 *
 *   1. Compila o backend TypeScript (backend/dist).
 *   2. Copia dist/ + node_modules/ + package.json para
 *      src-tauri/resources/backend/ (consumido via `resources` no
 *      tauri.conf.json e lido em runtime por `resource_dir()`).
 *   3. Garante que exista um Node.js portátil em
 *      src-tauri/binaries/backend-node-<target-triple>.exe (consumido via
 *      `externalBin` no tauri.conf.json).
 *
 * Rode este script uma vez antes de `npm run tauri build` (ou `tauri dev`
 * na primeira vez). Ele é idempotente: pula passos cujo resultado já existe,
 * a menos que --force seja passado.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT, 'backend');
const TAURI_DIR = path.join(ROOT, 'src-tauri');
const RESOURCES_BACKEND_DIR = path.join(TAURI_DIR, 'resources', 'backend');
const BINARIES_DIR = path.join(TAURI_DIR, 'binaries');

const NODE_VERSION = process.env.SIDECAR_NODE_VERSION || '22.14.0';
const FORCE = process.argv.includes('--force');

function log(msg) {
  console.log(`[build-backend-sidecar] ${msg}`);
}

function run(cmd, cwd) {
  log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function getTargetTriple() {
  return execSync('rustc --print host-tuple').toString().trim();
}

async function download(url, dest) {
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Falha ao baixar ${url}: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', reject);
  });
}

/**
 * Passo 1: build do backend TypeScript + node_modules de produção.
 */
function buildBackend() {
  log('Compilando backend TypeScript (npm run build)...');
  run('npm ci', BACKEND_DIR);
  run('npm run build', BACKEND_DIR);

  log('Preparando resources/backend com dependências de produção...');
  rmrf(RESOURCES_BACKEND_DIR);
  fs.mkdirSync(RESOURCES_BACKEND_DIR, { recursive: true });

  copyDir(path.join(BACKEND_DIR, 'dist'), path.join(RESOURCES_BACKEND_DIR, 'dist'));
  fs.copyFileSync(
    path.join(BACKEND_DIR, 'package.json'),
    path.join(RESOURCES_BACKEND_DIR, 'package.json')
  );
  if (fs.existsSync(path.join(BACKEND_DIR, 'package-lock.json'))) {
    fs.copyFileSync(
      path.join(BACKEND_DIR, 'package-lock.json'),
      path.join(RESOURCES_BACKEND_DIR, 'package-lock.json')
    );
  }

  // Instala apenas dependências de produção diretamente dentro do diretório
  // de recursos, para não mutar o node_modules de desenvolvimento do backend
  // (que inclui devDependencies como ts-node-dev) nem afetar módulos nativos
  // como `sharp`, que precisam ser resolvidos/instalados para a plataforma alvo.
  log('Instalando dependências de produção em resources/backend...');
  run('npm ci --omit=dev', RESOURCES_BACKEND_DIR);

  log('Backend preparado em ' + RESOURCES_BACKEND_DIR);
}

/**
 * Passo 2: garante Node.js portátil renomeado no padrão de sidecar do Tauri.
 */
async function ensureNodeSidecar() {
  const targetTriple = getTargetTriple();
  const destExe = path.join(BINARIES_DIR, `backend-node-${targetTriple}.exe`);

  if (fs.existsSync(destExe) && !FORCE) {
    log(`Node sidecar já existe: ${destExe} (use --force para recriar)`);
    return;
  }

  fs.mkdirSync(BINARIES_DIR, { recursive: true });

  const arch = process.arch === 'x64' ? 'x64' : process.arch;
  const zipName = `node-v${NODE_VERSION}-win-${arch}`;
  const zipUrl = `https://nodejs.org/dist/v${NODE_VERSION}/${zipName}.zip`;
  const tmpZip = path.join(BINARIES_DIR, `${zipName}.zip`);
  const tmpExtractDir = path.join(BINARIES_DIR, `${zipName}`);

  log(`Baixando Node.js portátil v${NODE_VERSION} (${zipUrl})...`);
  await download(zipUrl, tmpZip);

  log('Extraindo node.exe...');
  rmrf(tmpExtractDir);
  run(`powershell -NoProfile -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${BINARIES_DIR}' -Force"`);

  const extractedExe = path.join(tmpExtractDir, 'node.exe');
  fs.copyFileSync(extractedExe, destExe);

  rmrf(tmpExtractDir);
  fs.rmSync(tmpZip, { force: true });

  log(`Node sidecar criado: ${destExe}`);
}

async function main() {
  buildBackend();
  await ensureNodeSidecar();
  log('Concluído. Pronto para `npm run tauri build` / `npm run tauri dev`.');
}

main().catch((err) => {
  console.error('[build-backend-sidecar] Erro:', err);
  process.exit(1);
});
