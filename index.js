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


//Check if the requested product is available in Redis and return back response
/*async function getDataFromDBForActor(id) {
    console.log("entered getDataFromDBForActor to fetch data for" + id);
    connection.query("SELECT * FROM actors where id=" + id, function (err, result) {
        if (err) {
            console.log("encountered errorsss" + err);
            throw err;
        }
        console.log("data retrieved from mysql" + JSON.stringify(result));
        insertDataIntoCache(id, JSON.stringify(result));
    });

}


//Check if the requested product is available in Redis and return back response
function getDataFromDBForActors(ids, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    console.log("actos array" + ids);
    var query = "select * from actors where id in (?)";
    var data = ids;
    var queryData = [data];
    connection.query(query, queryData, function (err, result) {
        if (err) {
            console.log("encountered error" + err);
            throw err;
        }
        console.log("all table fetch" + JSON.stringify(result));
        return result;

    });

} */


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
            return resolve(result);
        });
    });
};


//Main Handler function that receives the request from API Gateway and performs the processing
exports.handler = async (event, context, callback) => {

    // allows for using callbacks as finish/error-handlers
    context.callbackWaitsForEmptyEventLoop = false;
    console.log("eventbodytest###" + JSON.stringify(event.body));
    //console.log("flag"+event.body("USE_CACHE"));
    var parsedBody = JSON.parse(event.body);
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
                const result = await insertDataIntoCache(chars[i], JSON.stringify(singleResult));
                console.log("data fetched from database" + JSON.stringify(result));
                let result1 = await getDataFromCache(chars[i]);
                console.log("data fetched from cache again" + JSON.stringify(result1));
                if (null != result1) {
                    cachedResult.push(JSON.parse(result1));
                }
            }
        }
        
        /*for (i = 0; i < cachedResult.length; i++) {
            console.log("cachedResult " + i + " is =" + cachedResult[i]);

        }*/

        return {
            statusCode: 200,
            body: JSON.stringify(cachedResult),
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
        return {
            statusCode: 200,
            body: JSON.stringify(result),
            isBase64Encoded: false
        }
    }
};
