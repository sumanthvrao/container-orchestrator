var express = require("express");
var app = express();
var fs = require("fs");
var bodyParser = require("body-parser");
app.use(bodyParser.json());
//var isBase64 = require("is-base64");
var MongoClient = require("mongodb").MongoClient;
var url = "mongodb://mongo:27017/assignment";

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
  next();
});

MongoClient.connect(url, function(err, db) {
  console.log("Connected successfully to server");

  d = db.db("assignment");
  users = d.collection("users");
  categories = d.collection("categories");
  acts = d.collection("acts");
  count_req = d.collection("count");

  count_req.update(
            { "count": { $exists: 0 } },
            { $set: { "count": 0 } },
            { upsert: true }
          );


  app.get("/api/v1/_count",function(req,res) {
    count_req.findOne({}, function(err, result) {

      res.status(200);
      res.send([result.count]);
    })  
  });

  app.delete("/api/v1/_count",function(req,res) {
    count_req.update(
            { "count": { $exists: 1 } },
            { $set: { "count": 0 } }
          );
    res.status(200)
    res.send({})
  });

  app.post("/api/v1/_count",function(req,res) {
    res.status(405)
    res.send()
  }) 

  // Login

  app.post("/api/v1/login", function(req, res) {
    try
    {
       if (err) throw err;

      result = users
        .find({ username: req.body.username })
        .next(function(err, item) {
          if (err) throw err;
          if (!item) 
            {
              res.status(401);
              res.send({});
            }
          else if (item.password == req.body.password)
          {
            res.status(200);
            res.send({});
          }
          else
          {
            res.status(401);
            res.send({});
          } 
          
          
        });
    }
    catch(err)
    {
      res.staus(400);
      res.send({});
    }
   
  });

  // 1. Add user
  app.post("/api/v1/users", function(req, res) {
    count_req.update(
            { "count": { $exists: 1 } },
            { $inc: { "count": 1 } }
          );
    try
    {
      //if (err) throw err;
      if(req.body.username==null || req.body.password ==null)
        throw err;

      if(/^[a-fA-F0-9]{40}$/.test(req.body.password)==false)
      {
        res.status(400);
        res.send({})
        //res.send("Not in SHA1 hex");
      }

      else
      {
      	result = users
        .find({ username: req.body.username })
        .next(function(err, item) {
          if (err) throw err;
          if (!item) {
            users.insertOne({
              username: req.body.username,
              password: req.body.password
            });
            res.status(201);
            // User creation successful
            res.send({});
          } 
          else 
          {
            res.status(400);
            // Username already taken
            res.send({});
          }
        });
      }
    }
    catch(err)
    {
      res.status(400);
      res.send({});
    } 
  });

  app.get("/api/v1/users", function(req, res) {
    count_req.update(
            { "count": { $exists: 1 } },
            { $inc: { "count": 1 } }
          );
    try
    {

      if (err) throw err;

      names = [];
      users
        .find({}, { projection: { _id: 0 } })
        .toArray(function(err, result) {
          if (err) throw err;

          result.forEach(function(ele) {
            for (index in ele) {
        if (index=='username')
        {
                names.push(ele[index]);
              }
            }
          });

          if (Object.keys(names).length != 0) {
            res.status(200);
            res.send(names);
          } else {
            res.status(204);
            res.send({});
          }
        });
    }
    catch(err)
    {
      res.status(400);
      res.send({});
    }
  });

  app.delete("/api/v1/users", function(req, res) {
    count_req.update(
            { "count": { $exists: 1 } },
            { $inc: { "count": 1 } }
          );
    res.status(405)
    res.send()
  }) 

  // 2. Remove user
  app.delete("/api/v1/users/:id", function(req, res) {
    count_req.update(
            { "count": { $exists: 1 } },
            { $inc: { "count": 1 } }
          );
    try
    {
      if (err) throw err;

      result = users.find({ username: req.params.id }).next(function(err, item) {
        if (err) throw err;
        if (!item) {
          res.status(400);
          res.send({});
        } else {
          users.remove({ username: req.params.id });
          res.status(200);
          res.send({});
        }
      });
    }
    catch(err)
    {
      res.status(400);
      res.send({});
    }
  });
  
  app.get("/api/v1/users/:id", function(req, res) {
    count_req.update(
            { "count": { $exists: 1 } },
            { $inc: { "count": 1 } }
          );
    res.status(405)
    res.send()
  }) 

  app.post("/api/v1/users/:id", function(req, res) {
    count_req.update(
            { "count": { $exists: 1 } },
            { $inc: { "count": 1 } }
          );
    res.status(405)
    res.send()
  }) 


 // 3. List all users
  
});

var server = app.listen(80, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log("Example app listening at http://%s:%s", host, port);
});