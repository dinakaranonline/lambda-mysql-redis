const mysql = require('mysql');
var redis = require('redis');
var bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

//Aurora MYSQL Database connection
const connection = mysql.createConnection({
    //following param coming from aws lambda env variable 
    host: process.env.DB_CLUSTER_URL,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // calling direct inside code
    connectionLimit: 10,
    multipleStatements: true,// Prevent nested sql statements
    connectionLimit: 1000,
    connectTimeout: 60 * 60 * 1000,
    acquireTimeout: 60 * 60 * 1000,
    timeout: 60 * 60 * 1000,
    debug: false

});


//Elasticache Redis Global key and server configuration 
const GLOBAL_KEY = 'actorskey';

const redisOptions = {
    host: process.env.REDIS_HOST,
    port: 6379
}
redis.debug_mode = false;

//Check if the requested product is available in Redis cache and return back response
function getDataFromCache(id) {
    var client = redis.createClient(redisOptions);
    console.info('Connected to Redis Server')
    //console.info("id ###"+id);
    var actorId = id;
    return client.hgetAsync(GLOBAL_KEY, id).then(res => {
        console.info('Redis responses for get single: '+actorId, res);
        if (res !== null) {
            console.log("data available in cache");
            return res;
        }
    }).catch(err => {
        //console.log('actorId'+actorId);    
        console.error("Failed to get single result for id:" + actorId, err)
    }).finally(() => {
        console.info('Disconnect to Redis');
        client.quit();
    });


}

//Insert every single record returned from database into Redis cache
function insertDataIntoCache(id, data) {
    console.log("id###" + id);
    console.log("data###" + JSON.stringify(data));
    var client = redis.createClient(redisOptions);
    client.hmsetAsync(GLOBAL_KEY, id, JSON.stringify(data)).then(res => {
        console.info('Redis responses for post: ', res)
    }).catch(err => {
        console.error("Failed to post data: ", err)

    }).finally(() => {
        console.info('Disconnect to Redis');
        client.quit();
    });
}

//Preparing records returned from database to be inserted into Redis Cache one by one

function insertTableDataIntoCache(result) {
    console.log("insertTableDataIntoCache");
    for (var i = 0; i < result.length; i++) {
        console.log("result " + i + " is =" + JSON.stringify(result[i]));
        console.log("id " + i + " is =" + result[i].id);
        insertDataIntoCache(result[i].id, result[i]);
    }

}
//Fetching  the requested records in the payload from Aurora MySQL database
selectAllElements = (chars) => {
    console.log("entered SelectAllElements");
    var query = "select * from actors where id in (?)";
    var data = chars;
    var queryData = [data];
    return new Promise((resolve, reject) => {
        connection.query(query, queryData, (error, result) => {
            if (error) {
                return reject(error);
            }
            console.log("results from db" + JSON.stringify(result))
            return resolve(result);
        });
    });
};

//Fetching  the requested record that is missing in the cache
selectOneElement = (id) => {
    console.log("entered SelectOneElement");
    var query = "select * from actors where id in (?)";
    var data = id;
    var queryData = [data];
    return new Promise((resolve, reject) => {
        connection.query(query, queryData, (error, result) => {
            if (error) {
                return reject(error);
            }
            console.log("single result results from db" + JSON.stringify(result))
            return resolve(result[0]);
        });
    });
};


//Fetching  the requested record that is missing in the cache
findMaxId = () => {
    console.log("entered findMaxId");
    var query = "select max(id) as maxID from actors";
    return new Promise((resolve, reject) => {
        connection.query("select max(id) as maxID from actors", (error, result) => {
            if (error) {
                console.log("entered error");
                return reject(error);
            }
            var maxId = result[0].maxID;
            console.log("maxid ###"+maxId);
            return resolve(maxId);
        });
    });
};


//Fetching  the requested record that is missing in the cache
insertDataIntoDB = (id,record) => {
    console.log("entered insertDataIntoDB");
    console.log("id "+id);
    console.log("name111 "+record.name);
    console.log("name "+record.name);
    console.log("hero "+record.hero);
    console.log("power "+record.power);
    console.log("color "+record.color);
    console.log("xp "+record.xp);
   var query = "INSERT INTO actors (id,name,hero,power,color,xp) VALUES ("+id+",'"+record.name+"','"+record.hero+"','"+record.power+"','"+record.color+"',"+record.xp+")";
   console.log("print query"+query);
    return new Promise((resolve, reject) => {
        connection.query(query, (error, result) => {
            if (error) {
                console.log("entered error");
                return reject(error);
            }
            console.log("datainserted");
             console.log("result ###"+JSON.stringify(result));
            console.log("insertedId"+result.insertId);
            return resolve(result);
        });
    });
    

};


