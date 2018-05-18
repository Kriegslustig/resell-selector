module.exports = {
  use: [
    ['@neutrinojs/library', {
      name: 'resell-select',
      target: 'node',
      babel: {
        presets: [ 'flow' ],
      },
    }],
    '@neutrinojs/jest',
  ]
}
