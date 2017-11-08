const enb = require('enb')
const vfs = enb.asyncFs
const babel = require('babel-core')
const handlers = {
  /**
   * Reads source code of YModules.
   * @returns {Object} Path and content of YModules
   */
  ym: async () => {
    const path = require.resolve('ym')
    const contents = await vfs.read(path, 'utf-8').catch(console.log)
    return { path, contents }
  },
  /**
   * Reads node target files.
   * @param {String} mask Mask for target file
   * @returns {Object} Path and content of node target
   */
  target: async function (mask) {
    const target = this.node.unmaskTargetName(mask)
    await this.node.requireSources([target])

    const path = this.node.resolvePath(target)
    const contents = await vfs.read(path, 'utf8')
    return { path, contents }
  },
  /**
   * Reads source files.
   * @param {Object[]} files List of description for source files
   * @returns {Promise[]} List of path and content of node target
   */
  source: files => {
    return Promise.all(files.map(async ({ fullname }) => {
      const contents = await vfs.read(fullname, 'utf8')
      return { path: fullname, contents }
    }))
  }
}

/**
 * Transpiler
 *
 * @param {Object} options Options
 * @param {String} options.filesTarget='?.files' Path to a target with FileList {@link http://bit.ly/1GTUOj0}
 * @param {String} options.target='?.js' Path to compiled file.
 * @param {String[]} options.sourceSuffixes=['vanilla.js', 'js', 'browser.js'] Files with specified suffixes involved in the assembly.
 * @param {Object} option.params Babel options
 * @param {String[]} options.chain=['source'] List of sources for compiling file. Maybe any text or predetermined handler: 'ym', 'target', 'source'
 *
 * @example
 * // Code in a file system before build:
 * // blocks/
 * // ├── block.vanilla.js
 * // └── block.worker.js
 * // └── block.js
 * //
 * // After build:
 * // bundle/
 * // └── bundle.js
 *
 * const transpiler = require('enb-transpiler')
 * const FileProvideTech = require('enb/techs/file-provider')
 * const bemTechs = require('enb-bem-techs')
 *
 * module.exports = function(config) {
 *   config.node('bundle', function(node) {
 *     // get FileList
 *     node.addTechs([
 *       [FileProvideTech, { target: '?.bemdecl.js' }],
 *       [bemTechs.levels, levels: ['blocks']],
 *       [bemTechs.deps],
 *       [bemTechs.files]
 *     ])
 *
 *     // build ?.js file
 *     node.addTech([transpiler, {
 *       target: '?.worker.js',
 *       sourceSuffixes: ['vanilla.js', 'worker.js'],
 *       chain: [
 *         'const global = { document: { createElement: () => ({}) } }',
 *         'ym',
 *         'const modules = global.modules',
 *         `self.APP_VERSION = '${version}'`,
 *         'source'
 *       ],
 *       params: techs.babel
 *     }])
 *
 *     node.addTarget('?.worker.js')
 *   })
 * }
 */
module.exports = enb.buildFlow.create()
  .name('babel')
  .target('target', '?.js')
  .useFileList(['vanilla.js', 'js', 'browser.js'])
  .defineOption('chain', ['source'])
  .defineOption('params')
  .builder(async function (source) {
    let result = await Promise.all(this._chain.map(item => {
      let [name, args] = typeof item === 'string' ? [item] : item

      if (!handlers[name]) return { path: 'inline', contents: name }
      if (name === 'source') args = source

      return handlers[name].call(this, args)
    }))

    return this._transform(result)
  })
  .methods({
    /**
     * Transform source code through babel
     * @param {Object[]} list List of path and code
     * @returns {String} Transpiled code
     */
    _transform: function (list) {
      return list.reduce((file, source) => {
        if (Array.isArray(source)) {
          file += this._transform(source)
        } else {
          file += `/* begin: ${source.path} */\n`
          file += babel.transform(source.contents, this._params).code
          file += `/* end: ${source.path} */\n`
        }
        return file
      }, '')
    }
  })
  .createTech()
