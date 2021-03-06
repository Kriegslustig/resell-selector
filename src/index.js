// @flow

type ReactDOMRoot = Object
type ReactDOMNode = Object

export type Node = {|
  reactNode: ReactDOMNode,

  domNode: ?HTMLElement,
  textContent: string,

  query: (Selector) => ?Node,

  _wrap: (maybeNode: ?ReactDOMNode) => ?Node,

  _find: (
    fn: (ReactDOMNode) => boolean,
    options?: { includeParent: boolean, }
  ) => ?ReactDOMNode,
  find: (condition: (Node) => boolean) => ?Node,

  _findElement: (type: string) => ?ReactDOMNode,
  findElement: (type: string) => ?Node,

  waitFor: (
    Selector,
    timeout?: number,
    interval?: number,
  ) => Promise<Node>,
|}

export type Selector = string
export type Select = {|
  fromRoot: (HTMLElement) => Node,
  mkNode: (ReactDOMNode) => Node,
  waitFor: <A>(
    condition: () => ?A,
    timeout?: number,
    interval?: number,
  ) => Promise<A>,
|}

const mkModule = (): Select => {
  const fromRoot = (root: HTMLElement): Node => {
    const container = (root: any)._reactRootContainer
    const rootNode = container._internalRoot
      ? container._internalRoot.current
      : container.current
    return mkNode(rootNode)
  }

  const waitFor = <A>(
    cond: () => ?A,
    timeout: number = 5000,
    interval: number = 500
  ): Promise<A> =>
    new Promise((resolve, reject) => {
      const result = cond()
      if (result) {
        resolve(result)
      } else if ((timeout - interval) <= 0) {
        reject(new Error('waitFor timed out'))
      } else {
        setTimeout(() => {
          resolve(waitFor(cond, timeout - 100, interval))
        }, interval)
      }
    })

  const mkNode = (reactDomNode: ReactDOMNode): Node => {
    const node = {
      reactNode: reactDomNode,

      get domNode() {
        const maybeNode = node._find(
          (node) =>
            HTMLElement.prototype.isPrototypeOf(
              node.stateNode
            ),
          { includeParent: true }
        )
        return maybeNode
          ? maybeNode.stateNode
          : maybeNode
      },

      get textContent() {
        const _getText = (_node, isRoot = false) => {
          if (!_node) {
            return ''
          } else if (HTMLElement.prototype.isPrototypeOf(_node.stateNode)) {
            return _node.stateNode.textContent || ''
          } else if (node.reactNode === _node) {
            return _getText(_node.child)
          } else {
            return (
              _getText(_node.child) +
              _getText(_node.sibling)
            )
          }
        }

        return _getText(node.reactNode)
      },

      query: (selector: string) => {
        const checks = []
        // THE WORST WAY I FOUND TO DO THIS. 🤷‍♀️
        const exp = /(([^\[\s]+)(\[([^\]]*)\])|([^\[\s]+)|(\[([^\]]*)\]))/g

        let match = null
        while((match = exp.exec(selector)) !== null) {
          const rawProps = match[7] || match[4]
          const type = match[2] || match[5]
          const props = rawProps && rawProps.split(',')
            .map((prop) => {
              const [, key, operator, value] =
                /^([^*=]+)(\*=|=)(.*)$/.exec(prop)
              return [
                key,
                operator,
                JSON.parse(value),
              ]
            })

          checks.push(
            (node: ReactDOMNode) =>
              (!type || (
                node.type === type ||
                (node.type && node.type.displayName === type) ||
                (node.type && node.type.name === type)
              )) &&
              (!props || (
                props.every(([key, operator, wantedValue]) => {
                  const value = key === 'textContent'
                    ? mkNode(node).textContent
                    : node.memoizedProps[key]
                  if (operator === '=') {
                    return value === wantedValue
                  } else if (operator === '*=' && typeof value === 'string') {
                    return value.includes(wantedValue)
                  } else {
                    return false
                  }
                })
              ))
          )
        }

        const query = (rawNode, _checks) => {
          if (!rawNode) return rawNode

          const node = mkNode(rawNode)
          if (_checks.length === 0) return node
          const [currentCheck, ...newChecks] = _checks
          const foundNode = node._find(currentCheck)
          return query(foundNode, newChecks)
        }

        return query(node.reactNode, checks)
      },

      _wrap: (maybeNode: ?ReactDOMNode): ?Node => {
        return maybeNode
          ? mkNode(maybeNode)
          : maybeNode
      },

      find: (fn: (Node) => boolean): ?Node => {
        return node._wrap(node._find(fn))
      },

      _find: (
        fn: (ReactDOMNode) => boolean,
        { includeParent } = {}
      ): ?ReactDOMNode => {
        const visitedNodes = new WeakMap()
        const find = (node) => {
          if (!node) return undefined
          if (visitedNodes.has(node)) return undefined
          visitedNodes.set(node)
          if (fn(node)) {
            return node
          }
          return (
            find(node.child) ||
            find(node.sibling) ||
            find(node.alternate)
          )
        }

        return find(
          includeParent
            ? node.reactNode
            : node.reactNode.child
        )
      },

      findElement: (type: string) => {
        return node._wrap(node._findElement(type))
      },

      _findElement: (type: string): ?ReactDOMNode => {
        return node._find((node) => !!(
          node.type === type ||
          (node.type && node.type.displayName === type)
        ))
      },

      waitFor: (query: string, timeout, interval) => {
        return waitFor(
          () => node.query(query),
          timeout,
          interval
        )
      },
    }

    return node
  }

  return { fromRoot, mkNode, waitFor }
}

export default mkModule
