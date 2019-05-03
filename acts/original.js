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

  // 3. List all category
  app.get("/api/v1/categories", function(req, res) {
    try
    {

      if (err) throw err;

      names = {};
      categories
        .find({}, { projection: { _id: 0 } })
        .toArray(function(err, result) {
          if (err) throw err;

          result.forEach(function(ele) {
            for (each in ele) {
              names[each] = ele[each];
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

  // 4. Add category
  app.post("/api/v1/categories", function(req, res) {
    try
    {

      //if (err) throw err;
      if(req.body[0]==null)
      	throw "oops"

      categories
        .find({ [req.body[0]]: { $exists: 1 } })
        .next(function(err, result) {
          if (err) throw err;

          if (!result) {
            categories.insert({[req.body[0]]: 0 });
            //categories.insert({},{$set : {[req.body[0]]: 0 }});
            res.status(201);
            // Category added
            res.send({});
          } else {
            res.status(400);
            // Error adding category
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

  // 5. Delete category
  app.delete("/api/v1/categories/:name", function(req, res) {
    try
    {

      if (err) throw err;

      categories
        .find({ [req.params.name]: { $exists: 1 } })
        .next(function(err, item) {
          if (err) throw err;
          if (!item) {
            res.status(400);
            // Category not found
            res.send({});
          } else {
            categories.remove({ [req.params.name]: { $exists: 1 } });
            acts.find({}, { projection: { _id: 0 } }).forEach(function(subitem) {
              for (key in subitem) {
                if (subitem[key] == req.params.name) {
                  acts.remove({ [key]: { $exists: 1 } });
                }
              }
            });

            drop_db = d.collection(req.params.name);
            drop_db
              .find({}, { projection: { _id: 0 } })
              .forEach(function(eachitem) {
                for (key in eachitem) {
                  drop_db.remove({ [key]: { $exists: 1 } });
                }
              });
            res.status(200);
            // Category deleted
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

  // 6. Return acts for a category.
  // 8. Return acts for a given category in a given range (inclusive)
  app.get("/api/v1/categories/:categoryName/acts", function(req, res) {
    try
    {

      if (err) throw err;

      start = req.query.start;
      end = req.query.end;

      if (start != null && end != null) 
      {
        categories
          .find({ [req.params.categoryName]: { $exists: 1 } })
          .toArray(function(err, item) 
          {
            if (err) throw err;

            if (!item) {
              res.status(204);
              // Category Name does not exist
              res.send({});
            } else if (start < 1) {
              res.status(204);
              // Invalid starting of range
              res.send({});
            } else if (end > item[req.params.categoryName]) {
              res.status(204);
              // Invalid ending of range
              res.send({});
            } else if (end - start + 1 > 100) {
              res.status(413);
              // Invalid range (too large)
              res.send({});
            } else {
              array = [];
              dic = {};
              i = 1;

              collection = d.collection(req.params.categoryName);
              collection
                .find({}, { projection: { _id: 0 } })
                .toArray(function(err, result) 
                {
                  result.forEach(function(act) 
                  {
                    for (index in act) 
                    {
                      temp = {};
                      temp["actId"] = index;
                      for (y in act[index]) 
                      {
                        temp[y] = act[index][y];
                      }
                      array.push(temp);
                    }
                  });
                  if (array.length != 0) 
                  {
                    function compare(a, b) 
                    {
                      if (a.timestamp < b.timestamp) return 1;
                      if (b.timestamp > a.timestamp) return -1;
                      //console.log(a,b);
                      //return 0;
                      if (Number(a.actId) < Number(b.actId)) return 1;
                      return -1;
                    }

                    array.sort(compare);
                    array1 = array.slice(start - 1, end);

                    res.status(200);
                    res.send(array1);
                  } 
                  else 
                  {
                    res.status(204);
                    res.send({});
                  }
                });
            }
          });
      } else if (start == null && end == null) {
        categories
          .find({ [req.params.categoryName]: { $exists: 1 } })
          .next(function(err, item) {
            if (err) throw err;

            if (!item) {
              res.status(400);
              // Category Name does not exist
              res.send({});
            } else if (item[req.params.categoryName] > 100) {
              res.status(413);
              // Output too large
              res.send({});
            } else {
              array = [];

              collection = d.collection(req.params.categoryName);
              collection
                .find({}, { projection: { _id: 0 } })
                .toArray(function(err, result) {
                  console.log(result);
                  result.forEach(function(act) {
                    for (index in act) {
                      temp = {};
                      temp["actId"] = index;
                      for (y in act[index]) {
                        temp[y] = act[index][y];
                      }
                      array.push(temp);
                    }
                  });
                  if (array.length != 0) {
                    function compare(a, b) 
                    {
                      if (a.timestamp < b.timestamp) return 1;
                      if (b.timestamp > a.timestamp) return -1;
                      //console.log(a,b);
                      //return 0;
                      if (Number(a.actId) < Number(b.actId)) return 1;
                      return -1;
                    }

                    array.sort(compare);
                    res.status(200);
                    res.send(array);
                  } else {
                    res.status(204);
                    res.send({});
                  }
                });
            }
          });
      } else {
        res.status(400);
        res.send({});
      }
    }
    catch(err)
    {
      res.status(400);
      res.send({});
    }
  });

  // 7. List number of acts for a given category
  app.get("/api/v1/categories/:categoryname/acts/size", function(req, res) {
    try
    {
      if (err) throw err;
      categories
        .find({ [req.params.categoryname]: { $exists: 1 } })
        .next(function(err, item) {
          if (err) throw err;
          if (!item) {
            res.status(204);
            // ActID not found
            res.send({});
          } else {
            res.status(200);
            // Return the required act.
            res.send([item[req.params.categoryname]]);
          }
        });
    }
    catch(err)
    {
      res.status(400);
      res.send({});
    }
  });

  // 9. Upvote an act
  app.post("/api/v1/acts/upvote", function(req, res) {
    try
    {

      //if (err) throw err;
      if(req.body[0]==null)
      	throw "oops"

      actId = req.body[0];
      result = acts.find({ [actId]: { $exists: 1 } }).next(function(err, item) {
        if (err) throw err;
        if (!item) {
          res.status(400);
          // ActID not found
          res.send({});
        } else {
          categoryName = item[actId];
          category = d.collection(categoryName);
          category.update(
            { [actId]: { $exists: 1 } },
            { $inc: { [actId + ".upvotes"]: 1 } }
          );
          // ActID upvote
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

  // 10. Remove an act.
  app.delete("/api/v1/acts/:id", function(req, res) {
    try
    {

      if (err) throw err;

      acts.find({ [req.params.id]: { $exists: 1 } }).next(function(err, item) {
        if (err) throw err;

        if (!item) {
          res.status(400);
          // ActID not found
          res.send({});
        } else {
          actID = req.params.id;
          categoryName = item[req.params.id];
          categoryCollection = d.collection(categoryName);
          acts.deleteOne({ [req.params.id]: { $exists: 1 } });
          res.status(200);
          categories.updateOne(
            { [categoryName]: { $exists: 1 } },
            { $inc: { [categoryName]: -1 } }
          );
          categoryCollection.deleteOne({ [actID]: { $exists: 1 } });
          // Act deletion successful
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

  // 11. Upload an act
  app.post("/api/v1/acts", function(req, res) {
    try
    {
      console.log(req.body.caption)

      if(req.body.username==null || req.body.categoryName==null || req.body.timestamp==null || req.body.actId==null || req.body.timestamp==null || req.body.imgB64==null || (req.body).caption==null)
        throw "oops"

      //if (err) throw err;

      categoryName = req.body.categoryName;
      actId = req.body.actId;
      category = d.collection(categoryName);
      //console.log(category)
      result = acts.find({ [actId]: categoryName }).next(function(err, item) {
        if (err) throw err;
        if (!item) {
          var format = /^(0?[1-9]|[12][0-9]|3[01])[\-](0?[1-9]|1[012])[\-]\d{4}[:][0-5][0-9][-][0-5][0-9][-][0-5][0-9]$/;
          // Match the date format through regular expression
          console.log(req.body.timestamp.match(format))
          if (req.body.timestamp.match(format) != null) {
            users.find({ username: req.body.username }).next(function(err, item) {
              if (err) throw err;
              if (!item) {
                // Username doesn't exists
                res.status(400);
                console.log("Username")
                res.send({});
                
              } else {
                categories
                  .find({ [categoryName]: { $exists: 1 } })
                  .next(function(err, item) {
                    if (err) throw err;
                    if (!item) {
                      // Category name doesn't exist
                      res.status(400);
                      console.log("Category")
                      res.send({});
                      
                    } else {
                      if ("upvotes" in req.body) {
                        res.status(400);
                        // Upvotes field set error
                        console.log("Username")
                        res.send("dont set upvotes");
                      } else {
                        var base64format= /^([0-9a-zA-Z+/])*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
                        var returnv=req.body.imgB64.match(base64format)
                        if (returnv==null) {
                          res.status(400);
                          // Not in imgb64 format
                          console.log("b64")
                          res.send({});
                        } else {
                          category.insert({
                            [actId]: {
                              username: req.body.username,
                              timestamp: req.body.timestamp,
                              caption: req.body.caption,
                              upvotes: 0,
                              imgB64: req.body.imgB64
                            }
                          });
                          category.find().toArray(function(err, item) {console.log(item);})
                          acts.insert({ [actId]: categoryName });
                          categories.update(
                            { [categoryName]: { $exists: 1 } },
                            { $inc: { [categoryName]: 1 } }
                          );
                          res.status(201);
                          // Act creation succesful
                          res.send({});
                        }
                      }
                    }
                  });
              }
            });
          } else {
            // Timestamp format incorrect
            res.status(400);
            console.log("time")
            res.send({});
          }
        } else {
          res.status(400);
          // Act already exists.
          console.log("Act id")
          res.send({});
        }
      });
    }
    catch(err)
    {
      res.status(400);
      console.log("format")
      res.send({});
    }
    });
});

var server = app.listen(4000, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log("Example app listening at http://%s:%s", host, port);
});

