//import express server
const Router = require("express").Router;
const IpLocator = require("node-iplocate");
const router = Router();
const fetch = require("node-fetch");


const { setVapidDetails, sendNotification } = require('web-push');
//const vapidKeys = webPush.generateVAPIDKeys();
const publicKey = 'BJbGel5u8l_RfmWqO1yW-Hshdo4HfLCS8FlNMx0rBVIEBOR2a3h_NDbw4EGvJfv_vKdAhFrq5NdG1Q3JLT5Ux4o'; //vapidKeys.publicKey; 
const privateKey = 'U0WDz_q16h5ZMxrqI-zt3j0sTPqi0oLaBA17cudMMZw'; //vapidKeys.privateKey;
setVapidDetails('mailto:chineketobenna@gmail.com', publicKey, privateKey);

const { connect, Schema, model, connection } = require('mongoose');
const isLocalDevelopment = false;
const localAddress = 'mongodb://localhost:27017/headlinesdb';                                  //local development address
const hostAddress = 'mongodb://tobe09:nkeody09@ds141889.mlab.com:41889/headlinesdb';             //mLab repository address
const address = isLocalDevelopment ? localAddress : hostAddress;
connect(address);

const uniqueValidator = require('mongoose-unique-validator');
const pushSubSchema = Schema;
const pushSubDoc = new pushSubSchema({
    countryCode: { type: String, default: 'ng' },
    subscriptionString: { type: String, required: true, unique: true },
    dateAdded: { type: Date, default: Date.now }
})
.plugin(uniqueValidator);
const PushSubModel = model('push_subscriptions', pushSubDoc);


const dbConn = connection;
dbConn.on('error', console.error.bind(console, 'MongoDb server connection error:'));
dbConn.once('open', () => console.log('Connected to MongoDb server'));


//to locate application files (relative to application root)
const { join } = require('path');
const rootLocation = join(__dirname, '../');


//get web page
router.get('/', function (req, res) {
    res.sendFile('/src/index.html', { root: rootLocation });
})


//get service worker
router.get('/sw.js', function (req, res) {
    res.sendFile('/src/js/sw.js', { root: rootLocation });
})


const newsApiKey = '11bae20ea48e474890528e504ea733e2';

const countries = [['ar', 'Argentina'], ['au', 'Australia'], ['at', 'Austria'], ['be', 'Belgium'], ['br', 'Brazil'], ['bg', 'Bulgaria'],
    ['ca', 'Canada'], ['cn', 'China'], ['co', 'Columbia'], ['cu', 'Cuba'], ['cz', 'Czech Republic'], ['eg', 'Egypt'], ['fr', 'France'],
    ['de', 'Germany'], ['gr', 'Greece'], ['hk', 'Hong Kong'], ['hu', 'Hungary'], ['in', 'India'], ['id', 'Indonesia'], ['ie', 'Ireland'],
    ['il', 'Israel'], ['it', 'Italy'], ['jp', 'Japan'], ['lv', 'Latvia'], ['lt', 'Lituania'], ['my', 'Malaysia'], ['mx', 'Mexico'], ['ma', 'Morocco'],
    ['nl', 'NetherLand'], ['mz', 'New Zealand'], ['ng', 'Nigeria'], ['ph', 'Philippines'], ['pl', 'Poland'], ['pt', 'Portuga'], ['ro', 'Romania'],
    ['ru', 'Russia'], ['sa', 'Saudi Arabia'], ['rs', 'Serbia'], ['sg', 'Singapore'], ['sk', 'Slovakia'], ['si', 'Slovenia'], ['za', 'Soth Africa'],
    ['kr', 'South Korea'], ['se', 'Sweden'], ['ch', 'Switzerland'], ['tw', 'Taiwan'], ['th', 'Thailand'], ['tr', 'Turkey'], ['ae', 'United Arab Emirates'],
    ['ua', 'Ukraine'], ['gb', 'United Kingdom'], ['us', 'United States'], ['ve', 'Venezuela']];


