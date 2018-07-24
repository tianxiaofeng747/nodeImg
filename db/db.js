//引入mongodb模块，获得客户端对象
var MongoClient = require('mongodb').MongoClient;
//连接字符串
var DB_CONN_STR = 'mongodb://localhost:27017';
const documents = 'users';
//定义函数表达式，用于操作数据库并返回结果
var insertData = function (db, callback) {
    //获得指定的集合 
    var collection = db.collection(documents);
    //插入数据
    var data = [{_id: 7, "name": 'rose', "password": 21}, {_id: 8, "name": 'mark', "password": 22}];
    collection.insert(data, function (err, result) {
        //如果存在错误
        if (err) {
            console.log('Error:' + err);
            return;
        }
        //调用传入的回调方法，将操作结果返回
        callback(result);
    });
};

const result = {
    DB: null,
    client: null,
    getMongo(){
        return new Promise((resolve, reject) => {
            let self = this;
            if (self.DB) {
                resolve(self.DB);
            } else {
                MongoClient.connect(DB_CONN_STR, { useNewUrlParser: true }, function (err, client) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    self.client = client;
                    self.DB = client.db('test1');
                    console.log('连接数据库成功');
                    resolve(self.DB);
                });
            }
        });
    },
    search(){
        return new Promise((resolve, reject) => {
            this.getMongo().then((db) => {
                const collection = db.collection(documents);
                collection.find({}).toArray((err, docs) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(docs);
                });
            }).catch(err => {
                reject(err);
            });
        });
    },
    insert(list){
        let self = this;
        return new Promise((resolve, reject) => {
            this.getMongo().then((db) => {
                let collection = db.collection(documents),
                    doneNum = 0,
                    done = () =>{
                        if(doneNum == list.length){
                            resolve();
                        }
                    };
                list.forEach(data =>{
                    collection.updateOne(data,{
                        $set: {
                            time: new Date().getTime()
                        }
                    },{
                        upsert: true
                    }, (err, docs) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        doneNum ++;
                        done();
                    });
                });
            })
        });
    },
    update(data){
        return new Promise((resolve, reject) => {
            this.getMongo().then((db) => {
                let collection = db.collection(documents);
                collection.findOneAndUpdate(data,{$set: {isDownload: true}},{
                    returnOriginal: false,
                    //sort: [[a,1]],
                    upsert: true
                },(err,docs) =>{
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            })
        });
    },
    remove(data){
        return new Promise((resolve, reject) => {
            this.getMongo().then((db) => {
                if(!data){
                    reject('没有可删除的内容');
                    return;
                }
                const collection = db.collection(documents);
                collection.deleteOne(data,function (err,obj) {
                    if(err) {
                        throw err;
                        return;
                    }
                    resolve();
                });

            })
        });
    }
};
module.exports = result;