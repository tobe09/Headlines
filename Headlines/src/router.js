//import express server
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

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
    const newsApiUrl = 'https://newsapi.org/v2/top-headlines?category=technology&pageSize=' + pageSize + '&apiKey=' + newsApiKey; //top-headlines

    fetch(newsApiUrl).then(response => {
        response.json().then(jsonData => {
            jsonData.articles.sort(sortArticles)
            res.json(jsonData.articles);        //send response back to client
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
            const sources = jsonData.sources;
            let techSources = [];

            for (const source of sources) {
                if (source.category === 'technology') {
                    techSources.push([source.id, source.name]);
                }
            }

            res.json(techSources);
        })
    }).catch(err => {
        res.json({ Error: "Network Connection error occured while fetching sources from the api" });
    });
});


//get all countries
router.get('/sw/countries', function (req, res) {
    const countries = [['ae', 'U.A.E'], ['ar', 'Argentina'], ['au', 'Australia'], ['br', 'Brazil'], ['ca', 'Canada'], ['de', 'Germany'],
        ['fr', 'France'], ['gb', 'Great Britain'], ['gr', 'Greece'], ['it', 'Italy'], ['jp', 'Japan'], ['kr', 'Korea'], ['ng', 'Nigeria'], ['nz', 'New Zealand'],
        ['ph', 'Phillipines'], ['ru', 'Russia'], ['tr', 'Turkey'], ['us', 'United States'], ['ve', 'Venezuela'], ['za', 'South Africa']];

    countries.sort((country1, country2) => country1[1].toLowerCase().localeCompare(country2[1].toLowerCase()));
    res.json(countries);
});


//get news filtered by source
router.get('/sw/bySource/:source', function (req, res) {
    const source = req.params.source;
    const bySoruceUrl = 'https://newsapi.org/v2/top-headlines?sources=' + source + '&apiKey=' + newsApiKey;

    fetch(bySoruceUrl).then(response => {
        response.json().then(jsonData => {
            jsonData.articles.sort(sortArticles)
            res.json(jsonData.articles);        //send response back to client
        })
    }).catch(err => {
        res.json({ Error: "Network Connection error occured while filtering by selected source" });
    });
});


//get news filtered by country
router.get('/sw/byCountry/:country', function (req, res) {
    const country = req.params.country;
    const byCountryUrl = 'https://newsapi.org/v2/top-headlines?country=' + country + '&apiKey=' + newsApiKey;

    fetch(byCountryUrl).then(response => {
        response.json().then(jsonData => {
            jsonData.articles.sort(sortArticles)
            res.json(jsonData.articles);        //send response back to client
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

//to send other files/data from the server
router.get('*', function (req, res) {
    var relativeAddress = req.url;                                          //get address of file from request object
    res.sendFile(relativeAddress, { root: rootLocation });
});


exports.router = router
