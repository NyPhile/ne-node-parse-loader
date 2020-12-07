# ne-node-parse-loader

🏉Webpack SSR parse loader for netease

一个简单的Webpack loader，用来模拟文章页服务端渲染效果，在文章页项目中使用。

## 支持语法

1. <% %> 会执行里面的 js 代码
2. <%= %> or {{}} 代表输出内容
3. <%- %> 会进行 html 的转义(在 html 里直接输出 html 字符串)
4. <%# %> 的内容不进行处理(防止服务器端渲染客户端的语法)
5. <%@ %> 会读取中间的路径，只能是/开头的静态地址，会根据channels参数中的对应domain取线上文件，转码后插入对应位置。404则插入注释，注释内提示出错位置。

注意

1. 闭合的<%标签内不能嵌套 - <% <% %> %>是不会解析里面的语法.
2. 页面上的变量必须使用 data.,否则会报错

## 设置

请在dev模式中使用！

```js
// webpack.dev.config.js

const articleData = {"resultcode":200,"msg":null,"data":{"pageSize":1,"del":0,"source":"网易跟贴","body":"<p>滴滴滴！跟贴局要发车啦！</p><p class=\"f_center\"><img alt=\"发车啦！跟贴老司机速来定制车贴！\" src=\"http://cms-bucket.ws.126.net/2019/09/02/1f5b2156b9c04ba8a75f6e6e67fd6bde.jpeg?imageView&amp;thumbnail=550x0\" /><br  /></p><p>速来跟贴区参与活动吧~~~~</p><p><!--#include virtual=\"/special/0030ad/newpostad2.html\"-->","userid":"shihuan","media_url":"#","source_url":"#","topicid":"00307VL1","stitle":null,"boardid":"tie_bbs","replaceKeywordCount":5,"mtitle":null,"processPageData":"true","source_pic":"0030","duty_editor":"施欢_NY3461","modelid":"0030post1301_ad","author":"","info3g":null,"adstr":"<!--#include virtual=\"/special/0030ad/newpostad2.html\"-->","iscomment":"y","quality":80,"otitle":"","status":0,"hismod":false,"originalflag":0,"postid":"EO2G7Q2S00307VL1","title":"发车啦！跟贴老司机速来定制你的专属车贴！","pcommentid":"EO2G7Q2S00307VL1","newsid":null,"nickname":"施欢","digest":"","navtopicid":null,"statement":"","commentid":"EO2G7Q2S00307VL1","exe_editor":"王晓易_NE0011","hasad":true,"ptime":1567390283000,"setAdstr":false,"userinfo":null,"view_name":"网易跟贴","createtime":1567390555000,"statementtype":0,"docid":"EO2G7Q2S00307VL1","dkeys":"车贴,跟贴,老司机","hideAd":false,"url":"http://tie.163.com/gt/19/0902/10/EO2G7Q2S00307VL1.html","realname":null,"relatekey":"","buloid":"","sdigest":null,"photosetCovers":"","cnavbar":null}}

const channels = [
  {
    "channelid": "0001",
    "label": "新闻",
    "value": "news"
  }
]

module: {
  rules: [{
    test: /\.html?$/,
    use: [
      {
        loader: 'html-loader' // Used to output as html
      },
      {
        loader: 'ne-node-parse',
        options: {
          data: articleData.data,
          // url is supported too, like: data: 'https://news.163.com/19/0902/16/EO350JR40001982U.html',
          channels: channels
        }
      }
    ]
  }]
}
```

## CHANGELOG

### [0.0.2] - 2019-10-18
#### add
- data字段增加对文章页旧url的支持

### [0.0.3] - 2020-12-07
#### add
- 设置encoding: null，以防转码失败
