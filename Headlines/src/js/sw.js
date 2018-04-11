self.importScripts('Headlines/node_modules/idb/lib/idb.js');


const newCache = 'headlines-static-4';
const imgCache = 'headlines-content-imgs';
const allCaches = [newCache, imgCache];
//

self.addEventListener('install', event => {
    const urlToCache = [
        '/',
        'Headlines/node_modules/jquery/dist/jquery.min.js',
        'Headlines/node_modules/popper.js/dist/popper.min.js',
        'Headlines/node_modules/bootstrap/dist/js/bootstrap.min.js',
        'Headlines/src/js/myScript.js',
        'Headlines/src/js/mySwTasks.js',
        'Headlines/node_modules/bootstrap/dist/css/bootstrap.min.css',
        'Headlines/src/css/myStyles.css',
        'socket.io/socket.io.js'
    ];
    const imgToCache = [
        'Headlines/src/assets/images/noImage.png',
        'Headlines/src/assets/images/headlines.ico',
        'Headlines/src/assets/images/headlinesRed.jpg'
    ];

    event.waitUntil((function () {
        return caches.open(newCache).then(cache => cache.addAll(urlToCache))
            .then(() => caches.open(imgCache)).then(cache => cache.addAll(imgToCache));
    })());
})


self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(            
                cacheNames
                    .filter(cacheName => cacheName.startsWith('headlines') && !allCaches.includes(cacheName))
                    .map(cacheToDelete => caches.delete(cacheToDelete))
            )
        })
    );
});


self.addEventListener('fetch', (event) => {
    let requestUrl = new URL(event.request.url);
    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname.startsWith('/sw/')) {
            let response;
            if (requestUrl.pathname === '/sw/allNews') response = getAllNews();
            else if (requestUrl.pathname === '/sw/countries') response = getCountries();
            else if (requestUrl.pathname === '/sw/sources') response = getSources();
            else if (requestUrl.pathname.startsWith('/sw/byCountry')) response = getByCountry(requestUrl.pathname);
            else if (requestUrl.pathname.startsWith('/sw/bySource')) response = getBySource(requestUrl.pathname);
            else response = getAllNews();

            event.respondWith(response);
        }
        else {
            event.respondWith(caches.match(requestUrl.pathname).then(data => {
                return data || fetch(event.request);
            }));
        }
        return;
    }

    event.respondWith(fetch(event.request));
})


function dbPromise() {
    let newDbVersion = 4;
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
            case 3:
                const countryStore = upgradeDb.createObjectStore('countries', { keyPath: 'countryId' });
        }
    });
}


function getAllNews() {
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
        return fetch('/sw/allNews').then(response => {
            return response.json().then(articles => {
                if (articles.Error) return getJsonResponse(articles);

                saveNews('allNews', articles).then(() => {
                    cleanAllNewsDb('allNews', 30)
                })

                return getJsonResponse(articles);
            })
        }).catch(err => {
            return getJsonResponse({ Error: "Network Connection error occured while fetching news from the api" });
        });
    }
};


function getCountries() {
    return dbPromise().then(db => {
        if (!db) return fetchAndSaveSources();

        const tx = db.transaction('countries', 'readwrite');
        const countriesStore = tx.objectStore('countries');

        return countriesStore.getAll().then(allCountriesObject => {
            return allCountriesObject.length > 0 ? getJsonResponse(allCountriesObject[0].data) : fetchAndSaveCountries();
        });
    })

    function fetchAndSaveCountries() {
        return fetch('/sw/countries').then(response => {
            return response.json().then(countries => {
                saveCountries(countries);
                return getJsonResponse(countries);
            })
        }).catch(err => {
            return getJsonResponse({ Error: "Network Connection error occured while fetching countries from the server" });
        });
    }
}


function getSources() {
    return dbPromise().then(db => {
        if (!db) return fetchAndSaveSources();

        const tx = db.transaction('sources', 'readwrite');
        const sourcesStore = tx.objectStore('sources');
        
        return sourcesStore.getAll().then(allSrcObjects => {
            return allSrcObjects.length > 0 ? getJsonResponse(allSrcObjects[0].data) : fetchAndSaveSources();
        });
    })

    function fetchAndSaveSources() {
        return fetch(sourcesUrl).then(response => {
            return response.json().then(sourceObject => {
                saveSources(sourceObject);

                return getJsonResponse(sourceObject);
            })
        }).catch(error => {
            return getJsonResponse({ Error: "Network Connection error occured while fetching sources from the api" });
        });
    }
}


