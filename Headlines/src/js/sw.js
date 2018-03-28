self.importScripts('Headlines/node_modules/idb/lib/idb.js');

const newCache = 'headlines-static-v3';
const imgCache = 'headlines-content-imgs';
const allCaches = [newCache, imgCache];

self.addEventListener('install', event => {
    //remove scripts and use cdn version later//
    const urlToCache = [
        '/',
        'Headlines/node_modules/jquery/dist/jquery.min.js',
        'Headlines/node_modules/popper.js/dist/popper.min.js',
        'Headlines/node_modules/bootstrap/dist/js/bootstrap.min.js',
        'Headlines/src/js/myScript.js',
        'Headlines/src/js/mySwTasks.js',
        'Headlines/node_modules/bootstrap/dist/css/bootstrap.min.css',
        'Headlines/src/css/myStyles.css'        
    ];
    const imgToCache = ['Headlines/src/assets/NoImage.png'];

    event.waitUntil((function () {
        caches.open(newCache).then(cache => cache.addAll(urlToCache));
        caches.open(imgCache).then(cache => cache.addAll(imgToCache));
    })());
})

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(             //can simply return the promise
                cacheNames
                    .filter(cacheName => cacheName.startsWith('headlines') && !allCaches.includes(cacheName))
                    .map(cacheToDelete => caches.delete(cacheToDelete))
            )
        })
    );
});

self.addEventListener('fetch', (event) => {
    let requestUrl = new URL(event.request.url);
    //on the unlikely chance that the service worker serves more than one origin
    if (requestUrl.origin === location.origin) {
        if (!requestUrl.pathname.startsWith('/sw/')) {      //does not need sw cacheing
            event.respondWith(caches.match(requestUrl.pathname).then(val => {
                return val || fetch(event.request);
            }));
        }
        else {
            if (requestUrl.pathname === '/sw/allNews') event.respondWith(getAllNews());
            else if (requestUrl.pathname === '/sw/countries') event.respondWith(getCountries());
            else if (requestUrl.pathname === '/sw/sources') event.respondWith(getSources());
            else if (requestUrl.pathname.startsWith('/sw/byCountry')) event.respondWith(getByCountry(requestUrl.pathname));
            else if (requestUrl.pathname.startsWith('/sw/bySource')) event.respondWith(getBySource(requestUrl.pathname));
            else getAllNews();
        }
        return;
    }

    event.respondWith(fetch(event.request));
})

function dbPromise() {
    let newDbVersion = 3;
    return idb.open('headline', newDbVersion, upgradeDb => {
        switch (upgradeDb.oldVersion) {
            case 0:
                const allNewsStore = upgradeDb.createObjectStore('allNews', { keyPath: 'url' });
                const countryNewsStore = upgradeDb.createObjectStore('countryNews', { keyPath: 'urlByCountryCode' });
                const sourceNewsStore = upgradeDb.createObjectStore('sourceNews', { keyPath: 'urlBySourceCode' });
            case 1:
                const sourcesStore = upgradeDb.createObjectStore('sources', { keyPath: 'sourceId' });
            case 2:
                allNewsStore.createIndex('by-date', ['publishedAt', 'source.name']);
                countryNewsStore.createIndex('by-date', ['publishedAt', 'source.name']);
                sourceNewsStore.createIndex('by-date', ['publishedAt', 'source.name']);
        }
    });
}

const newsApiKey = '11bae20ea48e474890528e504ea733e2';

function getAllNews() {
    const pageSize = 30;
    const newsApiUrl = 'https://newsapi.org/v2/top-headlines?category=technology&pageSize=' + pageSize + '&apiKey=' + newsApiKey; //top-headlines
    
    return dbPromise().then(db => {
        if (!db) return fetchAndSaveAllNews();

        const tx = db.transaction('allNews', 'readwrite');
        const allNewsStore = tx.objectStore('allNews');

        return allNewsStore.index('by-date').getAll().then(allNews => {
            const fetchSaveAllNews = fetchAndSaveAllNews();
            return allNews.length > 0 ? getJsonResponse(allNews.reverse()) : fetchSaveAllNews;
        });
    })

    function fetchAndSaveAllNews() {
        return fetch(newsApiUrl).then(response => {
            return response.json().then(jsonData => {
                let articles = jsonData.articles
                articles.sort(sortArticles)

                saveNews('allNews', articles);
                cleanAllNewsDb('allNews', 30);
                return getJsonResponse(articles);
            })
        }).catch(err => {
            return getJsonResponse({ Error: "Network Connection error occured while fetching news from the api" });
        });
    }
};

function saveNews(storeName, news) {
    dbPromise().then(db => {
        if (!db) return;

        const tx = db.transaction(storeName, 'readwrite');
        const newsStore = tx.objectStore(storeName);

        news.forEach(singleNews => {
            newsStore.put(singleNews);
        })
    })
}

function saveSources(sources, storeName = 'sources') {
    saveNews(storeName, sources);
}

function cleanAllNewsDb(storeName, count) {
    dbPromise().then(db => {
        if (!db) return;

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.index('by-date').openCursor(null, 'prev').then(cursor => {
            if (!cursor) return;
            return cursor.advance(count);
        }).then(function deleteExtras(cursor) {
            if (!cursor) return;
            cursor.delete();
            cursor.continue().then(deleteExtras);
        })
    });
}

function cleanFilteredNewsDb(storeName, count, key, filter) {
    dbPromise().then(db => {
        if (!db) return;

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        store.index('by-date').getAll().then(news => {
            const filteredNews = news.reverse().filter(singleNews => singleNews[key].endsWith(filter));
            for (let i = count; i < filteredNews.length; i++) {
                store.delete(filteredNews[i][key]);
            }
        })
    });
}

