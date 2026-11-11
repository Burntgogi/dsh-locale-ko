import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'

const effortFile = '@deepseek-ai/dsh-client-ui-model-selection/lib/client.js'
const sandboxFile = '@deepseek-ai/dsh-sandbox/lib/index.js'
const bootFile = '@deepseek-ai/dsh-app-boot/lib/index.js'
const catalogFile = '@deepseek-ai/dsh-official-bundles/lib/index.js'
const managerFile = '@deepseek-ai/dsh-plugin-manager/lib/index.js'
const metadata = JSON.parse(readFileSync(new URL('../official-metadata-ko.json', import.meta.url), 'utf8'))

const moduleMetadata = {
  'cordis:include': {
    title: { en: 'cordis:include', ko: 'Cordis 설정 포함' },
  },
  '@deepseek-ai/cordis-plugin-include': {
    title: { en: '@deepseek-ai/cordis-plugin-include', ko: 'Cordis 설정 포함' },
    description: { en: 'Include files in cordis configurations', ko: 'Cordis 구성에 다른 설정 파일을 포함합니다.' },
  },
  '@deepseek-ai/dsh-plugin-market/tools': {
    title: { en: '@deepseek-ai/dsh-plugin-market/tools', ko: '플러그인 인덱스 조회 도구' },
  },
  '@deepseek-ai/dsh-tool-subagent-control/list-agents': {
    title: { en: '@deepseek-ai/dsh-tool-subagent-control/list-agents', ko: '서브에이전트 목록' },
  },
  '@deepseek-ai/dsh-experimental-liveshare/viewer-declarations': {
    title: { en: '@deepseek-ai/dsh-experimental-liveshare/viewer-declarations', ko: '공유 뷰어 선언' },
  },
}

const catalogKorean = {
  '@deepseek-ai/dsh-subagent-claude-code': {
    title: 'Claude Code 서브에이전트',
    description: 'Claude Code 자체의 인증과 설정을 사용해 작업 하나를 위임합니다.',
  },
  '@deepseek-ai/dsh-subagent-codex': {
    title: 'Codex 서브에이전트',
    description: 'Codex 자체의 인증과 설정을 사용해 작업 하나를 위임합니다.',
  },
}

const catalogReadmes = {
  codex: 'f5b54e6e5ca5ee781cc231a977ee2f7666c2865f7586c98ebf983e2347211169',
  'claude-code': 'e72a96700f99d3ed6b49144b57dd5582e2857d133685d5f405a5ef6231bcc582',
}

function replaceOnce(source, search, replacement) {
  assert.equal(source.split(search).length, 2, search)
  return source.replace(search, () => replacement)
}

function patchEffort(source) {
  if (source.includes('const localizedEffortName=')) return source
  const helper = 'const localizedEffortName=effort=>{const labels={off:["Off","끔"],minimal:["Minimal","최소"],low:["Low","낮음"],' +
    'medium:["Medium","보통"],high:["High","높음"],xhigh:["Extra High","매우 높음"],max:["Max","최대"]};const label=labels[effort.id];' +
    'return label&&effort.name.toLowerCase().replace(/[-_ ]/g,"")===label[0].toLowerCase().replace(/[-_ ]/g,"")' +
    '?resolveText({en:effort.name,ko:label[1]}):effort.name};' +
    'const selectedEffort=reasoning?.efforts.find(level=>level.id===effectiveEffort);const effortLabel='
  source = replaceOnce(source, 'const effortLabel=', helper)
  source = replaceOnce(source, 'reasoning.efforts.find(level=>level.id===effectiveEffort)?.name??effectiveEffort',
    '(selectedEffort?localizedEffortName(selectedEffort):effectiveEffort)')
  return replaceOnce(source, 'label:effort.name}))],[reasoning,t]);', 'label:localizedEffortName(effort)}))],[reasoning,t,resolveText]);')
}

function patchApproval(source) {
  if (source.includes('const koreanJustification =')) return source
  return replaceOnce(source, 'function escalationDisplayReason(mode, justification) {\n\treturn {', `function escalationDisplayReason(mode, justification) {
    const warning = "Profile changes persist across sessions; installed Host code runs outside the workspace sandbox.";
    const koreanJustification = justification.startsWith("plugin_manager ") && justification.endsWith(warning)
        ? justification.slice(0, -warning.length) + "프로필 변경은 다음 세션에도 유지됩니다. 설치된 호스트 코드는 작업공간 샌드박스 밖에서 실행됩니다."
        : justification;
    return {
        ko: \`이 작업을 \${mode} 권한으로 실행하도록 허용하시겠습니까? \${koreanJustification}\`,`)
}

