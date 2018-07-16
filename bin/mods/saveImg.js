let request = require("request");
let fs = require("fs");

class Ut {
	/**
	 * 下载网络图片
	 * @param {object} opts
	 */
	static downImg(opts = {}) {
		let url = opts.url.split('/').pop();
		let path = 'bin/download/rosi_' + url;
		return new Promise((resolve, reject) => {
			request
				.get(opts)
				.on('response', (response) => {
					console.log("img type:", response.headers['content-type'])
				})
				.pipe(fs.createWriteStream(path))
				.on("error", (e) => {
					console.log("pipe error", e);
					reject('下载错误' + e);
				})
				.on("finish", () => {
					//console.log("下载完成");
					resolve({
						type: 'detail',
						msg: '下载' + opts.url + '完成'
					});
				})
				.on("close", () => {
					//console.log("关闭");
				})

		})
	};
}

module.exports = Ut;