//function to retrieve the location of a user
async function locateUserByIp(ipAddress) {
    try {
        const payload = await IpLocator(ipAddress);
        console.log("Ip address: " + ipAddress);
        console.log("Country code: " + payload.country_code);
        const countryCode = payload.country_code.toLowerCase();
        const validCountryCode = getValidCountryCode(countryCode);
        return validCountryCode;
    }
    catch (err) {
        return "ng";
    }
}

function getValidCountryCode(countryCode) {
    for (const countryArr in countries) {
        if (countryCode === countryArr[0]) return countryCode;
    }

    return 'ng';
}

//function to get ipaddress of client
function getIpAddress(req) {
    const ip = req.header('x-forwarded-for') || req.connection.remoteAddress || req.ip;
    const ipArr = ip.split(':');
    const clientIp = ipArr[ipArr.length - 1];

    return clientIp;
}


//get all news
router.get('/news/allNews', function (req, res) {
    const clientIp = getIpAddress(req);
    const socketId = req.query.socketId;

    locateUserByIp(clientIp).then(countryCode => {
        const pageSize = 30;
        const newsApiUrl = 'https://newsapi.org/v2/top-headlines?sortBy=publishedAt&country=' + countryCode +
            '&pageSize=' + pageSize + '&apiKey=' + newsApiKey;

        fetch(newsApiUrl).then(response => {
            response.json().then(jsonData => {
                const articles = jsonData.articles;
                articles.sort(sortArticles);

                res.json(articles);                     //send response back to client
                notifyClientSocket(socketId, articles, 'all');    //notify client of new articles through socket (offline first feature)
            })
        }).catch(err => {
            res.json({ Error: "Unable to retrieve news (All)." });
        });
    });
});


//get all sources
router.get('/news/sources', function (req, res) {
    const sourcesUrl = 'https://newsapi.org/v2/sources?apiKey=' + newsApiKey;

    fetch(sourcesUrl).then(response => {
        response.json().then(jsonData => {
            const sourcesData = jsonData.sources;
            const sourceGroup = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'];
            let sourceObject = {};

            //create an object of sources arrays
            for (const srcGrp of sourceGroup) {
                sourceObject[srcGrp] = [];
            }

            //group by category
            for (const source of sourcesData) {
                sourceObject[source.category].push([source.id, source.name]);
            }

            //sort by source in category
            for (const category in sourceObject) {
                sourceObject[category].sort((source1, source2) => source1[1].toLowerCase().localeCompare(source2[1].toLowerCase()));
            }
            
            res.json(sourceObject);
        })
    }).catch(err => {
        res.json({ Error: "Unable to retrieve sources (Sources)." });
    });
});


//get all countries
router.get('/news/countries', function (req, res) {  
    //countries.sort((country1, country2) => country1[1].toLowerCase().localeCompare(country2[1].toLowerCase()));
    res.json(countries);
});


//get news filtered by source
router.get('/news/bySource/:sourceCode', function (req, res) {
    const sourceCode = req.params.sourceCode;
    const socketId = req.query.socketId;
    const bySoruceUrl = 'https://newsapi.org/v2/top-headlines?sortBy=publishedAt&sources=' + sourceCode + '&apiKey=' + newsApiKey;

    fetch(bySoruceUrl).then(response => {
        response.json().then(jsonData => {
            const articles = jsonData.articles;
            articles.sort(sortArticles);

            for (const article of articles) {
                article.urlBySourceCode = article.url + sourceCode;				//add key to differentiate using source code
            }

            res.json(articles);        
            notifyClientSocket(socketId, articles, sourceCode);
        })
    }).catch(err => {
        res.json({ Error: "Unable to retrieve news for source (Source Code: " + sourceCode + ")." });
    });
});


