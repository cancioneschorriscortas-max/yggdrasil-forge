#!/usr/bin/env node
// ── INICIO: bin (executable `ygg`) ──
// Adaptador fino: conecta `run()` (testable) co process real.
// Sen top-level await (o build CJS de tsup non o admite).

import { run } from './cli.js'

function readStdin(): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks: Buffer[] = []
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk))
    process.stdin.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')))
    process.stdin.on('error', rejectPromise)
  })
}

run(process.argv.slice(2), {
  readStdin,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
})
  .then((code) => {
    process.exitCode = code
  })
  .catch((error) => {
    process.stderr.write(`ygg: erro inesperado: ${String(error)}\n`)
    process.exitCode = 1
  })
// ── FIN: bin ──
