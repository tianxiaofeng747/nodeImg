/**
 * Created by smallKugua on 2018/7/15.
 */
const cheerio = require('cheerio');
const superagent = require('superagent');
const Throttle = require('superagent-throttle')
const fs = require('fs');
let Ut = require('./saveImg');

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
		//Page.conent(request , 'received');
	})
	.on('drained', (request) => {
		"use strict";
		console.log('请求完成');

	});

let Page = {
	IO: null,
	pageNum: 0,
	imgList: [],
	sendClient(data){
		Page.IO.emit('progress',data);
	},
	init(io, msg){
		const reptileUrl = "http://www.meisiguan.cc/?s=";
		this.IO = io;
		//this.IO.on('disconnect')
		if(!msg){
			this.sendClient({
				type: 'err',
				msg: '请输入关键词'
			})
		}else{
			superagent.get(reptileUrl + msg).end((err, res) =>{
				// 抛错拦截
				if (err) {
					throw Error(err);
					return;
				}

				let $ = cheerio.load(res.text);
				let data = [];
				// 下面就是和jQuery一样获取元素，遍历，组装我们需要数据，添加到数组里面
				$('#index_ajax_list li').each(function (i, elem) {
					let _this = $(elem);
					data.push({
						img: _this.find('img').attr('src'),
						title: _this.find('img').attr('alt'),
						href: _this.find('a').attr('href')
					});
				});
				this.pageNum = data.length;
				this.sendClient({
					type: 'page',
					msg: this.pageNum
				})
				this.getSonPage(data);
			});
		}
	},
	clearData(){
		this.pageNum = 0;
		this.imgList = [];
		//this.IO.close();
	},
	download(){
		let self = this,
			finishNum = 0,
			done = () =>{
				if(finishNum == self.imgList.length){
					self.sendClient({
						type: 'detail',
						msg: '下载图片完成'
					});
					self.clearData.call(self);
				}
			};
		self.sendClient({
			type: 'detail',
			msg: '开始下载图片'
		})
		this.imgList.forEach(item =>{
			Ut.downImg(item.obj).then(result =>{
				self.sendClient(result);
				finishNum++;
				self.sendClient({
					type: 'img',
					total: self.imgList.length,
					num: finishNum
				});
				done();
			});
		});
	},
	getSonPage(list){
		let self = this,
			finishNum = 0,
			done = () =>{
				if(finishNum == self.pageNum){
					self.download.call(self);
				}
			}
		list.forEach((item, index) => {
			let url = item.href;
			superagent.get(url).use(throttle.plugin()).end((err, res) => {
				if (err) {
					throw Error(err);
					return;
				}
				let $ = cheerio.load(res.text),
					p = $('.content_left p');

				$('.content_left p').each((i, elem) => {
					let _this = $(elem),
						obj = {
							url: _this.find('img').attr('src')
						};
					obj.url && self.imgList.push({
						obj
					});
				});
				finishNum ++;
				self.sendClient({
					type: 'img',
					total: self.imgList.length,
					num: 0
				});
				done();
			});
		});
	}
};
module.exports = Page;