//get news filtered by country
router.get('/news/byCountry/:countryCode', function (req, res) {
    const countryCode = req.params.countryCode;
    const socketId = req.query.socketId;
    const byCountryUrl = 'https://newsapi.org/v2/top-headlines?sortBy=publishedAt&country=' + countryCode + '&apiKey=' + newsApiKey;

    fetch(byCountryUrl).then(response => {
        response.json().then(jsonData => {
            const articles = jsonData.articles;
            articles.sort(sortArticles);

            for (const article of articles) {
                article.urlByCountryCode = article.url + countryCode;			//add key to differentiate using country code
            }

            res.json(articles);        
            notifyClientSocket(socketId, articles, countryCode);
        })
    }).catch(err => {
        res.json({ Error: "Unable to retrieve news for country (Country Code: " + countryCode + ")." });
    });
});


//sort articles by date published and url
function sortArticles(article1, article2) {
    const date1 = new Date(article1.publishedAt);
    const date2 = new Date(article2.publishedAt);

    //sort in descending order for date published and url
    if (date2 > date1) return 1;
    else if (date1 > date2) return -1;

    else {
        return -1 * article1.url.localeCompare(article2.url);
    }
}


//save push subscription identity sent by client
router.post('/pushSubscriptions', function (req, res) {
    const clientIp = getIpAddress(req);
    const pushSub = req.body;

    locateUserByIp(clientIp).then(countryCode => {
        const newSubscription = new PushSubModel({
            countryCode,
            subscriptionString: JSON.stringify(pushSub)
        }); 

        newSubscription.save(function (err, sub) {
            if (err) res.json({ Error: 'Error occurred while saving subscription.' });
            else res.json({ Error: '' });
        })
    });
})


//to send other files/data from the server
router.get('*', function (req, res) {
    const relativeAddress = req.url;                                          //get address of file from request object
    res.sendFile(relativeAddress, { root: rootLocation });
});


let lastNewsUrlObj = {};        //an object of country codes to hold last news urls for each country
for (const countryArr of countries) {
    const countryCode = countryArr[0]
    lastNewsUrlObj[countryCode] = '';
}

//check for and send news update as push notofications to subscribed clients every five minutes
const newsUpdateInterval = 5 * 60 * 1000;
setInterval(() => {
    PushSubModel.find(function (err, subscriptions) {
        if (err) return;

        for (const sub of subscriptions) {
            const id = sub._id;
            const countryCode = sub.countryCode;
            const subscription = JSON.parse(sub.subscriptionString);

            const newsApiUrl = 'https://newsapi.org/v2/top-headlines?country=' + countryCode + '&sortBy=publishedAt&pageSize=1&apiKey=' + newsApiKey;

            fetch(newsApiUrl).then(response => {
                response.json().then(jsonData => {
                    const article = jsonData.articles[0];
                    
                    if (lastNewsUrlObj[countryCode] === article.url) return;

                    lastNewsUrlObj[countryCode] = article.url;

                    sendPushMsg(id, subscription, article);
                })
            }).catch(err => { })
        }
    })

}, newsUpdateInterval);


//send a push message to subscribers
function sendPushMsg(id, subscription, article) {
    sendNotification(subscription, JSON.stringify(article)).catch(err => {
        if (err || err.statusCode === 404 || err.statusCode === 410) {
            deleteSubFromDb(id);
        }
    });
}


//delete unnecessary subscriptions from the database
function deleteSubFromDb(id) {
    PushSubModel.findByIdAndRemove(id, () => console.log('Deleted push subscription id: ' + id));
}



//FOR SOCKET PUBLISHING
const newsSocketClients = {};         //object of handler functions


//add subscribing handler functions for news update
function addNewsHandler(id, handler) {
    newsSocketClients[id + ''] = handler;
}


//notify subscribing functions of news update
function notifyClientSocket(id, newsArr, code) {
    if (id && id != 'none' && newsSocketClients[id]) {
        newsSocketClients[id](newsArr, code);
    }
}


//remove subscribing functions from news update
function removeNewsHandler(id) {
    delete newsSocketClients[id + ''];
}


module.export = {
    router,
    addNewsHandler,
    removeNewsHandler
};

exports.router = router;
exports.addNewsHandler = addNewsHandler;
exports.removeNewsHandler = removeNewsHandler;