function patchModuleMetadata(source) {
  const marker = 'const koreanModuleMetadata ='
  const signature = 'function readPluginMeta(specifier, parentURL) {'
  const originalSignature = 'function readPluginMetaWithoutKorean(specifier, parentURL) {'
  const declaration = marker + ' ' + JSON.stringify(moduleMetadata, null, 2) + ';\n'
  const wrapper = `${declaration}${signature}
\tconst metadata = readPluginMetaWithoutKorean(specifier, parentURL);
\tif (!Object.hasOwn(koreanModuleMetadata, specifier)) return metadata;
\tconst translations = koreanModuleMetadata[specifier];
\tconst localized = { ...metadata };
\tfor (const [field, translation] of Object.entries(translations)) {
\t\tconst original = metadata?.[field];
\t\tconst originalTranslations = typeof original === "string" ? { en: original } : original;
\t\tlocalized[field] = { ...translation, ...originalTranslations, ko: translation.ko };
\t}
\treturn localized;
}
`
  if (source.includes(originalSignature)) {
    return source.slice(0, source.indexOf(marker)) + wrapper + source.slice(source.indexOf(originalSignature))
  }
  if (source.includes(marker)) {
    const start = source.indexOf(marker)
    const end = source.indexOf(signature, start)
    assert.ok(end > start, signature)
    const legacy = '\n\tif (Object.hasOwn(koreanModuleMetadata, specifier)) return koreanModuleMetadata[specifier];'
    source = source.slice(0, start) + replaceOnce(source.slice(end), legacy, '')
  }
  return replaceOnce(source, signature, wrapper + originalSignature)
}

function patchOfficialCatalog(source) {
  if (source.includes('const koreanCatalogMetadata =')) return source
  const declaration = 'const OFFICIAL_ON_DEMAND_CATALOG = ['
  const begin = source.indexOf(declaration)
  // The array closes on its own line (`\n];`) or right after the last entry (`\n}];`).
  const close = /\n\}?\];/.exec(source.slice(begin))
  assert.ok(begin >= 0 && close, 'Official on-demand catalog')
  const end = begin + close.index + close[0].length - 3
  const entries = source.slice(begin, end)
  for (const name of Object.keys(catalogKorean)) {
    assert.ok(entries.includes('packageName: ' + JSON.stringify(name)), name)
  }
  const extra = `
const koreanCatalogMetadata = ${JSON.stringify(catalogKorean, null, 2)};
for (const { packageName, meta } of OFFICIAL_ON_DEMAND_CATALOG) {
  if (!Object.hasOwn(koreanCatalogMetadata, packageName)) continue;
  const { title, description } = koreanCatalogMetadata[packageName];
  meta.title.ko = title;
  meta.description.ko = description;
}`
  return source.slice(0, end + 3) + extra + source.slice(end + 3)
}

function patchCatalogReadmes(source) {
  const marker = 'const koreanCatalogReadmes ='
  const next = '\nfunction localizeCatalogReadme('
  const entries = Object.fromEntries(Object.entries(catalogReadmes).map(([name, hash]) => [
    '@deepseek-ai/dsh-subagent-' + name,
    {
      hash,
      markdown: readFileSync(new URL('../catalog-readmes/' + name + '.ko.md', import.meta.url), 'utf8')
        .replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/u, ''),
    },
  ]))
  const declaration = marker + ' ' + JSON.stringify(entries) + ';'
  const start = source.indexOf(marker)
  if (start !== -1) {
    const end = source.indexOf(next, start)
    assert.ok(end > start, next)
    return source.slice(0, start) + declaration + source.slice(end)
  }
  source = replaceOnce(source, 'import { randomUUID } from "node:crypto";',
    'import { createHash, randomUUID } from "node:crypto";')
  const anchor = '/**\n* Read a bundle\'s detail document in a display language.'
  source = replaceOnce(source, anchor, `${declaration}
function localizeCatalogReadme(bundle, languages, document) {
\tif (!languages.includes("ko") || document.origin !== "readme" || document.path !== "README.md") return document.markdown;
\tif (!Object.hasOwn(koreanCatalogReadmes, bundle.name)) return document.markdown;
\tconst translated = koreanCatalogReadmes[bundle.name];
\treturn createHash("sha256").update(document.markdown).digest("hex") === translated.hash
\t\t? translated.markdown : document.markdown;
}
${anchor}`)
  return replaceOnce(source, 'status: "found",\n\t\t...document\n\t};',
    'status: "found",\n\t\t...document,\n\t\tmarkdown: localizeCatalogReadme(bundle, languages, document)\n\t};')
}

