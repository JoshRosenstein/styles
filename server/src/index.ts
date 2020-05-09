import defaultStyles from '@dash-ui/styles'

type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<
  infer ElementType
>
  ? ElementType
  : never

export interface StylesResult {
  css: string
  names: string[]
}

export interface CreateStylesOptions {
  clearCache?: boolean
}

export const createStylesFromCache = (
  styles = defaultStyles,
  options: CreateStylesOptions = {}
): StylesResult => {
  // createStylesFromCache() is unsafe in asynchronous render environments
  const {clearCache = true} = options
  const {dash} = styles
  const styleCache = dash.stylisCache
  const names = new Set([
    ...Object.keys(styles.dash.variablesCache),
    ...Object.keys(dash.globalCache),
    ...Object.keys(dash.insertCache),
  ])
  let css = ''

  for (const name of names) css += styleCache[name]

  if (clearCache) dash.clear()
  return {names: [...names], css}
}

export const createStyleTagFromCache = (
  styles = defaultStyles,
  options: CreateStylesOptions = {}
): string => {
  // createStyleTagFromCache() is unsafe in asynchronous render environments
  const {css, names} = createStylesFromCache(styles, options)
  const nonceString = styles.dash.sheet.nonce
    ? ` nonce="${styles.dash.sheet.nonce}"`
    : ''

  return `<style data-dash="${names.join(' ')}" data-cache="${
    styles.dash.key
  }"${nonceString}>${css}</style>`
}

export interface WriteStylesOptions {
  name?: string
  hash?: (string: string) => string
  clearCache?: boolean
}

export interface WriteStylesResult {
  filename: string
  name: string
  path: string
  styles: string
}

export const writeStylesFromCache = async (
  outputPath = '',
  styles = defaultStyles,
  options?: WriteStylesOptions
): Promise<WriteStylesResult> => {
  // requiring in here prevents webpack errors in stuff like Next.js apps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path')
  styles = styles || defaultStyles
  // eslint-disable-next-line
  let {name, hash = styles.dash.hash, clearCache = true} = options || {}
  const stylesString = createStylesFromCache(styles, {clearCache}).css
  name = `${name || styles.dash.key + '-' + hash(stylesString) + '.css'}`
  const filename = path.join(outputPath, name)
  await fs.promises.writeFile(filename, stylesString)
  return {filename, name, path: outputPath, styles: stylesString}
}

export const createStylesFromString = (
  string: string,
  styles = defaultStyles,
  options: CreateStylesOptions = {}
): StylesResult => {
  const {clearCache = true} = options
  const {dash} = styles
  const styleCache = dash.stylisCache
  const names = new Set([
    ...Object.keys(styles.dash.variablesCache),
    ...Object.keys(styles.dash.globalCache),
  ])
  let css = ''

  for (let name of names) css += styleCache[name]

  for (const [, name] of string.matchAll(
    new RegExp(`["\\s'=]${dash.key}-([A-Za-z0-9]+)`, 'g')
  )) {
    if (!names.has(name)) {
      css += styleCache[name] || ''
      names.add(name)
    }
  }

  if (clearCache) dash.clear()
  return {names: [...names], css}
}

export const createStyleTagFromString = (
  string: string,
  styles = defaultStyles,
  options: CreateStylesOptions = {}
): string => {
  const {css, names} = createStylesFromString(string, styles, options)
  const nonceString = styles.dash.sheet.nonce
    ? ` nonce="${styles.dash.sheet.nonce}"`
    : ''

  return `<style data-dash="${names.join(' ')}" data-cache="${
    styles.dash.key
  }"${nonceString}>${css}</style>`
}

export const writeStylesFromString = async (
  string: string,
  outputPath = '',
  styles = defaultStyles,
  options?: WriteStylesOptions
): Promise<WriteStylesResult> => {
  // requiring in here prevents webpack errors in stuff like Next.js apps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path')
  styles = styles || defaultStyles
  let {name, hash = styles.dash.hash, clearCache = true} = options || {}
  const stylesString = createStylesFromString(string, styles, {clearCache}).css
  name = `${name || styles.dash.key + '-' + hash(stylesString) + '.css'}`
  const filename = path.join(outputPath, name)
  await fs.promises.writeFile(filename, stylesString)
  return {filename, name, path: outputPath, styles: stylesString}
}
