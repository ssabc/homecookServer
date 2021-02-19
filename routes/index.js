var express = require('express');
var router = express.Router();
var mysql = require('mysql'); 
var request = require('request');

var pool = mysql.createPool({
    host:'10.3.40.165',
    port:'3306',
    user:'root',
    password:'123456',
    database:'homecook',
    multipleStatements: true
});
var connection = null
pool.getConnection(function(err, conn) {
    if(err){
        console.log("建立连接失败"+JSON.stringify(err));
    } else {
      connection = conn
        console.log("建立连接成功");
    }
    // pool.end();
})
const APPID = 'wxb6433b76c0e7e066'
const SECRET = 'c830d90abe8ba47f5c75bfe6b3407d71'
/* 登录 */
router.post('/api/login', function(req, res, next) {
  let code = req.body.code
  request(`https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`, 
  function (error, response, body) {
    if (!error && response.statusCode == 200) {
      let openid = JSON.parse(body).openid
      // 返回
      res.send({
        code: '000000',
        data: {
          openid: openid
        }
      });
      // 更新用户表
      updateUser(req.body.userInfo, openid)
    } else {
      errBack(res, error)
    }
  })
});
router.get('/api/getUserInfo', function(req, res, next) {
  let openid = req.url.split("id=")[1]
  connection.query(`select * from user where openid='${openid}'`, (err, rows) => {
    if(err) {
        console.log("根据用户的openid查找用户信息失败： " + JSON.stringify(err));
        errBack(res, err)
        return
    }
    res.send({
      code: '000000',
      content: rows[0]
    });
  })
})

/* 我的店铺*/
router.get('/api/myshops', function(req, res, next) {
  let openid = req.url.split("openid=")[1]
  connection.query(`select * from shop where openid='${openid}'`, function(err, rows) {
      if(err) {
          console.log("shop查询失败"+ JSON.stringify(err));
          errBack(res, err)
      } else {
          res.json({
            code: '000000',
            data: {
              list: rows
            }
          });
      }
      // connection.destory();
      console.log(pool._allConnections.length);  // 0
  })
});

/* 新增店铺 */
router.post('/api/addshop', function(req, res, next) {
  let info = req.body.shopInfo
  let openid = req.body.openid
  connection.query('select * from shop', function(err, rows) {
    console.log(JSON.stringify(rows))
    if(err) {
        console.log("新增店铺：查询店铺表失败"+ JSON.stringify(err));
        errBack(res, err)
        return
    }
    let insertsql = `insert into shop (name, openid, color, phone, intro, address, cophone, dishtypes) 
      values ('${info.shopName}', '${openid}', '${info.shopColor}', '${info.shopPhone || ""}', '${info.shopIntro || ""}', '${info.shopAddress || ""}', '${info.shopCoPhone || ""}', '${info.labels ? info.labels.join("_") : ""}')`
    connection.query(insertsql, err => {
      if(err) {
          console.log("新增店铺：插入店铺表失败： " + JSON.stringify(err));
          errBack(res, err)
          return
      }
      res.send({
        code: '000000',
        msg: '添加成功'
      });
    })
  })
})

/* 修改店铺 */
router.post('/api/editshop', function(req, res, next) {
  let info = req.body.shopInfo
  let openid = req.body.openid
  let id = req.body.id
  let updatesql = `update shop set name='${info.shopName}',phone='${info.shopPhone || ""}',openid='${openid}',color='${info.shopColor}',address='${info.shopAddress || ""}',intro='${info.shopIntro || ""}',cophone='${info.shopCoPhone || ""}', dishtypes='${info.labels ? info.labels.join("_") : ""}' where id=${id}`
  
  connection.query(updatesql, err => {
    if(err) {
        console.log("修改店铺：修改店铺表失败： " + JSON.stringify(err));
        errBack(res, err)
        return
    }
    res.send({
      code: '000000',
      msg: '修改成功'
    });
  })
})

/* 删除店铺*/
router.delete('/api/delshop', function(req, res, next) {
  let id = req.body.id
  let updatesql = `delete from shop where id=${id};delete from dishes where shopid=${id};`
  
  connection.query(updatesql, err => {
    if(err) {
        console.log("删除店铺：删除店铺表失败： " + JSON.stringify(err));
        errBack(res, err)
        return
    }
    res.send({
      code: '000000',
      msg: '删除成功'
    });
  })
})


