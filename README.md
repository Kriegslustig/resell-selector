# Resell Select

Query a react component tree using CSS selectors.

WARNING: Currently this relies on internal React properties, so it's *very* unstable.

## Usage

```
const select = mkSelect()
const root = document.getElementById('root') // the root node where your react instance is mounted to
const node = select.fromRoot(root)

node.query('SomeComponent[property="something"]')
```
