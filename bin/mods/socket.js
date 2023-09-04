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
        let self = this;
        const reptileUrl = "https://datachart.500.com/ssq/?expect=50";
        this.IO = io;
        if (!msg) {
            this.sendClient({
                type: 'err',
                msg: '请输入关键词'
            })
        } else {
            superagent.get(reptileUrl).timeout({
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
                // this.sendClient({
                //     type: 'data',
                //     msg: $('#chartsTable tbody tr').length
                // })
                let data = [];
                // 下面就是和jQuery一样获取元素，遍历，组装我们需要数据，添加到数组里面
                $('#tdata tr').each((i, elem) => {
                    let _this = $(elem);
                    let tdText = _this.find('td').eq(0).text().trim();
                    if(tdText && /^[0-9]*$/g.test(tdText)){
                        let obj = {}
                        obj.date = tdText;
                        obj.redNumber = []; 
                        _this.find('.chartBall01').each((i, item) => {
                            obj.redNumber.push(Number($(item).text()))
                        });
                        obj.blurNumber = Number(_this.find('.chartBall02').text());
                        data.push(obj);
                    }
                });
                //开始计算冷热球
                // 超过10次没出现，算冷球， 最近20次出现 次数大于5 ，算热球
                let coldNums = [],
                    fireNums = [];
                data = data.reverse();
                for(let i = 1; i< 34; i++){
                    let tenArr = data.slice(0, 10);
                    let hasBold = tenArr.find(item => item.redNumber.includes(i));
                    if(!hasBold){
                        coldNums.push(i);
                    } else{
                        fireNums.push(i)
                    }
                }
                this.sendClient({
                    type: 'data',
                    msg: JSON.stringify(data)
                })
                this.sendClient({
                    type: 'detail',
                    msg: `上一期的红号为：${data[0].redNumber.join(',')}`
                })
                this.sendClient({
                    type: 'detail',
                    msg: `十期冷号为：${coldNums.join(',')}`
                })
                //号码池子
                let pollNums = fireNums.filter(item => !data[0].redNumber.includes(item));
                this.sendClient({
                    type: 'detail',
                    msg: `过滤掉上期+冷号后的组合为：${pollNums.join(',')}`
                })
                //简单的开始随机吧。

                //随机生成
                let grenerateNum = (arr, res = []) => {
                    var random = Math.floor(Math.random() * arr.length + 1);
                    let num = arr[random];
                    if(res.length >= 6){
                        return;
                    }
                    if(!res.includes(num)){
                        res.push(num);
                        grenerateNum(arr, res);
                    } else{
                        grenerateNum(arr, res);
                    }
                };
                let luckyArr = [];
                grenerateNum(pollNums, luckyArr);

                this.sendClient({
                    type: 'detail',
                    msg: `幸运号为：${luckyArr.join(',')}`
                })
                
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
        Ut.saveUrl(this.imgList).then(result =>{
            downloadSigle();
        });
    },
    getSonPage(list){
        let self = this,
            finishNum = 0,
            done = () => {
                if (finishNum == self.pageNum) {
                    self.download.call(self);
                }
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
        list.forEach((item, index) => {
            let url = item.href;
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
                    p = $('.content_left p');

                $('.content_left p').each((i, elem) => {
                    let _this = $(elem),
                        obj = {
                            url: _this.find('img').attr('src'),
                            id: new Date().getTime() + ''
                        };
                    obj.url && self.imgList.push(obj);
                });
                finishNum++;
                self.imgTotal = this.imgList.length;
                self.sendClient({
                    type: 'img',
                    total: self.imgTotal,
                    num: 0
                });
                done();
            });
        });
    }
};
module.exports = Page;
