//import express server
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

const webPush = require('web-push');
//const vapidKeys = webPush.generateVAPIDKeys();
const publicKey = 'BJbGel5u8l_RfmWqO1yW-Hshdo4HfLCS8FlNMx0rBVIEBOR2a3h_NDbw4EGvJfv_vKdAhFrq5NdG1Q3JLT5Ux4o'; //vapidKeys.publicKey; 
const privateKey = 'U0WDz_q16h5ZMxrqI-zt3j0sTPqi0oLaBA17cudMMZw'; //vapidKeys.privateKey;
webPush.setVapidDetails('mailto:chineketobenna@gmail.com', publicKey, privateKey);

const mongoose = require('mongoose');
const localAddress = 'mongodb://localhost:27017/headlinesdb';                                  //local development address
const hostAddress = 'mongodb://tobe09:nkeody09@ds121955.mlab.com:21955/headlinesdb';             //mLab repository address
mongoose.connect(localAddress);

const dbConn = mongoose.connection;
dbConn.on('error', console.error.bind(console, 'connection error:'));
dbConn.once('open', () => console.log('Connected to mongo db server'));

var uniqueValidator = require('mongoose-unique-validator');
const pushSubSchema = mongoose.Schema;
const pushSubDoc = new pushSubSchema({
    subscriptionString: { type: String, required: true, unique: true },
    dateAdded: { type: Date, default: Date.now }
}).plugin(uniqueValidator);
const PushSubModel = mongoose.model('push_subscriptions', pushSubDoc);

const newsApiKey = '11bae20ea48e474890528e504ea733e2';

//to locate application files (relative to application root)
const path = require('path');
const rootLocation = path.join(__dirname, '../../');


//get web page
router.get('/', function (req, res) {
    res.sendFile('Headlines/src/index.html', { root: rootLocation });
})


//get service worker
router.get('/sw.js', function (req, res) {
    res.sendFile('Headlines/src/js/sw.js', { root: rootLocation });
})


//get all news
router.get('/sw/allNews', function (req, res) {
    const pageSize = 30;
    const newsApiUrl = 'https://newsapi.org/v2/top-headlines?sortBy=publishedAt&country=ng&pageSize=' + pageSize + '&apiKey=' + newsApiKey; //top-headlines

    fetch(newsApiUrl).then(response => {
        response.json().then(jsonData => {
            const articles = jsonData.articles;
            articles.sort(sortArticles)
            notifySubscr(articles,'all');
            res.json(articles);             //send response back to client
        })
    }).catch(err => {
        res.json({ Error: "Network Connection error occured while fetching news from the api" });
    });
});


//get all sources
router.get('/sw/sources', function (req, res) {
    const sourcesUrl = 'https://newsapi.org/v2/sources?apiKey=' + newsApiKey;

    fetch(sourcesUrl).then(response => {
        response.json().then(jsonData => {
            const sourcesData = jsonData.sources;
            const sourceGroup = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'];
            let sourceObject = {};

            for (const srcGrp of sourceGroup) {
                sourceObject[srcGrp] = [];
            }

            for (const source of sourcesData) {
                sourceObject[source.category].push([source.id, source.name]);
            }

            for (const category in sourceObject) {
                sourceObject[category].sort((source1, source2) => source1[1].toLowerCase().localeCompare(source2[1].toLowerCase()));
            }
            
            res.json(sourceObject);
        })
    }).catch(err => {
        res.json({ Error: "Network Connection error occured while fetching sources from the api" });
    });
});


//get all countries
router.get('/sw/countries', function (req, res) {
    const countries = [['ar', 'Argentina'], ['au', 'Australia'], ['at', 'Austria'], ['be', 'Belgium'], ['br', 'Brazil'], ['bg', 'Bulgaria'],
['ca', 'Canada'], ['cn', 'China'], ['co', 'Columbia'], ['cu', 'Cuba'], ['cz', 'Czech Republic'], ['eg', 'Egypt'], ['fr', 'France'],
['de', 'Germany'], ['gr', 'Greece'], ['hk', 'Hong Kong'], ['hu', 'Hungary'], ['in', 'India'], ['id', 'Indonesia'], ['ie', 'Ireland'],
['il', 'Israel'], ['it', 'Italy'], ['jp', 'Japan'], ['lv', 'Latvia'], ['lt', 'Lituania'], ['my', 'Malaysia'], ['mx', 'Mexico'], ['ma', 'Morocco'],
['nl', 'NetherLand'], ['mz', 'New Zealand'], ['ng', 'Nigeria'], ['ph', 'Philippines'], ['pl', 'Poland'], ['pt', 'Portuga'], ['ro', 'Romania'],
['ru', 'Russia'], ['sa', 'Saudi Arabia'], ['rs', 'Serbia'], ['sg', 'Singapore'], ['sk', 'Slovakia'], ['si', 'Slovenia'], ['za', 'Soth Africa'],
['kr', 'South Korea'], ['se', 'Sweden'], ['ch', 'Switzerland'], ['tw', 'Taiwan'], ['th', 'Thailand'], ['tr', 'Turkey'], ['ae', 'United Arab Emirates'],
['ua', 'Ukraine'], ['gb', 'United Kingdom'], ['us', 'United States'], ['ve', 'Venezuela']];

    countries.sort((country1, country2) => country1[1].toLowerCase().localeCompare(country2[1].toLowerCase()));
    res.json(countries);
});


