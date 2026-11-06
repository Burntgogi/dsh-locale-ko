import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { presentationFiles } from '../tools/presentation.mjs'

assert.equal(process.argv.length, 4, 'Usage: node desktop/make-asar.mjs <official app.asar> <new app.asar>')
const [, , input, output] = process.argv
const archive = readFileSync(input)
const headerSize = archive.readUInt32LE(4)
const jsonSize = archive.readUInt32LE(12)
assert.equal(archive.readUInt32LE(0), 4)
assert.equal(headerSize, 8 + Math.ceil(jsonSize / 4) * 4)
assert.equal(archive.readUInt32LE(8), headerSize - 4)
assert.ok(8 + headerSize <= archive.length)
const header = JSON.parse(archive.toString('utf8', 16, 16 + jsonSize))
const data = archive.subarray(8 + headerSize)

function location(file) {
  const names = file.split('/')
  const name = names.pop()
  const parent = names.reduce((node, part) => node?.files?.[part], header)
  return { parent, name }
}

function read(file) {
  const { parent, name } = location(file)
  const item = parent?.files?.[name]
  if (item === undefined) return
  assert.ok(!item.unpacked && !item.link && typeof item.offset === 'string', file)
  const start = Number(item.offset)
  assert.ok(Number.isSafeInteger(start) && start >= 0 && start + item.size <= data.length, file)
  return data.toString('utf8', start, start + item.size)
}

const hash = value => createHash('sha256').update(value).digest('hex')
const mainFile = 'lib/main.js'
const main = read(mainFile)
assert.equal(JSON.parse(read('package.json')).version, '0.2.2-rc.1')
assert.equal(hash(main), 'f42ed25b0b844a63e515a3aff93dee89b781dae7fcbbbbfc93e04d95ad399ec1',
  'Expected the original Windows 0.2.2-rc.1 Electron entry point')

const ko = JSON.parse(readFileSync(new URL('./ko.json', import.meta.url), 'utf8'))
const source = main.slice(main.indexOf('const en = {\n\tcliCommandMenu:'), main.indexOf('const dictionaries = {'))
const en = Object.fromEntries([...source.matchAll(/^\t([a-zA-Z]\w*): ("(?:\\.|[^"\\])*"),?$/gm)]
  .map(([, key, value]) => [key, JSON.parse(value)]))
assert.equal(Object.keys(en).length, 174)
assert.deepEqual(Object.keys(ko).sort(), Object.keys(en).sort())
const variables = value => [...value.matchAll(/\{([^{}]+)\}/g)].map(match => match[1]).sort()
for (const key of Object.keys(en)) assert.deepEqual(variables(ko[key]), variables(en[key]), key)

const marker = 'const dictionaries = {\n\ten,'
function addKoreanDictionary(source, file) {
  assert.equal(source.split(marker).length, 2, file)
  return source.replace(marker, () => marker + '\n\tko: ' + JSON.stringify(ko) + ',')
}

const systemLanguages = 'const systemLanguages = app.getPreferredSystemLanguages();'
assert.equal(main.split(systemLanguages).length, 2)
const patchedMain = addKoreanDictionary(main, mainFile)
  .replace(systemLanguages, 'const systemLanguages = ["ko", ...app.getPreferredSystemLanguages()];')
const moduleRoot = 'dsh/node_modules/'
const patches = new Map([[mainFile, patchedMain]])
for (const [file, expectedHash] of [
  ['lib/preload-app.cjs', 'd6126b3555fcb679f79922c23976025ab260a08f98bc2d20984e112ded397b96'],
  ['lib/preload-welcome.cjs', '07769d8837dfb5eaed21cf111d6304771761f8715f83317d8aa1cd110035c51b'],
]) {
  const source = read(file)
  assert.equal(hash(source), expectedHash, file)
  patches.set(file, addKoreanDictionary(source, file))
}
for (const [file, content] of presentationFiles(file => read(moduleRoot + file))) {
  patches.set(moduleRoot + file, content)
}

const additions = []
let offset = data.length
for (const [file, content] of patches) {
  const { parent, name } = location(file)
  assert.ok(parent?.files, file)
  const body = Buffer.from(content)
  const blockSize = 4 * 1024 * 1024
  const blocks = []
  for (let start = 0; start < body.length; start += blockSize) {
    blocks.push(hash(body.subarray(start, start + blockSize)))
  }
  parent.files[name] = {
    size: body.length, offset: String(offset),
    integrity: { algorithm: 'SHA256', hash: hash(body), blockSize, blocks },
  }
  additions.push(body)
  offset += body.length
}

const newJson = Buffer.from(JSON.stringify(header))
const paddedJson = Math.ceil(newJson.length / 4) * 4
const prefix = Buffer.alloc(16 + paddedJson)
prefix.writeUInt32LE(4, 0)
prefix.writeUInt32LE(8 + paddedJson, 4)
prefix.writeUInt32LE(4 + paddedJson, 8)
prefix.writeUInt32LE(newJson.length, 12)
newJson.copy(prefix, 16)
const fd = openSync(output, 'wx')
try {
  for (const piece of [prefix, data, ...additions]) writeFileSync(fd, piece)
} finally {
  closeSync(fd)
}
console.log(`Localized RC1 archive written with ${Object.keys(ko).length} native strings in 3 shell modules and ${patches.size - 3} package resources.`)
