/**
 * Created by smallKugua on 2018/7/15.
 */
const cheerio = require('cheerio');
const superagent = require('superagent');
const Throttle = require('superagent-throttle')
const fs = require('fs');
let Ut = require('./saveImg');
let db = require('../../db/db.js');
let throttle = new Throttle({
    active: true,     // set false to pause queue
    rate: 6,          // how many requests can be sent every `ratePer`
    ratePer: 10000,   // number of ms in which `rate` requests may be sent
    concurrent: 2     // how many requests can be sent concurrently
})
    .on('sent', (request) => {
    }) // sent a request
    .on('received', (request) => {
        console.log('开始请求' + request.url);
        Page.sendClient({
            type: 'detail',
            msg: '开始请求' + request.url
        })
    })
    .on('drained', (request) => {
        "use strict";
        console.log('请求完成');

    });

let Page = {
    IO: null,
    pageNum: 0,
    imgTotal: 0,
	URL: 'http://www.rosimm8.com',
    imgList: [],
    /*
    * 传输类型
    * detail 请求详情
    * page 子页面数量
    * img 图片数量
    * err 错误
    * done 完成
    */
    sendClient(type){
        Page.IO.emit('progress', type);
    },
    init(io, msg){
		const reptileUrl = "/rosimm/";
        this.IO = io;
		db.search({
			isDownload: undefined
		}).then(list =>{
			this.imgList = list.filter(item =>{
				return /http/g.test(item.url);
			});
			if(this.imgList.length){
				this.imgTotal  = this.imgList.length;
				/*this.imgList.unshift({
					id: 'testadd',
					url: 'http://www.rosimm8.com//uploads/allimg/181706/0211.jpg'
				})*/
				this.download(true);
			}else{
				if (!msg) {
					this.sendClient({
						type: 'err',
						msg: '请输入关键词'
					})
				} else {
					superagent.get(this.URL + reptileUrl).timeout({
						response: 5000,  // Wait 5 seconds for the server to start sending,
						deadline: 60000, // but allow 1 minute for the file to finish loading.
					}).use(throttle.plugin()).end((err, res) => {
						// 抛错拦截
						if (err) {
							if(err.timeout){
								this.sendClient({
									type: 'err',
									msg: '请求超时'
								});
							}
							console.log(err)
							return;
						}
						let $ = cheerio.load(res.text);
						let data = [];
						// 下面就是和jQuery一样获取元素，遍历，组装我们需要数据，添加到数组里面
						$('a.thumbnail').each(function (i, elem) {
							let _this = $(elem);
							data.push({
								title: _this.find('img').attr('alt'),
								href: _this.attr('href'),
								pageIndex: 1
							});
						});
						this.pageNum = data.length;
						this.sendClient({
							type: 'page',
							msg: this.pageNum
						});
						//let tests = data.slice(0,1);
						this.getSonPage(data);
					});
				}
			}
		});
    },
    clearData(){
        this.pageNum = 0;
        this.imgList = [];
        //this.IO.close();
    },
    download(ignoreSave){
        let self = this,
            finishNum = 0,
            done = () => {
                self.sendClient({
                    type: 'detail',
                    msg: '下载图片完成'
                });
                self.sendClient({
                    type: 'done',
                    msg: 'success'
                });
                self.clearData.call(self);
            },
            downloadSigle = ()=>{
                if(this.imgList.length){
                    let item = this.imgList.shift();
                    Ut.downImg(item).then(result => {
                        self.sendClient(result);
                        finishNum++;
                        self.sendClient({
                            type: 'img',
                            total: self.imgTotal,
                            num: finishNum
                        });
                        downloadSigle();
                    }).catch(err =>{
                        self.sendClient(err);
                        downloadSigle();
                    });
                }else{
                    done();
                }

            }
        self.sendClient({
            type: 'detail',
            msg: '开始下载图片'
        });
		if(ignoreSave){
			downloadSigle();
		}else{
			Ut.saveUrl(this.imgList).then(result =>{
				downloadSigle();
			});
		}
    },
    getSonPage(list){
        let self = this,
            finishNum = 0,
            done = () => {
				self.download.call(self);
            };
        if(!list.length){
            self.sendClient({
                type: 'err',
                msg: '搜索内容为空,请换个关键词重试'
            });
            self.sendClient({
                type: 'done',
                msg: ''
            });
            console.log('执行完成');
            return;
        }
		let exec = () =>{
			if(list.length){
				let item = list.shift();
				finishNum++;
				this.getPagination(item, exec);
			}else{
				done();
			}
		};
		exec();
    },
	getPagination(item,done){
		let self = this,
			url = item.href;
		superagent.get(url).timeout({
			response: 8000,
			deadline: 60000,
		}).use(throttle.plugin()).end((err, res) => {
			if (err) {
				if(err.timeout){
					this.sendClient({
						type: 'detail',
						msg: `请求${url}超时`
					});
				}
				return ;
			}
			let $ = cheerio.load(res.text),
				imgs = $('.article-content img');
			let total = $('.pageinfo strong').text();
			total = total.match(/\d+/)[0];
			item.total = total;
			imgs.each((i, elem) => {
				let _this = $(elem),
					obj = {
						url: self.URL + _this.attr('src'),
						id: new Date().getTime() + ''
					};
				obj.url && self.imgList.push(obj);
			});
			self.imgTotal = self.imgList.length;
			self.sendClient({
				type: 'img',
				total: self.imgTotal,
				num: 0
			});
			if(item.pageIndex < item.total){
				item.pageIndex++;
				item.href = item.href.replace(/(\d+)(_?\d*).html/,'$1'+ `_${item.pageIndex}.html`);
				this.getPagination(item, done);
			}else{
				done()
			}
		});
	}
};
module.exports = Page;