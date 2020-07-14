import Stylis from '@dash-ui/stylis'
import type {Plugable, Plugin, Context} from '@dash-ui/stylis'
import {hash, safeHash, noop} from './utils'

//
// Dash cache
export function createDash(options: CreateDashOptions = {}): Dash {
  let {
    key = 'ui',
    nonce,
    speedy,
    hash: dashHash = hash,
    stylisPlugins,
    prefix = true,
    container = typeof document !== 'undefined' ? document.head : void 0,
  } = options
  const stylis = new Stylis({prefix})
  speedy =
    speedy === void 0 || speedy === null
      ? !(
          typeof process !== 'undefined' &&
          process.env.NODE_ENV !== 'production'
        )
      : speedy
  const inserted: Dash['inserted'] = new Set<string>()
  const cache: Dash['cache'] = new Map()
  const sheet = styleSheet({
    key,
    container,
    nonce,
    speedy,
  })

  if (typeof document !== 'undefined') {
    let nodes = document.querySelectorAll(`style[data-cache="${key}"]`)
    let i = 0
    let attr
    let node

    for (; i < nodes.length; i++) {
      /* istanbul ignore next */
      if ((attr = (node = nodes[i]).getAttribute(`data-dash`)) === null)
        continue
      attr.split(' ').map((id) => inserted.add(id))

      if (node.parentNode !== container && container)
        container.appendChild(node)
    }

    stylis.use(stylisPlugins)(ruleSheet as Plugin)
  }

  /* istanbul ignore next */
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    const commentStart = /\/\*/g
    const commentEnd = /\*\//g

    stylis.use((context, content) => {
      if (context === -1) {
        while (commentStart.test(content)) {
          commentEnd.lastIndex = commentStart.lastIndex

          /* istanbul ignore next */
          if (commentEnd.test(content)) {
            commentStart.lastIndex = commentEnd.lastIndex
            continue
          }

          throw new Error(
            'Your styles have an unterminated comment ("/*" without ' +
              'corresponding "*/").'
          )
        }

        commentStart.lastIndex = 0
      }
    })
  }

  return {
    key,
    sheet,
    sheets: new Map(),
    stylis,
    hash: safeHash(key, dashHash),
    insert(selector, name, styles, insertSheet) {
      if (inserted.has(name)) return
      inserted.add(name)
      Sheet.x = insertSheet || sheet
      if (typeof document !== 'undefined') {
        stylis(selector, styles)
      } else {
        cache.set(name, stylis(selector, styles))
      }
    },
    inserted,
    cache,
    clear: inserted.clear.bind(inserted),
  }
}

export interface CreateDashOptions {
  readonly key?: string
  readonly nonce?: string
  readonly hash?: typeof hash
  readonly stylisPlugins?: Plugable[]
  readonly prefix?:
    | boolean
    | ((key: string, value: any, context: any) => boolean)
  readonly container?: HTMLElement
  readonly speedy?: boolean
}

export type Dash = {
  readonly key: string
  readonly sheet: DashStyleSheet
  hash(string: string): string
  readonly stylis: typeof Stylis
  readonly cache: Map<string, string>
  insert(
    selector: string,
    name: string,
    styles: string,
    sheet?: DashStyleSheet
  ): void
  readonly inserted: Set<string>
  readonly sheets: Map<string, DashSheet>
  clear(): void
}

interface DashSheet {
  n: number
  sheet: DashStyleSheet
}

