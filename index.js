const loaderUtils = require('loader-utils')
const path = require('path')
const parse = require('./lib/parse.js')

let data = null
let channels = []

module.exports = function(source) {
  let callback = this.async()
  const options = loaderUtils.getOptions(this)

  let { data = {}, channels = [] } = options

  if (!data) {
    return callback(null, source)
  }

  let parseRender = parse(source, true, channels)

  parseRender.then(parseFunction => {
    let output = parseFunction(data)
    callback(null, output)
  }).catch(e => {
    callback(e)
  })
}