//Main Handler function that receives the request from API Gateway and performs the processing
exports.handler = async (event, context, callback) => {

    // allows for using callbacks as finish/error-handlers
    console.log("eventbodytest###" + JSON.stringify(event.body));
    context.callbackWaitsForEmptyEventLoop = false;
    var parsedBody = JSON.parse(event.body);
    //Write flow to insert data into the database 
    if(parsedBody.REQUEST == "write"){
    console.log("usecache flag###" + parsedBody.USE_CACHE);
    console.log("json parse sqls"+JSON.stringify(parsedBody.SQLS));
    console.log("request type###" + parsedBody.REQUEST);
    var actorRecordsArray = parsedBody.SQLS;
    var maxId=await findMaxId();
    console.log("maxId### returned"+maxId);
    console.log("increment maxid"+incId);
    var insertIdArray=[];
     for (var i = 0; i < actorRecordsArray.length; i++) {
            var actorRecord=actorRecordsArray[i];
            console.log("id " + i + " is =" + JSON.stringify(actorRecord));
            var incId=++maxId;
            var result=await insertDataIntoDB(incId,actorRecord);
            console.log("record inserted")
            insertIdArray.push(incId);
           
     }
     
        const fetchRecords = await selectAllElements(insertIdArray);
        console.log("result elements" + JSON.stringify(fetchRecords));
        

         //Request is for the data to be stored in cache in addition to database
        if (parsedBody.USE_CACHE == "True") {
            console.log("cached flow");
            insertTableDataIntoCache(fetchRecords);
        }
        
        var resObj={"statusCode":200,"body":"write success"};
   
        
        return {
            statusCode: 200,
            body: JSON.stringify(resObj),
            isBase64Encoded: false
        }
      
    }
   //Read flow to fetch data from the database
   else {
    console.log("usecache flag###" + parsedBody.USE_CACHE);
    console.log("sql ids###" + parsedBody.SQLS);
    console.log("request type###" + parsedBody.REQUEST);
    var chars = parsedBody.SQLS;
    var cachedResult = [];
    var i;
    let result;
    //Request is for the data to be retrieved from Redis Cache
    if (parsedBody.USE_CACHE == "True") {
        console.log("cached flow");
        for (i = 0; i < chars.length; i++) {
            console.log("id " + i + " is =" + chars[i]);
            let result = await getDataFromCache(chars[i]);
            if (null != result) {
                cachedResult.push(JSON.parse(result));
            }
            //If there is no data already available in cache, fetch data from database, store it in cache , return data from cache
            else {
                const singleResult = await selectOneElement(chars[i]);
                console.log("data fetched from database" + JSON.stringify(singleResult));
                //Adding new element into cache and returning the response from cache
                const result = await insertDataIntoCache(chars[i], singleResult);
                console.log("data fetched from database" + JSON.stringify(result));
                let result1 = await getDataFromCache(chars[i]);
                console.log("data fetched from cache again" + JSON.stringify(result1));
                if (null != result1) {
                    cachedResult.push(JSON.parse(result1));
                }
            }
        }
        
        for (i = 0; i < cachedResult.length; i++) {
            console.log("cachedResult " + i + " is =" + cachedResult[i]);

        }
        
        var resObj1={"statusCode":200,"body":cachedResult};

        return {
            statusCode: 200,
            body: JSON.stringify(resObj1),
            isBase64Encoded: false
        }

    }
    //Request is for the data to be retrieved from Database
    else {
        //console.log("cache is false");
        const result = await selectAllElements(chars);
        console.log("result elements" + JSON.stringify(result));
        insertTableDataIntoCache(result);
        console.log("finished adding data into cache");
        var resObj2={"statusCode":200,"body":result};
        return {
            statusCode: 200,
            body: JSON.stringify(resObj2),
            isBase64Encoded: false
        }
    }
   }
};