//
// Stylesheet
export function styleSheet(options: DashStyleSheetOptions): DashStyleSheet {
  // Based off emotion and glamor's StyleSheet
  const {key, container, nonce, speedy} = options
  const tags: HTMLStyleElement[] = []
  let size = 0

  return {
    // include all keys so it the object can be cloned via styleSheet(sheet)
    key,
    nonce,
    container,
    speedy,
    insert(rule) {
      // the max length is how many rules we have per style tag, it's 65000 in
      // speedy mode it's 1 in dev because we insert source maps that map a
      // single rule to a location and you can only have one source map per
      // style tag
      if (size % (speedy ? 65000 : 1) === 0) {
        const tag = document.createElement('style')
        tag.setAttribute(`data-dash`, key)
        if (nonce !== void 0) tag.setAttribute('nonce', nonce)
        tag.appendChild(document.createTextNode(''))
        container &&
          container.insertBefore(
            tag,
            tags.length === 0 ? null : tags[tags.length - 1].nextSibling
          )
        tags.push(tag)
      }

      const tag = tags[tags.length - 1]

      if (!speedy) {
        tag.appendChild(document.createTextNode(rule))
      } else {
        let sheet: StyleSheet | CSSStyleSheet | null = tag.sheet
        let i = 0
        /* istanbul ignore next */
        if (!sheet) {
          // this weirdness brought to you by firefox
          const {styleSheets} = document
          for (; i < styleSheets.length; i++)
            if (styleSheets[i].ownerNode === tag) {
              sheet = styleSheets[i]
              break
            }
        }

        /* istanbul ignore next */
        try {
          // this is a really hot path
          // we check the second character first because having "i"
          // as the second character will happen less often than
          // having "@" as the first character
          const isImportRule =
            rule.charCodeAt(1) === 105 && rule.charCodeAt(0) === 64
          // this is the ultrafast version, works across browsers
          // the big drawback is that the css won't be editable in devtools
          ;(sheet as CSSStyleSheet).insertRule(
            rule,
            // we need to insert @import rules before anything else
            // otherwise there will be an error
            // technically this means that the @import rules will
            // _usually_(not always since there could be multiple style tags)
            // be the first ones in prod and generally later in dev
            // this shouldn't really matter in the real world though
            // @import is generally only used for font faces from google fonts
            // and etc. so while this could be technically correct then it
            // would be slower and larger for a tiny bit of correctness that
            // won't matter in the real world
            isImportRule ? 0 : (sheet as CSSStyleSheet).cssRules.length
          )
        } catch (e) {
          if (
            typeof process !== 'undefined' &&
            process.env.NODE_ENV !== 'production'
          ) {
            console.warn(
              `There was a problem inserting the following rule: "${rule}"`,
              e
            )
          }
        }
      }

      size++
    },
    flush() {
      tags.forEach((tag) => (tag.parentNode as HTMLElement).removeChild(tag))
      tags.length = 0
      size = 0
    },
  }
}

export interface DashStyleSheetOptions {
  readonly key: string
  readonly container?: HTMLElement
  readonly nonce?: string
  readonly speedy: boolean
}

export interface DashStyleSheet {
  // include all keys so it the object can be cloned via styleSheet(sheet)
  readonly key: string
  readonly nonce?: string
  readonly container?: HTMLElement
  readonly speedy: boolean
  insert(rule: string): void
  flush(): void
}

//
// Stylis plugins
const RULE_DELIMITER = '/*|*/'
const RULE_NEEDLE = RULE_DELIMITER + '}'

function ruleSheet(
  // https://github.com/thysultan/stylis.js/tree/master/plugins/rule-sheet
  context: Context,
  content: any,
  selectors: string[],
  parents: string[],
  line: number,
  column: number,
  length: number,
  ns: number,
  depth: number,
  at: number
): string | undefined {
  // property
  if (context === 1) {
    if (content.charCodeAt(0) === 64) {
      // @import
      Sheet.x.insert(content + ';')
      return ''
    }
  }
  // selector
  else if (context === 2) {
    if (ns === 0) return content + RULE_DELIMITER
  }
  // at-rule
  else if (context === 3) {
    // @font-face, @page
    if (ns === 102 || ns === 112) {
      Sheet.x.insert(selectors[0] + content)
      return ''
    } else {
      /* istanbul ignore next */
      return content + (at === 0 ? RULE_DELIMITER : '')
    }
  } else if (context === -2) {
    content.split(RULE_NEEDLE).forEach((block: string) => {
      block && Sheet.x.insert(block + '}')
    })
  }
}

const Sheet: {
  x: {
    insert(rule: string): void
  }
} = {
  x: {
    insert: noop,
  },
}
