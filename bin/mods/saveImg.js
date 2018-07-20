let request = require("request");
let fs = require("fs");
let db = require('../../db/db.js');
let Ut = {
	/**
	 * 下载网络图片
	 */
    downImg(opts = {}) {
		let url = opts.url.split('/').pop();
		let dirPath = 'public/download/';
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		return new Promise((resolve, reject) => {
			request
				.get(opts)
				.on('response', (response) => {
					console.log("正在请求:", opts.url)
				})
				.pipe(fs.createWriteStream(dirPath + url))
				.on("error", (e) => {
					console.log("下载错误", e);
					reject({
                        type: 'detail',
                        msg: opts.url + '下载错误'
                    });
				})
				.on("finish", () => {
                    db.update(opts);
					resolve({
						type: 'detail',
						msg: opts.url + '下载完成'
					});
				})
				.on("close", () => {
					//console.log("关闭");
				})

		})
	},
    saveUrl(list){
        return new Promise(function (resolve,reject) {
            db.insert(list).then((result) => {
                if (result) {
                    reject();
                    console.log('保存失败');
                } else {
                    console.log('保存成功');
                    resolve();
                }

            }).catch((err) => {
                reject();
            });
        })

    }
};
module.exports = Ut;
