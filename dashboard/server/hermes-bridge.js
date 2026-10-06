/**
 * Hermes Bridge - Executa skills via CLI
 */
import { spawn } from 'child_process';

const HERMES_CMD = process.env.HERMES_CMD || 'hermes';

export async function executeSkill(skillName, prompt, options = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    // hermes chat --oneshot -Q -s <skill> -q <prompt> --yolo  (documented one-shot form)
    const args = ['chat', '--oneshot', '-Q', '-s', skillName, '-q', prompt, '--yolo'];
    
    if (options.model) args.push('-m', options.model);
    
    console.log(`[HERMES] Exec: ${skillName}`);
    
    const proc = spawn(HERMES_CMD, args, {
      shell: false,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    
    const timeout = setTimeout(() => {
      proc.kill();
      resolve({
        success: false,
        output: stdout,
        error: 'Timeout (5min)',
        duration: Date.now() - start
      });
    }, options.timeout || 300000);
    
    proc.on('close', code => {
      clearTimeout(timeout);
      resolve({
        success: code === 0,
        output: stdout.trim(),
        error: code !== 0 ? stderr.trim() : null,
        duration: Date.now() - start
      });
    });
    
    proc.on('error', err => {
      clearTimeout(timeout);
      resolve({
        success: false,
        output: '',
        error: err.message,
        duration: Date.now() - start
      });
    });
  });
}

export async function checkHermes() {
  return new Promise(resolve => {
    const proc = spawn(HERMES_CMD, ['--version'], { shell: false });
    proc.on('close', code => resolve(code === 0));
    proc.on('error', () => resolve(false));
    setTimeout(() => { proc.kill(); resolve(false); }, 5000);
  });
}
