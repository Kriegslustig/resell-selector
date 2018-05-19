// @flow

type ReactDOMRoot = Object
type ReactDOMNode = Object

export type Node = {|
  reactNode: ReactDOMNode,

  domNode: ?HTMLElement,
  textContent: string,

  query: (Selector) => ?Node,

  _wrap: (maybeNode: ?ReactDOMNode) => ?Node,

  _find: (fn: (ReactDOMNode) => boolean) => ?ReactDOMNode,
  find: (condition: (Node) => boolean) => ?Node,

  _findElement: (type: string) => ?ReactDOMNode,
  findElement: (type: string) => ?Node,

  waitFor: (Selector) => Promise<Node>,
|}

export type Selector = string
export type Select = {|
  fromRoot: (HTMLElement) => Node,
  mkNode: (ReactDOMNode) => Node,
  waitFor: <A>(condition: () => ?A) => Promise<A>,
|}

const mkModule = (): Select => {
  const fromRoot = (root: HTMLElement): Node =>
    mkNode((root: any)._reactRootContainer._internalRoot.current)

  const waitFor = <A>(
    cond: () => ?A,
    timeout: number = 5000,
    interval: number = 100
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
        const maybeNode = node._find((node) =>
          HTMLElement.prototype.isPrototypeOf(
            node.stateNode
          )
        )
        return maybeNode
          ? maybeNode.stateNode
          : maybeNode
      },

      get textContent() {
        const _getText = (node) => {
          if (!node) {
            return ''
          } else if (node.stateNode) {
            return node.stateNode.textContent || ''
          } else if (node.reactNode === node) {
            return _getText(node.child)
          } else {
            return (
              _getText(node.child) +
              _getText(node.sibling)
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
            .map((prop) => prop.split('='))
            .map(([ key, value ]) => [ key, JSON.parse(value) ])

          checks.push(
            (node: ReactDOMNode) =>
              (!type || (
                node.type === type ||
                (node.type && node.type.displayName === type)
              )) &&
              (!props || (
                props.every(([key, value]) => node.memoizedProps[key] === value)
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

      _find: (fn: (ReactDOMNode) => boolean): ?ReactDOMNode => {
        const find = (node) => {
          if (!node) return undefined
          if (fn(node)) {
            return node
          }
          return find(node.child) || find(node.sibling)
        }

        return find(node.reactNode.child)
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

      waitFor: (query: string) => {
        return waitFor(() => node.query(query))
      },
    }

    return node
  }

  return { fromRoot, mkNode, waitFor }
}

export default mkModule
