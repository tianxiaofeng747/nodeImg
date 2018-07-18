"use strict";
var express = require('express');
var router = express.Router();
var path = require('path');
var Promise = require("bluebird"),
    readDir = Promise.promisify(require("fs").readdir);

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: '下载图片'});
});

router.get('/imgList', function (req, res, next) {
    let blogDir = path.resolve('./public/download');
    readDir(blogDir).then(function (files) {
        var blogList = [];
        if (files && files.length) {
            files.forEach(function (filename) {
                blogList.push('/download/' + filename);
            });
        }
        res.render('imgList', {list: blogList});
    })
});
module.exports = router;
