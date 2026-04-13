import { spawn } from 'child_process';

export interface PythonRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

const DEFAULT_TIMEOUT_MS = 4000;
const MAX_OUTPUT_LENGTH = 8000;

function trimOutput(value: string) {
  if (value.length <= MAX_OUTPUT_LENGTH) return value;
  return `${value.slice(0, MAX_OUTPUT_LENGTH)}\n...output truncated...`;
}

function runWith(command: string, args: string[], code: string): Promise<PythonRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let finished = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, DEFAULT_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      if (!finished) {
        finished = true;
        reject(error);
      }
    });

    child.on('close', (codeValue) => {
      clearTimeout(timer);
      if (finished) return;
      finished = true;
      resolve({
        ok: codeValue === 0 && !timedOut,
        stdout: trimOutput(stdout.trim()),
        stderr: trimOutput(stderr.trim()),
        timedOut,
      });
    });

    child.stdin.write(code);
    child.stdin.end();
  });
}

export async function runPythonCode(code: string): Promise<PythonRunResult> {
  try {
    return await runWith('python', ['-'], code);
  } catch {
    return runWith('py', ['-3', '-'], code);
  }
}