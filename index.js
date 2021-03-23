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

function getHeroesById() {
  console.log("entered getHeroesById");
  try{
  // Pretends ids is [1, 2]
  const result =  connection.query(
    'SELECT * from actors',

  );
  console.log("result"+result);
  }
 catch(e) {
        console.log(e);
        // [Error: Uh oh!]
    }
}

//Check if the requested product is available in Redis and return back response
//getDataFromCache = (id) =>{
 function getDataFromCache(id){
     var client = redis.createClient(redisOptions);
     console.info('Connected to Redis Server')
     //console.info("id ###"+id);
     var actorId=id;
      return client.hgetAsync(GLOBAL_KEY, id).then(res => {
         //console.info('Redis responses for get single: '+actorId, res);
         if (res !== null) {
             console.log("data available in cache");
             return res;
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
async function getDataFromDBForActor(id){
    console.log("entered getDataFromDBForActor to fetch data for"+id);
    connection.query("SELECT * FROM actors where id="+id, function (err, result) {
   if (err) {
        console.log("encountered errorsss"+err);
        throw err;
    } 
    console.log("data retrieved from mysql"+JSON.stringify(result));
    insertDataIntoCache(id,JSON.stringify(result));
  });
  
}


//Check if the requested product is available in Redis and return back response
function getDataFromDBForActors(ids,context){
     context.callbackWaitsForEmptyEventLoop = false;
    //select * from contents where user_is IN (?)", [result_array]
    console.log("actos array"+ids);
    var query="select * from actors where id in (?)";
    var data=ids;
    var queryData=[data];
    connection.query(query,queryData, function (err, result) {
     //connection.query("SELECT * FROM actors", function (err, result) {
    //connection.query("SELECT * FROM actors where id="+id1, function (err, result, fields) {
    if (err) {
        console.log("encountered error"+err);
        throw err;
    } 
    console.log("all table fetch"+JSON.stringify(result));
    return result;
    
  });
  
}


//Insert data returned from database into Redis cache
function insertDataIntoCache(id,data){
    console.log("id###"+id);
    console.log("data###"+JSON.stringify(data));
     var client = redis.createClient(redisOptions);
     client.hmsetAsync(GLOBAL_KEY, id, data).then(res => {
        console.info('Redis responses for post: ', res)
        }).catch(err => {
        console.error("Failed to post data: ", err)
        
        }).finally(() => {
        console.info('Disconnect to Redis');
        client.quit();
        });
        
      /*  var client1 = redis.createClient(redisOptions);
        
        console.log("record added");
        client1.hgetAsync(GLOBAL_KEY, id).then(res1 => {
        console.info('Redis responses newly added record added : '+id, res1);
         if (res1 !== null) {
             return res1;
         }
         else {
             console.log("result empty")
         }
        }).catch(err => {
        //console.log('actorId'+actorId);    
         console.error("Failed to get single result for id:", err)
        }).finally(() => {
        console.info('Disconnect to Redis added/retry');
        client1.quit();
        }); */    
  
}

function insertTableDataIntoCache(result){
    console.log("insertTableDataIntoCache");
     for (var i = 0; i < result.length; i++) { 
            console.log("result "+i+" is =" +JSON.stringify(result[i]));
             console.log("id "+i+" is =" + result[i].id);
             insertDataIntoCache(result[i].id,result[i]);
     }
    
}

selectAllElements = (chars) =>{
    console.log("entered SelectAllElements");
    var query="select * from actors where id in (?)";
    var data=chars;
    var queryData=[data];
    return new Promise((resolve, reject)=>{
        connection.query(query,queryData, (error, result)=>{
            if(error){
                return reject(error);
            }
            console.log("results from db"+JSON.stringify(result))
            return resolve(result);
        });
    });
};


 selectOneElement = (id) =>{
    console.log("entered SelectOneElement");
    var query="select * from actors where id in (?)";
    var data=id;
    var queryData=[data];
    return new Promise((resolve, reject)=>{
        connection.query(query,queryData, (error, result)=>{
            if(error){
                return reject(error);
            }
            console.log("single result results from db"+JSON.stringify(result))
            return resolve(result);
        });
    });
};


// console.log(connection);
exports.handler =  async (event, context,callback) => {
  
    // allows for using callbacks as finish/error-handlers
   context.callbackWaitsForEmptyEventLoop = false;
   console.log("eventbodytest###"+JSON.stringify(event.body));  
   //console.log("flag"+event.body("USE_CACHE"));
   var parsedBody = JSON.parse(event.body);
   console.log("usecache flag###"+parsedBody.USE_CACHE);
   console.log("sql ids###"+parsedBody.SQLS);
   console.log("request type###"+parsedBody.REQUEST);
   var chars = parsedBody.SQLS;
   var cachedResult = [];
   var i;
   let result;
   //Request is for the data to be retrieved from Redis Cache
   if(parsedBody.USE_CACHE == "True"){
       console.log("cached flow");
   for (i = 0; i < chars.length; i++) { 
            console.log("id "+i+" is =" +chars[i]);
            let result=  await getDataFromCache(chars[i]);
            if(null!=result){
            cachedResult.push(result);
            }
            //If there is no data already available in cache, fetch data from database, store it in cache , return data from cache
            else {
                  //return getHeroesById();
                const singleResult =  await selectOneElement(chars[i]);
                console.log("data fetched from database"+JSON.stringify(singleResult));
                //Adding new element into cache and returning the response from cache
                const result= await insertDataIntoCache(chars[i],JSON.stringify(singleResult));
                console.log("data fetched from database"+JSON.stringify(result));
                let result1=  await getDataFromCache(chars[i]);
                 console.log("data fetched from cache again"+JSON.stringify(result1));
                if(null!=result1){
                cachedResult.push(result1);
                }
            }    
            //let result;
            //console.log("result ####"+result)
             
          /*   //let response =  getDataFromCache(chars[i]);
             var client = redis.createClient(redisOptions);
             console.info('Connected to Redis Server')
            //console.info("id ###"+id);
             await client.hgetAsync(GLOBAL_KEY, chars[i]).then(res => {
             console.info('Redis responses for get single 111: '+chars[i], res);
             if (res !== null) {
                 console.log("data available in cache");
                 cachedResult.push(res);
                 console.log("cached Result size"+cachedResult.length);
                //return res;
             }
             else {
                    console.log("data NOT available in cache");
                    //return getHeroesById();
                 
             }
            }).catch(err => {
            //console.log('actorId'+actorId);    
             console.error("Failed to get single result for id:", err)
            }).finally(() => {
            console.info('Disconnect to Redis');
            client.quit();
            }); */
           
             
     }
     
     for (i = 0; i < cachedResult.length; i++) { 
            console.log("cachedResult "+i+" is =" +cachedResult[i]);
            
     }
   
    return {
      statusCode: 200,
      body:JSON.stringify(cachedResult),
      isBase64Encoded: false
    }
   
   }
   //Request is for the data to be retrieved from Database
   else {
       //console.log("cache is false");
        //result= getDataFromDBForActors(chars,context);
        //console.log("sql db fetch"+result)
         var query="select * from actors where id in (?)";
        var data=chars;
        var queryData=[data];
        const result = await selectAllElements(chars);
        console.log("result elements"+JSON.stringify(result));
        insertTableDataIntoCache(result); 
        console.log("finished adding data into cache");
        return {
         statusCode: 200,
         body:JSON.stringify(result),
         isBase64Encoded: false
          //"body": JSON.stringify(responseBody),
         //"isBase64Encoded": false
        }
/*        connection.query(query,queryData, function (err, result) {
        //connection.query(sql, function (err, result) {
         if (err) {
             callback(null, {
            statusCode: 400,
            body: JSON.stringify(err),
             })
         }
        else{
        insertTableDataIntoCache(result);    
        callback(null, {
            statusCode: 200,
            body: result,
        })
    }
  });*/
       
   }
   
   

  //console.log('inside lambda...');
  // allows for using callbacks as finish/error-handlers
  //context.callbackWaitsForEmptyEventLoop = false;
 // const sql = "select * from actors";
//getHeroesById(connection);

};
