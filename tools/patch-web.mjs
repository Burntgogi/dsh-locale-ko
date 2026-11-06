import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { presentationFiles } from './presentation.mjs'

assert.equal(process.argv.length, 3, 'Usage: node tools/patch-web.mjs <RC1 node_modules directory>')
const modules = path.resolve(process.argv[2])
const read = file => {
  try {
    return readFileSync(path.join(modules, file), 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}
assert.equal(JSON.parse(read('@deepseek-ai/dsh/package.json')).version, '0.2.2-rc.1')
const files = presentationFiles(read)
for (const [file, content] of files) {
  const target = path.resolve(modules, file)
  assert.ok(target.startsWith(modules + path.sep), file)
  if (read(file) !== content) writeFileSync(target, content)
}
console.log(`RC1 display resources checked: ${files.size}`)
