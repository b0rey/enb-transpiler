# enb-transpiler
An ENB tech which transpiles javascript files with ES6 and higher syntax to the ES5 syntax javascript using babel

## Install
```
    npm install --save-dev enb-transpiler
```

## Usage
```javascript
// Code in a file system before build:
// blocks/
// ├── block.vanilla.js
// └── block.worker.js
//
// After build:
// bundle/
// └── bundle.js

const transpiler = require('enb-transpiler')
const FileProvideTech = require('enb/techs/file-provider')
const bemTechs = require('enb-bem-techs')

module.exports = function(config) {
config.node('bundle', function(node) {
    // get FileList
    node.addTechs([
      [FileProvideTech, { target: '?.bemdecl.js' }],
      [bemTechs.levels, levels: ['blocks']],
      [bemTechs.deps],
      [bemTechs.files]
    ])

    // build ?.js file
    node.addTech([transpiler, {
      target: '?.worker.js',
      sourceSuffixes: ['vanilla.js', 'worker.js'],
      chain: [
        'const global = { document: { createElement: () => ({}) } }',
        'ym',
        'const modules = global.modules',
        `self.APP_VERSION = '${version}'`,
        'source'
      ],
      params: techs.babel
    }])

    node.addTarget('?.worker.js')
  })
}
```

## License
See [LICENSE](/LICENSE) for details.