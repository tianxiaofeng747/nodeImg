"use strict";
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
	res.render('index', {title: '尝试下载图片'});
});

/*router.get('/load', function (req, res, next) {

});*/
module.exports = router;
