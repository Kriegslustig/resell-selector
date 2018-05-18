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

    query(...path: Array<string>) {
      const query = (rawNode, _path) => {
        if (!rawNode) return rawNode

        const node = new Node(rawNode)
        if (_path.length === 0) return node
        const [currentName, ...newPath] = _path
        const foundNode = node._findElement(currentName)
        return query(foundNode, newPath)
      }

      return query(this.node, path)
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

      return find(this.node)
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

    waitFor(...query: Array<string>) {
      return waitFor(() => this.query(...query))
    }
  }

  return { fromRoot, Node, waitFor }
}

export default mkModule
