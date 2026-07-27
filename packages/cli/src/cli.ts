// ── INICIO: cli (7.15, Cambio 4) ──
// Dispatcher do `ygg`. Sen dependencia de arg-parsers: tres comandos
// v1 cunha gramática trivial (só o que o fluxo IA necesita HOXE):
//
//   ygg validate [ficheiro|-] [--json]   exit 0/1 (2 = uso incorrecto)
//   ygg schema [--out ficheiro]
//   ygg new [--id x] [--label "..."]
//
// Testable: `run(argv, io)` é puro respecto de process — o bin real
// (bin.ts) e os tests fornecen o mesmo contrato CliIO.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderDocumentJsonSchema } from './documentSchema.js'
import { isAutoLayoutAlgo, layoutDocumentText } from './layoutCmd.js'
import { newDocumentJson } from './newDocument.js'
import { renderDocumentText } from './renderCmd.js'
import { validateDocumentText } from './validate.js'

export interface CliIO {
  /** Le stdin completo (para `ygg validate -` / pipe). */
  readonly readStdin: () => Promise<string>
  readonly stdout: (text: string) => void
  readonly stderr: (text: string) => void
}

const USAGE = `ygg — ferramentas de liña de comandos de Yggdrasil Forge

Uso:
  ygg validate [ficheiro|-] [--json]   Valida un documento (sen ficheiro ou con "-": le stdin).
                                       --json emite {ok, issues[]} como dato accionable.
  ygg layout <ficheiro|-> --algo <a>   Coloca TODOS os nodos co algoritmo indicado e emite o
       [--out ficheiro]                documento resultante (stdout ou --out). Algoritmos:
                                       radial | tree | clustered-radial | constellation.
  ygg render <ficheiro|-> --out <f.svg>  Renderiza a árbore a un SVG autocontido.
       [--dark] [--locale gl] [--width N]
  ygg schema [--out ficheiro]          Emite o JSON Schema do documento.
  ygg new [--id x] [--label "..."]     Emite un documento baleiro válido polo stdout.

Códigos de saída: 0 ok · 1 validación fallida ou erro · 2 uso incorrecto
`

/** Extrae o valor dunha opción `--nome valor`. Devolve [valor, resto]. */
function takeOption(
  args: readonly string[],
  name: string,
): [string | undefined, readonly string[]] {
  const idx = args.indexOf(name)
  if (idx === -1) return [undefined, args]
  const value = args[idx + 1]
  if (value === undefined || value.startsWith('--')) return [undefined, args]
  return [value, [...args.slice(0, idx), ...args.slice(idx + 2)]]
}

async function cmdValidate(args: readonly string[], io: CliIO): Promise<number> {
  const json = args.includes('--json')
  const positional = args.filter((a) => a !== '--json')
  if (positional.length > 1) {
    io.stderr(`ygg validate: agardaba un só ficheiro, recibín ${positional.length}\n`)
    return 2
  }
  const source = positional[0]
  let text: string
  try {
    text =
      source === undefined || source === '-'
        ? await io.readStdin()
        : readFileSync(resolve(source), 'utf8')
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (json) {
      io.stdout(
        `${JSON.stringify(
          { ok: false, issues: [{ severity: 'error', code: 'FILE_READ', message }] },
          null,
          2,
        )}\n`,
      )
    } else {
      io.stderr(`✗ non se puido ler: ${message}\n`)
    }
    return 1
  }

  const report = validateDocumentText(text)
  if (json) {
    io.stdout(`${JSON.stringify(report, null, 2)}\n`)
  } else if (report.ok) {
    io.stdout(
      `✓ documento válido (${report.stats?.nodes ?? 0} nodos, ${report.stats?.edges ?? 0} arestas)\n`,
    )
  } else {
    io.stderr('✗ documento inválido:\n')
    for (const issue of report.issues) {
      io.stderr(`  [${issue.severity}] ${issue.code}: ${issue.message}\n`)
    }
  }
  return report.ok ? 0 : 1
}

