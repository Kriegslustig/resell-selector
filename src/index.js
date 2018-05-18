// @flow

type ReactDOMRoot = Object
type ReactDOMNode = Object

const mkModule = () => {
  const fromRoot = (root: ReactDOMRoot) =>
    new Node(root._reactRootContainer._internalRoot.current)

  const waitFor = (
    cond: () => mixed,
    timeout: number = 5000,
    interval: number = 100
  ) =>
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

  class Node {
    constructor(node: ReactDOMNode) {
      this.node = node
    }

    node: ReactDOMNode

    get domNode() {
      const maybeNode = this._find((node) =>
        HTMLElement.prototype.isPrototypeOf(
          node.stateNode
        )
      )
      return maybeNode
        ? maybeNode.stateNode
        : maybeNode
    }

    get textContent() {
      const _getText = (node) => {
        if (!node) {
          return ''
        } else if (node.stateNode) {
          return node.stateNode.textContent || ''
        } else if (this.node === node) {
          return _getText(node.child)
        } else {
          return (
            _getText(node.child) +
            _getText(node.sibling)
          )
        }
      }

      return _getText(this.node)
    }

    query(selector: string) {
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

        const node = new Node(rawNode)
        if (_checks.length === 0) return node
        const [currentCheck, ...newChecks] = _checks
        const foundNode = node._find(currentCheck)
        return query(foundNode, newChecks)
      }

      return query(this.node, checks)
    }

    _wrap(maybeNode: ?ReactDOMNode): ?Node {
      return maybeNode
        ? new Node(maybeNode)
        : maybeNode
    }

    find(fn: (Node) => boolean): ?Node {
      return this._wrap(this._find(fn))
    }

    _find(fn: (ReactDOMNode) => boolean): ?ReactDOMNode {
      const find = (node) => {
        if (!node) return undefined
        if (fn(node)) {
          return node
        }
        return find(node.child) || find(node.sibling)
      }

      return find(this.node.child)
    }

    findElement(type: string) {
      return this._wrap(this._findElement(type))
    }

    _findElement(type: string): ?ReactDOMNode {
      return this._find((node) => !!(
        node.type === type ||
        (node.type && node.type.displayName === type)
      ))
    }

    waitFor(query: string) {
      return waitFor(() => this.query(query))
    }
  }

  return { fromRoot, Node, waitFor }
}

export default mkModule