function addKoreanDetails(result, read) {
  const previews = new URL('../previews/', import.meta.url)
  for (const name of readdirSync(previews)) {
    const pkg = '@deepseek-ai/' + name
    const english = read(pkg + '/locale/en.json')
    if (english === undefined) continue
    const originalDetail = JSON.parse(english).meta?.detail
    assert.ok(originalDetail === undefined || originalDetail === 'docs/DETAIL.md', pkg)
    const hasPreview = originalDetail === 'docs/DETAIL.md'
    assert.ok(read(pkg + '/' + (originalDetail ?? 'README.md')), pkg)
    const detail = hasPreview ? 'docs/DETAIL.ko.md' : 'README.ko.md'
    const locale = pkg + '/locale/ko.json'
    const korean = JSON.parse(result.get(locale) ?? read(locale) ?? '{}')
    korean.meta = { ...korean.meta, detail }
    result.set(locale, JSON.stringify(korean, null, 2) + '\n')
    result.set(pkg + '/' + detail, readFileSync(new URL(name + '/' + detail.split('/').at(-1), previews), 'utf8'))
    if (hasPreview) {
      result.set(pkg + '/docs/preview.ko.svg', readFileSync(new URL(name + '/preview.ko.svg', previews), 'utf8'))
    }
  }
}

// Web search and fetch providers declare their picker descriptions inline (en, zh, ...), outside any dictionary.
const providerDescriptions = {
  '@deepseek-ai/dsh-web-deepseek-api/lib/index.js': {
    "Can't reach intranet or local addresses. Incurs charges, paid by the account or API key chosen under Billing.":
      '인트라넷이나 로컬 주소에는 접근할 수 없습니다. 요금이 발생하며, 과금에서 선택한 계정이나 API 키로 청구됩니다.',
    'Incurs charges, paid by the account or API key chosen under Billing.':
      '요금이 발생하며, 과금에서 선택한 계정이나 API 키로 청구됩니다.',
  },
  '@deepseek-ai/dsh-web-fetch-http/lib/index.js': {
    'Free, and can reach intranet and local addresses. Does not support pages that need JavaScript or sign-in, or PDFs.':
      '무료이며 인트라넷과 로컬 주소에도 접근할 수 있습니다. JavaScript나 로그인이 필요한 페이지, PDF는 지원하지 않습니다.',
  },
  '@deepseek-ai/dsh-web-search-deepseek/lib/index.js': {
    'Slower, and every search uses extra model tokens. Requires a DeepSeek account or API key.':
      '느리고 검색할 때마다 모델 토큰을 추가로 씁니다. DeepSeek 계정이나 API 키가 필요합니다.',
  },
}

function patchProviderDescriptions(source, translations) {
  for (const [english, korean] of Object.entries(translations)) {
    const declaration = '\tdescription = {\n\t\t'
    const line = 'en: ' + JSON.stringify(english) + ','
    if (source.includes(declaration + 'ko: ' + JSON.stringify(korean) + ',\n\t\t' + line)) continue
    source = replaceOnce(source, declaration + line, declaration + 'ko: ' + JSON.stringify(korean) + ',\n\t\t' + line)
  }
  return source
}

export function presentationFiles(read) {
  const result = new Map([
    [effortFile, patchEffort(read(effortFile))],
    [sandboxFile, patchApproval(read(sandboxFile))],
    [bootFile, patchModuleMetadata(read(bootFile))],
    [catalogFile, patchOfficialCatalog(read(catalogFile))],
    [managerFile, patchCatalogReadmes(read(managerFile))],
    ...Object.entries(providerDescriptions).map(([file, translations]) => [file, patchProviderDescriptions(read(file), translations)]),
  ])
  for (const [file, translated] of Object.entries(metadata)) {
    if (read(file.replace(/ko\.json$/, 'en.json')) === undefined) continue
    const original = read(file)
    const dictionary = original === undefined ? {} : JSON.parse(original)
    result.set(file, JSON.stringify({ ...dictionary, meta: { ...dictionary.meta, ...translated.meta } }, null, 2) + '\n')
  }
  addKoreanDetails(result, read)
  return result
}