/* 新增菜品 */
router.post('/api/adddish', function(req, res, next) {
  let info = req.body.dishInfo
  let shopId = req.body.shopId
  connection.query('select * from dishes', function(err, rows) {
    // console.log(JSON.stringify(rows))
    if(err) {
        console.log("新增菜品：查询菜品表失败"+ JSON.stringify(err));
        errBack(res, err)
        return
    }
    let insertsql = `insert into dishes (name, shopid, color, type, labels, dishdesc, intro) values ('${info.dishName}', '${shopId}', '${info.dishColor}', '${info.type}', '${info.labels.join(",")}', '${info.dishDesc}', '${info.dishIntro}')`
    connection.query(insertsql, err => {
      if(err) {
          console.log("新增菜品：插入菜品表失败： " + JSON.stringify(err));
          errBack(res, err)
          return
      }
      res.send({
        code: '000000',
        msg: '添加成功'
      });
    })
  })
})
/* 删除菜品*/
router.delete('/api/delDish', function(req, res, next) {
  let id = req.body.id
  let updatesql = `delete from dishes where id=${id};`
  
  connection.query(updatesql, err => {
    if(err) {
        console.log("删除菜品：删除菜品表失败： " + JSON.stringify(err));
        errBack(res, err)
        return
    }
    res.send({
      code: '000000',
      msg: '删除成功'
    });
  })
})
/** 获取店铺的菜品 */
router.get('/api/getdishes', function(req, res, next){
  let id = req.url.split("id=")[1]
  connection.query(`select * from dishes where shopid=${id}`, function(err, rows) {
    if(err) {
        console.log("查询店铺菜品列表失败"+ JSON.stringify(err));
        errBack(res, err)
        return
    }
    res.json({
      code: '000000',
      data: {
        list: rows
      }
    });
  })
})

/** 获取下单菜单列表 */
router.post('/api/getResultDishes', function(req, res, next){
  console.log(req.body)
  let ids = req.body.ids.split("_").join(",")
  console.log(ids)
  connection.query(`select * from dishes where id in (${ids})`, function(err, rows) {
    if(err) {
        console.log("根据菜品id查询菜品失败"+ JSON.stringify(err));
        errBack(res, err)
        return
    }
    res.json({
      code: '000000',
      data: {
        list: rows
      }
    });
  })
})

/** 店铺详情 */
router.get('/api/getshopinfo', function(req, res, next){
  let id = req.url.split("&id=")[1]
  connection.query(`select * from shop where id=${id}`, function(err, rows) {
    if(err) {
        console.log("查询店铺详情失败"+ JSON.stringify(err));
        errBack(res, err)
        return
    }
    res.json({
      code: '000000',
      data: {
        content: rows[0]
      }
    });
  })
})

/** 菜品详情 */
router.get('/api/getdishinfo', function(req, res, next){
  let id = req.url.split("&id=")[1]
  connection.query(`select * from dishes where id=${id}`, function(err, rows) {
    if(err) {
        console.log("查询菜品详情失败"+ JSON.stringify(err));
        errBack(res, err)
        return
    }
    res.json({
      code: '000000',
      data: {
        content: rows[0]
      }
    });
  })
})

/**
 * 客户端错误返回
 */
function errBack(res, err) {
  res.send({
    code: '999999',
    msg: err.message
  });
}

/**
 * 更新用户表
 * @param {*} info 用户信息
 * @param {*} openid 小程序用户的openid
 */
function updateUser(info, openid) {
  connection.query('select * from user', function(err, rows) {
    // console.log(JSON.stringify(rows))
    if(err) {
        console.log("登录：查询用户表失败"+ JSON.stringify(err));
        return
    } 
    // 如果已经存在，则更新，否则插入
    let tmp = rows.filter(cell=>cell.openid == openid)
    if ( tmp.length > 0 ) {
      // 如果内容改变了
      if (tmp[0].name != info.nickName || tmp[0].avatarUrl != info.avatarUrl) {
        let updatesql = `update user set name='${info.nickName}',avatarurl='${info.avatarUrl}' where openid='${openid}';`
        connection.query(updatesql, err => {
          if(err) {
              console.log("登录：更新用户表失败：" + JSON.stringify(err));
          } 
        })
      }
    } else {
      let insertsql = `insert into user (openid, name, avatarurl) values ('${openid}', '${info.nickName}', '${info.avatarUrl}')`
      connection.query(insertsql, err => {
        if(err) {
            console.log("登录：插入用户表失败： " + JSON.stringify(err));
        } 
      })
    }
  })
}

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
