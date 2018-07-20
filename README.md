# nodeImg
### 主要功能
 - 利用node 爬虫 爬取并保存 多页 图片
 - 利用node socket.io 实现服务器和 浏览器通信，显示实时下载进度
 - 可浏览已下载的图片
### 主要技术
 - node  express express-cli
 - node 插件 [cheerio](https://github.com/cheeriojs/cheerio)  request   [superagent](http://visionmedia.github.io/superagent)  superagent-throttle ...
 
### 待完善
 - 异常处理
 
 ### Change Log
 - 保存图片的信息到本地数据库，方便下载错误，下次继续。 2018-7-20
 - 美化样式 ， 设置超时时间 ，优化下载详情 2018-7-18
 - 加入websoket通信 实时显示下载进度  2018-7-15
 - 项目初始化   2018-7-13