function getByCountry(path) {
    const pathInfo = path.split('/')
    const countryCode = pathInfo[pathInfo.length - 1];

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
        return fetch('sw/byCountry/' + countryCode).then(response => {
            return response.json().then(articles => {
                if (articles.Error) return getJsonResponse(articles);

                saveNews('countryNews', articles).then(() => {
                    cleanFilteredNewsDb('countryNews', 20, 'urlByCountryCode', countryCode)
                });
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

    return dbPromise().then(db => {
        if (!db) return fetchAndSaveBySource();

        const tx = db.transaction('sourceNews', 'readwrite');
        const sourceNewsStore = tx.objectStore('sourceNews');

    return sourceNewsStore.index('by-date').getAll().then(sourceNews => {
            const fetchSaveSourceNews = fetchAndSaveBySource();
            const bySourceNews = sourceNews.filter(singleNews => singleNews.urlBySourceCode.endsWith(sourceCode));
            return bySourceNews.length > 0 ? getJsonResponse(bySourceNews.reverse()) : fetchSaveSourceNews;
        });
    })

    function fetchAndSaveBySource() {
        return fetch('sw/bySource/'+sourceCode).then(response => {
            return response.json().then(articles => {
                if (articles.Error) return getJsonResponse(articles);

                saveNews('sourceNews', articles).then(val => { 
                    cleanFilteredNewsDb('sourceNews', 20, 'urlBySourceCode', sourceCode);
                })

                return getJsonResponse(articles);
            })
        }).catch(error => {
            return getJsonResponse({ Error: "Network Connection error occured while filtering by selected source" });
        });
    }
}


function saveNews(storeName, news) {
    return dbPromise().then(db => {
        if (!db) return;

        const tx = db.transaction(storeName, 'readwrite');
        const newsStore = tx.objectStore(storeName);

        let promiseChain = Promise.resolve();

        news.forEach(singleNews => {
            promiseChain = promiseChain.then(() => newsStore.put(singleNews));
        })

        return promiseChain;
    })
}


function saveSources(sourceObject) {
    return dbPromise().then(db => {
        if (!db) return;

        const tx = db.transaction('sources', 'readwrite');
        const sourcesStore = tx.objectStore('sources');

        let allSrcObjects = { sourceId: 'allSources', data: sourceObject };

        return sourcesStore.put(allSrcObjects);
    })
}


function saveCountries(countries) {
    return dbPromise().then(db => {
        if (!db) return;

        const tx = db.transaction('countries', 'readwrite');
        const countriesStore = tx.objectStore('countries');

        let allCountriesObjects = { countryId: 'allCountries', data: countries };

        return countriesStore.put(allCountriesObjects);
    })
}


function cleanAllNewsDb(storeName, count) {
    return dbPromise().then(db => {
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
    return dbPromise().then(db => {
        if (!db) return;

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        return store.index('by-date').getAll().then(news => {
            const filteredNews = news.reverse().filter(singleNews => singleNews[key].endsWith(filter));
            for (let i = count; i < filteredNews.length; i++) {
                store.delete(filteredNews[i][key]);
            }
        })
    });
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


function getJsonResponse(jsonData) {
    return new Response(JSON.stringify(jsonData), { headers: { 'Content-Type': 'application/json' } });
}


self.addEventListener('message', event => {
    if (event.data.key == 'skipWaiting') self.skipWaiting();
})


self.addEventListener('push', event => {
    const promiseChain = self.registration.getNotifications().then(notifications => {
        const extraMsg = notifications.length > 0 ? ' (+' + notifications.length + ' message(s))' : '';
        const title = 'LATEST HEADLINE ' + extraMsg;
        const article = event.data.json();
        const options = {
            body: article.title,
            icon: 'Headlines/src/assets/images/headlines.ico',
            image: article.urlToImage || 'Headlines/src/assets/images/noImage.png',
            vibrate: [500, 100, 400, 80, 300, 80, 200, 60, 100, 50, 80],
            tag: 'newsNotiification',
            actions: [{ action: 'open', title: 'OPEN', icon: 'Headlines/src/assets/images/headlines.ico' },
                { action: 'dismiss', title: 'DISMISS', icon: 'Headlines/src/assets/images/headlinesRed.jpg' }]
        }

        return self.registration.showNotification(title, options);
    })

    event.waitUntil(promiseChain);
})


self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') {
        return;
    }
    const urlToOpen = self.location.origin + '/';     //new URL('localhost:1337', self.location.origin).href;
    const promiseChain = clients.matchAll({ type: 'window', includeUncontrolled: true }).then(myClients => {
        for (const myClient of myClients) {
            if (myClient.url === urlToOpen) {
                return myClient.focus().then(val => {
                    return myClient.postMessage({ key: 'refresh' });
                })
            }
        }

        return clients.openWindow(urlToOpen);
    })

    event.waitUntil(promiseChain);
})