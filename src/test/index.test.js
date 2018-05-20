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
  const node = select.mkNode(root.reactNode.child)

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

    expect(result.reactNode).toBeDefined()
  })
})

describe('Node.domNode', () => {
  it('should be the node behind a rendered element', () => {
    const { root, node, domRoot } = setup()
    expect(root.domNode).toBe(domRoot.children[0])
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

describe('Node.query', () => {
  const querySetup = () => {
  }

  [
    [
      'should select for display names',
      'div',
      1,
    ],
    [
      'should deeply search the children',
      'span',
      7,
    ],
    [
      'should search the children of a specified element',
      'section h1',
      6,
    ],
    [
      'should find elements with the specified props',
      '[id=4]',
      4
    ],
    [
      'should check for all given props',
      '[className="asdf",id=4]',
      4
    ],
    [
      'should check that an element type and its props match',
      'section[className="asdf"]',
      4
    ],
    [
      'should match props with spaces in them',
      '[children="dies das"]',
      3
    ],
    [
      'should match partial strings with the *= operator',
      '[children*="das"]',
      3
    ],
    [
      'should match the textContent of an element',
      'div[textContent*="das"]',
      1
    ],
  ].forEach(([ title, selector, expectedId ]) => {
    it(title, () => {
      const { node } = setup(
        React.createElement('div', { id: 1 },
          React.createElement('div', { id: 2 },
            React.createElement('p', { id: 3 },
              'dies das'
            ),
            React.createElement('span', { id: 7, className: 'asdf' }),
            React.createElement('section', { id: 4, className: 'asdf' },
              React.createElement('div', { id: 5 },
                React.createElement('h1', { id: 6 })
              )
            )
          )
        )
      )

      const result = node.query(selector)

      expect(result).toBeDefined()
      // $FlowFixMe
      expect(result.reactNode.memoizedProps.id).toBe(expectedId)
    })
  })
})