function getCountries() {
    const countries = [['ae', 'U.A.E'], ['ar', 'Argentina'], ['au', 'Australia'], ['br', 'Brazil'], ['ca', 'Canada'], ['de', 'Germany'],
        ['fr', 'France'], ['gb', 'England'], ['gr', 'Greece'], ['it', 'Italy'], ['jp', 'Japan'], ['kr', 'Korea'], ['ng', 'Nigeria'], ['nz', 'New Zealand'],
        ['ph', 'Phillipines'], ['ru', 'Russia'], ['tr', 'Turkey'], ['us', 'United States'], ['ve', 'Venezuela'], ['za', 'South Africa']];

    countries.sort((country1, country2) => country1[1].toLowerCase().localeCompare(country2[1].toLowerCase()));

    return getJsonResponse(countries);
}

function getSources() {
    const sourcesUrl = 'https://newsapi.org/v2/sources?apiKey=' + newsApiKey;
    
    return dbPromise().then(db => {
        if (!db) return fetchAndSaveSources();

        const tx = db.transaction('sources', 'readwrite');
        const sourcesStore = tx.objectStore('sources');

        return sourcesStore.getAll().then(sourcesData => {
            const fetchSaveSources = fetchAndSaveSources();
            let sources = [];
            for (const i in sourcesData) {
                sources.push(sourcesData[i].data);
            }
            return sources.length > 0 ? getJsonResponse(sources) : fetchSaveSources;
        });
    })

    function fetchAndSaveSources() {
        return fetch(sourcesUrl).then(response => {
            return response.json().then(jsonData => {
                const sources = jsonData.sources;
                let techSources = [];
                let techSourceData = [];

                for (const source of sources) {
                    if (source.category === 'technology') {
                        techSources.push([source.id, source.name]);
                        techSourceData.push({ sourceId: source.id, data: [source.id, source.name] });
                    }
                }

                saveSources(techSourceData);
                return getJsonResponse(techSources);
            })
        }).catch(error => {
            return getJsonResponse({ Error: "Network Connection error occured while fetching sources from the api" });
        });
    }
}

function getByCountry(path) {
    const pathInfo = path.split('/')
    const countryCode = pathInfo[pathInfo.length - 1];
    const byCountryUrl = 'https://newsapi.org/v2/top-headlines?country=' + countryCode + '&apiKey=' + newsApiKey;
    
    return dbPromise().then(db => {
        if (!db) return fetchAndSaveByCountry();

        const tx = db.transaction('countryNews', 'readwrite');
        const countryNewsStore = tx.objectStore('countryNews');

        return countryNewsStore.index('by-date').getAll().then(countryNews => {
            const fetchSaveCountryNews = fetchAndSaveByCountry();
            const byCountryNews = countryNews.filter(singleNews => singleNews.urlByCountryCode.endsWith(countryCode));
            return byCountryNews.length > 0 ? getJsonResponse(byCountryNews.reverse()) : fetchSaveCountryNews;
        });
    })

    function fetchAndSaveByCountry() {
        return fetch(byCountryUrl).then(response => {
            return response.json().then(jsonData => {
                const articles = jsonData.articles;
                articles.sort(sortArticles)

                for (const article of articles) {
                    article.urlByCountryCode = article.url + countryCode;
                }

                saveNews('countryNews', articles);
                cleanFilteredNewsDb('countryNews', 20, 'urlByCountryCode', countryCode);
                return getJsonResponse(articles);
            })
        }).catch(error => {
            return getJsonResponse({ Error: "Network Connection error occured while filtering by selected country" });
        });
    }
}

function getBySource(path) {
    const pathInfo = path.split('/')
    const sourceCode = pathInfo[pathInfo.length - 1];
    const bySoruceUrl = 'https://newsapi.org/v2/top-headlines?sources=' + sourceCode + '&apiKey=' + newsApiKey;

    return dbPromise().then(db => {
        if (!db) return fetchAndSaveByCountry();

        const tx = db.transaction('sourceNews', 'readwrite');
        const sourceNewsStore = tx.objectStore('sourceNews');

        return sourceNewsStore.index('by-date').getAll().then(sourceNews => {
            const fetchSaveSourceNews = fetchAndSaveBySource();
            const bySourceNews = sourceNews.filter(singleNews => singleNews.urlBySourceCode.endsWith(sourceCode));
            return bySourceNews.length > 0 ? getJsonResponse(bySourceNews.reverse()) : fetchSaveSourceNews;
        });
    })

    function fetchAndSaveBySource() {
        return fetch(bySoruceUrl).then(response => {
            return response.json().then(jsonData => {
                const articles = jsonData.articles;
                articles.sort(sortArticles)

                for (const article of articles) {
                    article.urlBySourceCode = article.url + sourceCode;
                }

                saveNews('sourceNews', articles);
                cleanFilteredNewsDb('sourceNews', 20, 'urlBySourceCode', sourceCode);
                return getJsonResponse(jsonData.articles);
            })
        }).catch(error => {
            return getJsonResponse({ Error: "Network Connection error occured while filtering by selected source" });
        });
    }
}

function getJsonResponse(jsonData) {
    return new Response(JSON.stringify(jsonData), { headers: { 'Content-Type': 'application/json' } });
}

function sortArticles(article1, article2) {
    const date1 = new Date(article1.publishedAt);
    const date2 = new Date(article2.publishedAt);
    //sort in date in descending order or by name for same date in ascending order
    if (date2 > date1) return 1;
    else if (date1 > date2) return -1;
    else {
        return article1.source.name.localeCompare(article2.source.name);
    }
}

self.addEventListener('message', event => {
    if (event.data.key == 'skipWaiting') self.skipWaiting();
})