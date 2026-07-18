import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const profile = process.argv[2]
const command = process.argv[3]

if (!profile || (command !== 'dev' && command !== 'build')) {
  throw new Error(
    'Usage: node scripts/run-local-profile.mjs <config-file> <dev|build>',
  )
}

const profilePath = resolve(root, profile)
if (!profilePath.startsWith(resolve(root, 'config'))) {
  throw new Error('Local profiles must be stored in the project config directory.')
}

const envText = await readFile(profilePath, 'utf8')
const localEnv = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=')
      if (separator < 1) throw new Error(`Invalid environment line: ${line}`)
      return [line.slice(0, separator), line.slice(separator + 1)]
    }),
)

const child = spawn(
  process.execPath,
  [resolve(root, 'node_modules/next/dist/bin/next'), command, '--webpack'],
  {
    cwd: root,
    env: { ...process.env, ...localEnv },
    stdio: 'inherit',
  },
)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