//get news filtered by source
router.get('/sw/bySource/:sourceCode', function (req, res) {
    const sourceCode = req.params.sourceCode;
    const bySoruceUrl = 'https://newsapi.org/v2/top-headlines?sortBy=publishedAt&sources=' + sourceCode + '&apiKey=' + newsApiKey;

    fetch(bySoruceUrl).then(response => {
        response.json().then(jsonData => {
            const articles = jsonData.articles;
            articles.sort(sortArticles)

            for (const article of articles) {
                article.urlBySourceCode = article.url + sourceCode;
            }

            notifySubscr(articles, sourceCode);
            res.json(articles);        //send response back to client
        })
    }).catch(err => {
        res.json({ Error: "Network Connection error occured while filtering by selected source" });
    });
});


//get news filtered by country
router.get('/sw/byCountry/:countryCode', function (req, res) {
    const countryCode = req.params.countryCode;
    const byCountryUrl = 'https://newsapi.org/v2/top-headlines?sortBy=publishedAt&country=' + countryCode + '&apiKey=' + newsApiKey;

    fetch(byCountryUrl).then(response => {
        response.json().then(jsonData => {
            const articles = jsonData.articles;
            articles.sort(sortArticles)

            for (const article of articles) {
                article.urlByCountryCode = article.url + countryCode;
            }

            notifySubscr(articles, countryCode);
            res.json(articles);        //send response back to client
        })
    }).catch(err => {
        res.json({ Error: "Network Connection error occured while filtering by selected country" });
    });
});

function sortArticles(article1, article2) {
    const date1 = new Date(article1.publishedAt);
    const date2 = new Date(article2.publishedAt);
    //sort in descending order
    if (date2 > date1) return 1;
    else if (date1 > date2) return -1;
    else {
        return article1.source.name.localeCompare(article2.source.name);
    }
}


router.post('/pushSubscriptions', function (req, res) {
    const pushSub = req.body;

    const newSubscription = new PushSubModel({
        subscriptionString: JSON.stringify(pushSub)
    });

    newSubscription.save(function (err, sub) {
        if (err) res.json({ Error: 'Error occurred while saving subscription' });
        else res.json({ Error: '' });
    })
})

//to send other files/data from the server
router.get('*', function (req, res) {
    var relativeAddress = req.url;                                          //get address of file from request object
    res.sendFile(relativeAddress, { root: rootLocation });
});

let lastNewsUrl;

const newsUpdateInterval = setInterval(() => {
    const newsApiUrl = 'https://newsapi.org/v2/top-headlines?country=ng&sortBy=publishedAt&pageSize=1&apiKey=' + newsApiKey; //top-headlines

    fetch(newsApiUrl).then(response => {
        response.json().then(jsonData => {
            const article = jsonData.articles[0];

            if (lastNewsUrl == null || lastNewsUrl === article.url) {
                if (lastNewsUrl == null) lastNewsUrl = article.url;
                return;
            }

            lastNewsUrl = article.url;

            PushSubModel.find(function (err, subscriptions) {
                if (err) return;

                for (const sub of subscriptions) {
                    const id = sub._id;
                    const subscription = JSON.parse(sub.subscriptionString);
                    sendPushMsg(id, subscription, article);
                }
            })
        })
    }).catch(err => { })

}, 5 * 60 * 1000);

function sendPushMsg(id, subscription, article) {
    webPush.sendNotification(subscription, JSON.stringify(article)).catch(err => {
        if (err || err.statusCode === 404 || err.statusCode === 410) {
            deleteSubFromDb(id);
        }
    });
}

function deleteSubFromDb(id) {
    PushSubModel.findByIdAndRemove(id, (err, val) => { });
}

//for socket publishing
const newsSubsc=[];

function setSubscr(handler){
    newsSubsc.push(handler); 
}

function notifySubscr(newsArr, code){
    for(const handler of newsSubsc){
        handler(newsArr, code);
    }
}


module.exports = {
    router,
    setSubscr
};
