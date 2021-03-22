const mysql = require('mysql');
var redis = require('redis');
var bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const connection = mysql.createConnection({
  //following param coming from aws lambda env variable 
  host: process.env.DB_CLUSTER_URL,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database:process.env.DB_NAME,
  // calling direct inside code
  connectionLimit: 10,
  multipleStatements: true,// Prevent nested sql statements
  connectionLimit: 1000,
  connectTimeout: 60 * 60 * 1000,
  acquireTimeout: 60 * 60 * 1000,
  timeout: 60 * 60 * 1000,
  debug: false

});

const GLOBAL_KEY = 'lambda-test';

const redisOptions = {
    host: "actorsredis-001.tnok0o.0001.use1.cache.amazonaws.com",
    port: 6379
}
redis.debug_mode = false;

function getHeroesById(connection) {
  console.log("entered getHeroesById");
  try{
  // Pretends ids is [1, 2]
  const result =  connection.query(
    'SELECT * from actors',

  );
  console.log("result"+JSON.stringify(result));
  }
 catch(e) {
        console.log(e);
        // [Error: Uh oh!]
    }
}

//Check if the requested product is available in Redis and return back response
function getDataFromCache(id){
     var client = redis.createClient(redisOptions);
     console.info('Connected to Redis Server')
     console.info("id ###"+id);
     var actorId=id;
     client.hgetAsync(GLOBAL_KEY, id).then(res => {
         console.info('Redis responses for get single: '+actorId, res);
         if (res !== null) {
             
         }
         else {
             getDataFromDB(id);
         }
        }).catch(err => {
        //console.log('actorId'+actorId);    
         console.error("Failed to get single result for id:"+actorId, err)
        }).finally(() => {
        console.info('Disconnect to Redis');
        client.quit();
        });
       
  
}


//Check if the requested product is available in Redis and return back response
function getDataFromDB(id){
    connection.query("SELECT * FROM actors where id="+id, function (err, result, fields) {
    if (err) throw err;
    console.log(JSON.stringify(result));
    insertDataIntoCache(id,JSON.stringify(result));
   
  });
  
}

//Insert data returned from database into Redis cache
function insertDataIntoCache(id,data){
     var client = redis.createClient(redisOptions);
     client.hmsetAsync(GLOBAL_KEY, id, data).then(res => {
        console.info('Redis responses for post: ', res)
        }).catch(err => {
        console.error("Failed to post data: ", err)
        
        }).finally(() => {
        console.info('Disconnect to Redis');
        client.quit();
        });
  
}


// console.log(connection);
exports.handler = (event, context, callback) => {
  
  /*
  TO-D0
  
  1. Parse request to determine if USE-CACHE is true or false 
  2. Parse the list of all sql that has list of id's for which data has to be fetched
  3. If USE-CACHE is false, fetch the data directly from MySQL and return back the response.
    Question : Should the data be updated in Redis as well? 
  4. If USE-CACHE is true, check for each of the unique id if the data is available in Cache. If available, return response.
  5. Continuing on 4 , if data is not available in cache, fetch the data from MySQL and store it in Cache and return response.
  */
   console.log("eventbody###"+JSON.stringify(event.body));  
   //console.log("flag"+event.body("USE_CACHE"));
   var parsedBody = JSON.parse(event.body);
   console.log("usecache flag###"+parsedBody.USE_CACHE);
   console.log("sql ids###"+parsedBody.SQLS);
   console.log("request type###"+parsedBody.REQUEST);
   var chars = parsedBody.SQLS;
   var i;
   for (i = 0; i < chars.length; i++) { 
            console.log("id "+i+" is =" +chars[i]);
            getDataFromCache(chars[i]);
            
     }

  console.log('inside lambda...');
  // allows for using callbacks as finish/error-handlers
  context.callbackWaitsForEmptyEventLoop = false;
  const sql = "select * from actors";
//getHeroesById(connection);
 /*connection.query(sql, function (err, result) {
    if (err) {
       callback(null, {
            statusCode: 400,
            body: JSON.stringify(err),
        })
    }
    else{
    callback(null, {
            statusCode: 200,
            body: JSON.stringify(result),
        })
    }
  });*/
    
    
    

  
    /* var client = redis.createClient(redisOptions);
    console.info('Connected to Redis Server')
    console.info('event.pathParameters: ', event.pathParameters);
    console.info('event.httpMethod: ', event.httpMethod);
    let id = (event.pathParameters || {}).product || false;
    let data = event.data;

    switch (event.httpMethod) {

        case "GET":
            if (id) {
                console.info('get by id')
                client.hgetAsync(GLOBAL_KEY, id).then(res => {
                    console.info('Redis responses for get single: ', res);
                    callback(null, {body:  "This is a READ operation on product ID " + id, ret: res});
                    // callback(null, {body: "This is a READ operation on product ID " + id});
                }).catch(err => {
                    console.error("Failed to get single: ", err)
                    callback(null, {statusCode: 500, message: "Failed to get data"});
                }).finally(() => {
                    console.info('Disconnect to Redis');
                    client.quit();
                });

                return;
            } else {
                console.info('get all')
                client.hgetallAsync(GLOBAL_KEY).then(res => {
                    console.info('Redis responses for get all: ', res)
                    callback(null, {body: "This is a LIST operation, return all products", ret: res});
                    // callback(null, {body: "This is a LIST operation, return all products"});
                }).catch(err => {
                    console.error("Failed to post data: ", err)
                    callback(null, {statusCode: 500, message: "Failed to get data"});
                }).finally(() => {
                    console.info('Disconnect to Redis');
                    client.quit();
                });
            }
            break;

        case "POST":
            if (data) {
                console.info('Posting data for [', id, '] with value: ', data);
                client.hmsetAsync(GLOBAL_KEY, id, data).then(res => {
                    console.info('Redis responses for post: ', res)
                    callback(null, {body: "This is a CREATE operation and it's successful", ret: res});
                    // callback(null, {body: "This is a CREATE operation"});
                }).catch(err => {
                    console.error("Failed to post data: ", err)
                    callback(null, {statusCode: 500, message: "Failed to post data"});
                }).finally(() => {
                    console.info('Disconnect to Redis');
                    client.quit();
                });
            }
            else {
                callback(null, {statusCode: 500, message: 'no data is posted'})
            }
            break;

        case "PUT":
            callback(null, {body: "This is an UPDATE operation on product ID " + id});
            break;

        case "DELETE":
            console.info('delete a prod');
            client.delAsync(GLOBAL_KEY).then(res => {
                console.info('Redis responses for get single: ', res);
                callback(null, {body:  "This is a DELETE operation on product ID " + id, ret: res});
                // callback(null, {body: "This is a DELETE operation on product ID " + id});
            }).catch(err => {
                console.error("Failed to delete single: ", err);
                callback(null, {statusCode: 500, message: "Failed to delete data"});
            }).finally(() => {
                console.info('Disconnect to Redis');
                client.quit();
            });

            break;

        default:
            // Send HTTP 501: Not Implemented
            console.log("Error: unsupported HTTP method (" + event.httpMethod + ")");
            callback(null, {statusCode: 501})
    }
  */

};
