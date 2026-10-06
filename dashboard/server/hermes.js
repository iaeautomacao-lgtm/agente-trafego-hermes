/**
 * Módulo de integração com Hermes CLI
 * Executa skills e retorna resultados
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Caminho do Hermes (ajustar se necessário)
const HERMES_CMD = process.env.HERMES_CMD || 'hermes';

/**
 * Executa uma skill do Hermes
 * @param {string} skillName - Nome da skill (ex: ddm-estrategista-trafego)
 * @param {string} prompt - Prompt/input para o agente
 * @param {object} options - Opções adicionais
 * @returns {Promise<{success: boolean, output: string, error?: string}>}
 */
export async function executeSkill(skillName, prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Monta o comando completo
    // Formato: hermes --skills SKILL -z "PROMPT"
    const args = ['--skills', skillName, '-z', prompt];
    
    if (options.model) {
      args.unshift('--model', options.model);
    }
    
    // Adiciona --yolo para execução não-interativa
    args.push('--yolo');
    
    console.log(`[HERMES] Executando skill: ${skillName}`);
    console.log(`[HERMES] Args: ${args.slice(0, 4).join(' ')}...`);
    
    const hermes = spawn(HERMES_CMD, args, {
      shell: false,
      env: { ...process.env },
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    hermes.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    hermes.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    hermes.on('close', (code) => {
      const duration = Date.now() - startTime;
      console.log(`[HERMES] Finalizado em ${duration}ms (código: ${code})`);
      
      if (code === 0) {
        resolve({
          success: true,
          output: stdout.trim(),
          duration_ms: duration
        });
      } else {
        resolve({
          success: false,
          output: stdout.trim(),
          error: stderr.trim() || `Hermes exited with code ${code}`,
          duration_ms: duration
        });
      }
    });
    
    hermes.on('error', (err) => {
      console.error(`[HERMES] Erro ao spawnar processo:`, err);
      resolve({
        success: false,
        error: err.message,
        duration_ms: Date.now() - startTime
      });
    });
    
    // Timeout de 5 minutos
    const timeout = options.timeout || 300000;
    setTimeout(() => {
      hermes.kill();
      resolve({
        success: false,
        error: `Timeout após ${timeout/1000}s`,
        output: stdout.trim(),
        duration_ms: timeout
      });
    }, timeout);
  });
}

/**
 * Executa skill com streaming de output
 * @param {string} skillName 
 * @param {string} prompt 
 * @returns {EventEmitter} - Emite 'data', 'error', 'end'
 */
export function executeSkillStream(skillName, prompt) {
  const emitter = new EventEmitter();
  
  const fullPrompt = `Carregue a skill ${skillName} e execute:\n\n${prompt}`;
  const hermes = spawn(HERMES_CMD, ['-m', fullPrompt], {
    shell: true,
    env: { ...process.env }
  });
  
  hermes.stdout.on('data', (data) => {
    emitter.emit('data', data.toString());
  });
  
  hermes.stderr.on('data', (data) => {
    emitter.emit('error', data.toString());
  });
  
  hermes.on('close', (code) => {
    emitter.emit('end', { code });
  });
  
  return emitter;
}

/**
 * Verifica se o Hermes está disponível
 */
export async function checkHermes() {
  return new Promise((resolve) => {
    const hermes = spawn(HERMES_CMD, ['--version'], { shell: true });
    
    let version = '';
    hermes.stdout.on('data', (data) => {
      version += data.toString();
    });
    
    hermes.on('close', (code) => {
      resolve({
        available: code === 0,
        version: version.trim()
      });
    });
    
    hermes.on('error', () => {
      resolve({ available: false, version: null });
    });
    
    setTimeout(() => {
      hermes.kill();
      resolve({ available: false, version: null, error: 'timeout' });
    }, 5000);
  });
}

export default {
  executeSkill,
  executeSkillStream,
  checkHermes
};
