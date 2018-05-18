// @flow

import * as React from 'react'

import mkModule from '../'

global.requestAnimationFrame = (fn) => { setTimeout(fn) }
const { render } = require('react-dom')

const select = mkModule()

const setup = (children) => {
  const domRoot = document.createElement('div')
  render(
    React.createElement('div', {}, children),
    domRoot
  )

  const root = select.fromRoot(domRoot)
  const node = root.query('div')

  if (!node) throw new Error()

  return { root, domRoot, node }
}

describe('fromRoot', () => {
  it('should create a node from a DOM node', () => {
    const node = document.createElement('div')
    render(
      React.createElement('div', {}),
      node
    )

    const result = select.fromRoot(node)

    expect(result.node).toBeDefined()
  })
})

describe('Node.domNode', () => {
  it('should be the node behind a rendered element', () => {
    const { root, node, domRoot } = setup()
    expect(node.domNode).toBe(domRoot.children[0])
  })
})

describe('Node.textContent', () => {
  it('should return the text content of the children', () => {
    const { root, node, domRoot } = setup(
      React.createElement('p', {}, 'Hello World!')
    )

    expect(node.textContent).toBe('Hello World!')
  })
})

describe('Node.find', () => {
  it('should return the first child node that matches a condition', () => {
    const { root, node, domRoot } = setup(
      React.createElement('p', {}, 'Hello World!')
    )

    const child = node.find(() => true)
    if (!child) throw new Error()

    expect(child.textContent).toBe('Hello World!')
  })
})

describe('Node.waitFor', () => {
  it.skip('should ', () => {})
})
