import styles from './index'

describe('Usage', () => {
  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = ''
  })

  it('returns single class name', () => {
    const style = styles({
      flex: {display: 'flex'},
      block: {display: 'block'},
      inline: 'display: inline;'
    })

    expect(style('flex')).toMatchSnapshot()
    expect(style('flex', 'block', 'inline')).toMatchSnapshot()
    expect(style({flex: true, block: false, inline: true})).toMatchSnapshot()
  })

  it('returns empty string when falsy', () => {
    const style = styles({
      flex: {display: 'flex'},
    })

    let name = style(false)
    expect(typeof name).toBe('string')
    expect(name.length).toBe(0)

    name = style(false, null, undefined, 0, {flex: false})
    expect(typeof name).toBe('string')
    expect(name.length).toBe(0)
  })

  it('adds styles by order of definition when called', () => {
    const style = styles.configure({prefix: false})({
      inline: 'display: inline;',
      flex: {display: 'flex'},
      block: {display: 'block'},
    })

    style('flex', 'block', 'inline')

    for (let element of document.querySelectorAll(`style[data-dash]`)) {
      expect(element).toMatchSnapshot('flex, block, inline')
    }

    styles.cache.clear()
    styles.sheet.flush()
    style({flex: true, block: true, inline: true})

    for (let element of document.querySelectorAll(`style[data-dash]`)) {
      expect(element).toMatchSnapshot('flex, block, inline')
    }
  })

  it('supports internally nested styles w/ functions', () => {
    const style = styles.configure({prefix: false})({
      blue: style => `
        color: blue;
        ${style('red')} {
          color: purple;
        }
      `,
      red: 'color: red;',
    })

    style('blue')

    for (let element of document.querySelectorAll(`style[data-dash]`)) {
      expect(element).toMatchSnapshot(style('red'))
    }
  })
})
