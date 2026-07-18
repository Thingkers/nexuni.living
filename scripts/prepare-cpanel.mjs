import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const standalone = resolve(root, '.next/standalone')
const staticSource = resolve(root, '.next/static')
const publicSource = resolve(root, 'public')

await access(resolve(standalone, 'server.js'), constants.R_OK).catch(() => {
  throw new Error('Standalone build not found. Run `npm run build` first.')
})

await rm(resolve(standalone, 'public'), { recursive: true, force: true })
await rm(resolve(standalone, '.next/static'), { recursive: true, force: true })

await mkdir(resolve(standalone, '.next'), { recursive: true })
await cp(publicSource, resolve(standalone, 'public'), { recursive: true })
await cp(staticSource, resolve(standalone, '.next/static'), { recursive: true })

await mkdir(resolve(standalone, 'tmp'), { recursive: true })
await writeFile(
  resolve(standalone, 'DEPLOYMENT.txt'),
  [
    'nexUni.living cPanel deployment artifact',
    `Prepared: ${new Date().toISOString()}`,
    'Startup file: server.js',
    'Required runtime: Node.js >=20.9.0',
    '',
  ].join('\n'),
)

console.log(`cPanel artifact prepared at ${standalone}`)