async function cmdLayout(args: readonly string[], io: CliIO): Promise<number> {
  const [algo, rest1] = takeOption(args, '--algo')
  const [out, rest2] = takeOption(rest1, '--out')
  const positional = rest2.filter((a) => !a.startsWith('--'))
  if (algo === undefined || !isAutoLayoutAlgo(algo)) {
    io.stderr('ygg layout: falta --algo (radial | tree | clustered-radial | constellation)\n')
    return 2
  }
  if (positional.length > 1) {
    io.stderr(`ygg layout: agardaba un só ficheiro, recibín ${positional.length}\n`)
    return 2
  }
  const source = positional[0]
  let text: string
  try {
    text =
      source === undefined || source === '-'
        ? await io.readStdin()
        : readFileSync(resolve(source), 'utf8')
  } catch (e) {
    io.stderr(`✗ non se puido ler: ${e instanceof Error ? e.message : String(e)}\n`)
    return 1
  }
  const result = layoutDocumentText(text, algo)
  if (!result.ok || result.output === undefined) {
    io.stderr(`✗ non se puido dispor: ${result.error ?? 'erro descoñecido'}\n`)
    return 1
  }
  if (out !== undefined) {
    writeFileSync(resolve(out), result.output, 'utf8')
    io.stdout(`documento colocado escrito en ${resolve(out)}\n`)
  } else {
    io.stdout(result.output)
  }
  return 0
}

async function cmdRender(args: readonly string[], io: CliIO): Promise<number> {
  const [out, rest1] = takeOption(args, '--out')
  const [locale, rest2] = takeOption(rest1, '--locale')
  const [width, rest3] = takeOption(rest2, '--width')
  const dark = rest3.includes('--dark')
  const positional = rest3.filter((a) => !a.startsWith('--'))
  if (out === undefined) {
    io.stderr('ygg render: falta --out <saida.svg>\n')
    return 2
  }
  if (positional.length > 1) {
    io.stderr(`ygg render: agardaba un só ficheiro, recibín ${positional.length}\n`)
    return 2
  }
  const source = positional[0]
  let text: string
  try {
    text =
      source === undefined || source === '-'
        ? await io.readStdin()
        : readFileSync(resolve(source), 'utf8')
  } catch (e) {
    io.stderr(`✗ non se puido ler: ${e instanceof Error ? e.message : String(e)}
`)
    return 1
  }
  const parsedWidth = width !== undefined ? Number.parseInt(width, 10) : undefined
  const result = renderDocumentText(text, {
    dark,
    ...(locale !== undefined && { locale: locale as never }),
    ...(parsedWidth !== undefined && Number.isFinite(parsedWidth) && { width: parsedWidth }),
  })
  if (!result.ok || result.output === undefined) {
    io.stderr(`✗ non se puido renderizar: ${result.error ?? 'erro descoñecido'}
`)
    return 1
  }
  writeFileSync(resolve(out), result.output, 'utf8')
  io.stdout(`svg escrito en ${resolve(out)}
`)
  return 0
}

function cmdSchema(args: readonly string[], io: CliIO): number {
  const [out, rest] = takeOption(args, '--out')
  if (rest.length > 0) {
    io.stderr(`ygg schema: argumentos non recoñecidos: ${rest.join(' ')}\n`)
    return 2
  }
  const text = renderDocumentJsonSchema()
  if (out !== undefined) {
    writeFileSync(resolve(out), text, 'utf8')
    io.stdout(`schema escrito en ${resolve(out)}\n`)
  } else {
    io.stdout(text)
  }
  return 0
}

function cmdNew(args: readonly string[], io: CliIO): number {
  const [id, rest1] = takeOption(args, '--id')
  const [label, rest2] = takeOption(rest1, '--label')
  if (rest2.length > 0) {
    io.stderr(`ygg new: argumentos non recoñecidos: ${rest2.join(' ')}\n`)
    return 2
  }
  io.stdout(
    newDocumentJson({
      ...(id !== undefined && { id }),
      ...(label !== undefined && { label }),
    }),
  )
  return 0
}

/** Punto de entrada testable do CLI. Devolve o código de saída. */
export async function run(argv: readonly string[], io: CliIO): Promise<number> {
  const [command, ...rest] = argv
  switch (command) {
    case 'validate':
      return cmdValidate(rest, io)
    case 'layout':
      return cmdLayout(rest, io)
    case 'render':
      return cmdRender(rest, io)
    case 'schema':
      return cmdSchema(rest, io)
    case 'new':
      return cmdNew(rest, io)
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      io.stdout(USAGE)
      return command === undefined ? 2 : 0
    default:
      io.stderr(`ygg: comando descoñecido "${command}"\n\n${USAGE}`)
      return 2
  }
}
// ── FIN: cli ──
