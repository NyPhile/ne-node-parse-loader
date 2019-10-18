const loaderUtils = require('loader-utils')
const path = require('path')
const request = require('request')
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
    let matches = /https?:\/\/(.*[a-z0-9]*)\.163\.com(\/(?:\w+\/)?\d{2}\/\d{4}\/\d{2}\/([A-Z0-9]{16})(?:_\w+)?\.html)/.exec(data)
    if (typeof data === 'string' && matches) {
      let domain = matches[1]
      let uri = matches[2]
      let docid = matches[3]

      request({
        url: `http://cmsapi.ws.netease.com/articles/pageData/${docid}?productKey=0b34d08a430a93c5d0e1b425fcc29012&domain=${domain}.163.com&uri=${uri}`
      }, (err, response, body) => {
        if (err) {
          console.log('请求出错：')
          console.log(JSON.stringify(err))
          return false
        }

        body = JSON.parse(body)
        if (body.resultcode !== 200) {
          console.log('请求文章数据出错：')
          console.log(JSON.stringify(body))
          return false
        }

        let output = parseFunction(body.data)
        callback(null, output)
      })
    } else {
      let output = parseFunction(data)
      callback(null, output)
    }
  }).catch(e => {
    callback(e)
  })
}
