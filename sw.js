self.importScripts('js/idb.js');                //import indexed db promise file

const staticCache = 'headlines-static-4';  
const imgCache = 'headlines-content-imgs-4'; 
const allCaches = [staticCache, imgCache];

//handles install event of service worker
self.addEventListener('install', event => {
    const urlsToCache = [
        '/Headlines',
        'js/jquery-3.2.1.slim.min.js',
        'js/popper.min.js',
        'js/bootstrap.min.js',
        'js/idb.js',
        'js/myScript.js',
        'js/mySwTasks.js',
        'css/bootstrap.min.css', 
        'css/myStyles.css'
    ];
    const imgsToCache = [
        'assets/images/noImage.png',
        'assets/images/blockedImage.jpg',
        'assets/images/headlines.ico',
        'assets/images/headlinesRed.jpg'
    ];

    event.waitUntil(
        caches.open(staticCache)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => caches.open(imgCache))
            .then(cache => cache.addAll(imgsToCache))
    );
})


//handles activate event of service worker
self.addEventListener('activate', event => {
     event.waitUntil(
         caches.keys().then(cacheNames => {
             return Promise.all([
					...(cacheNames
                     .filter(cacheName => cacheName.startsWith('headlines') && !allCaches.includes(cacheName))
                     .map(cacheToDelete =>  caches.delete(cacheToDelete))),
					 self.clients.claim()						//force reload via a service worker
				 ])
         })
     );
});


//handles fetch event of service worker
self.addEventListener('fetch', (event) => {
    let requestUrl = new URL(event.request.url);    
    const herokuApi = 'https://headlines-tobe.herokuapp.com';
    
    if (requestUrl.origin === origin || requestUrl.origin === herokuApi) {
        if (requestUrl.pathname.startsWith('/news/')) {
            let response;
            if (requestUrl.pathname.startsWith('/news/allNews')) response = getAllNews(event.request.url);
            else if (requestUrl.pathname === '/news/countries') response = getCountries(event.request.url);
            else if (requestUrl.pathname === '/news/sources') response = getSources(event.request.url);
            else if (requestUrl.pathname.startsWith('/news/byCountry')) response = getByCountry(event.request.url);
            else if (requestUrl.pathname.startsWith('/news/bySource')) response = getBySource(event.request.url);
            else response = fetch(event.request);

            event.respondWith(response);
        }
        else {
            event.respondWith(caches.match(requestUrl.pathname).then(data => {
                return data || fetch(event.request);
            }));
        }

        return;
    }

    //get other responses
    event.respondWith(fetch(event.request).then(response => {
        if (!response.ok && (event.request.url.endsWith('.jpg') || event.request.url.endsWith('.jpg') || event.request.url.endsWith('.jpg'))) {
            const urlArr = event.request.url.split('/');
            const imgHost = urlArr[0] + '//' + urlArr[2];       //attempt to generate referer for blocked/protected images

            return fetch(event.request, {referer: imgHost, referrerPolicy: "no-referrer", mode: "no-cors"});
        }

        return response;
    }));
})


//returns a promise that resolves to an idb promise database
function dbPromise() {
    if (!idb) return Promise.resolve();

    let newDbVersion = 3;
    return idb.open('headline', newDbVersion, upgradeDb => {
        switch (upgradeDb.oldVersion) {
            case 0:
                const allNewsStore = upgradeDb.createObjectStore('allNews', { keyPath: 'url' });
                const countryNewsStore = upgradeDb.createObjectStore('countryNews', { keyPath: 'urlByCountryCode' });
                const sourceNewsStore = upgradeDb.createObjectStore('sourceNews', { keyPath: 'urlBySourceCode' });
            case 1:
                const sourcesStore = upgradeDb.createObjectStore('sources', { keyPath: 'sourceId' });
                const countryStore = upgradeDb.createObjectStore('countries', { keyPath: 'countryId' });
            case 2:
                allNewsStore.createIndex('by-date', ['publishedAt', 'url']);
                countryNewsStore.createIndex('by-date', ['publishedAt', 'url']);
                sourceNewsStore.createIndex('by-date', ['publishedAt', 'url']);
        }
    });
}


//returns all news from idb/network and saves new articles
function getAllNews(url) {
    return dbPromise().then(db => {
        if (!db) return fetchAndSaveAllNews();

        const tx = db.transaction('allNews', 'readwrite');
        const allNewsStore = tx.objectStore('allNews');

        return allNewsStore.index('by-date').getAll().then(allNews => {
            const fetchSaveAllNews = fetchAndSaveAllNews();

            return allNews.length > 0 ? getJsonResponse(allNews.reverse()) : fetchSaveAllNews;
        });
    })

    async function fetchAndSaveAllNews() {
        try {
            const response = await fetch(url);
            const articles = await response.json();
            if (!articles.Error){
                saveNews('allNews', articles).then(() => {
                    cleanAllNewsDb('allNews', 30);
                });
            }

            return getJsonResponse(articles);
        }
        catch (err) {
            return getJsonResponse({ Error: "Network error retrieving updated news. (All)" });
        }
    }
}


    //returns all sources from idb/network and saves sources (to account for changes)
function getSources(url) {
    return dbPromise().then(db => {
        if (!db) return fetchAndSaveSources();

        const tx = db.transaction('sources', 'readwrite');
        const sourcesStore = tx.objectStore('sources');

        return sourcesStore.getAll().then(allSrcObjects => {
            const fetchSaveSources = fetchAndSaveSources();

            return allSrcObjects.length > 0 ? getJsonResponse(allSrcObjects[0].data) : fetchSaveSources;
        });
    })

    async function fetchAndSaveSources() {
        try {
            const response = await fetch(url);
            const sourceObject = await response.json();
            if (sourceObject.Error)
                return getJsonResponse(sourceObject);
            saveValues('sources', sourceObject, 'sourceId', 'allSources');
            return getJsonResponse(sourceObject);
        }
        catch (error) {
            return getJsonResponse({ Error: "Network error retrieving updated sources" });
        }
    }
}


//returns all countries from idb/network and saves countries (to account for changes)
function getCountries(url) {
    return dbPromise().then(db => {
        if (!db) return fetchAndSaveSources();

        const tx = db.transaction('countries', 'readwrite');
        const countriesStore = tx.objectStore('countries');

        return countriesStore.getAll().then(allCountriesObject => {
            const fetchSaveCountries = fetchAndSaveCountries();

            return allCountriesObject.length > 0 ? getJsonResponse(allCountriesObject[0].data) : fetchSaveCountries;
        });
    })

    async function fetchAndSaveCountries() {
        try {
            const response = await fetch(url);
            const countriesObject = await response.json();
            if (countriesObject.Error)
                return getJsonResponse(countriesObject);
            saveValues('countries', countriesObject, 'countryId', 'allCountries');
            return getJsonResponse(countriesObject);
        }
        catch (err) {
            return getJsonResponse({ Error: "Network error retrieving updated countries" });
        }
    }
}


//returns news filtered by country name from idb/network and saves new articles
function getByCountry(url) {
    const pathInfoArr = url.split('/');
    const countryCodeArr = pathInfoArr[pathInfoArr.length - 1].split('?');
    const countryCode = countryCodeArr[0];

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

    async function fetchAndSaveByCountry() {
        try {
            const response = await fetch(url);
            const articles = await response.json();
            if (articles.Error)
                return getJsonResponse(articles);
            saveNews('countryNews', articles).then(val => {
                cleanFilteredNewsDb('countryNews', 20, 'urlByCountryCode', countryCode);
            });
            return getJsonResponse(articles);
        }
        catch (error) {
            return getJsonResponse({ Error: "Error retrieving updated news. (Country Code: " + countryCode + ")" });
        }
    }
}


//returns news filtered by source name from idb/network and saves new articles
function getBySource(url) {
    const pathInfoArr = url.split('/');
    const sourceCodeArr = pathInfoArr[pathInfoArr.length - 1].split('?');
    const sourceCode = sourceCodeArr[0];

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

    async function fetchAndSaveBySource() {
        try {
            const response = await fetch(url);
            const articles = await response.json();
            if (articles.Error)
                return getJsonResponse(articles);
            saveNews('sourceNews', articles).then(val => {
                cleanFilteredNewsDb('sourceNews', 20, 'urlBySourceCode', sourceCode);
            });
            return getJsonResponse(articles);
        }
        catch (error) {
            return getJsonResponse({ Error: "Error retrieving updated news. (Source Code: " + sourceCode + ")" });
        }
    }
}


//helper function to save news articles
function saveNews(storeName, news) {
    return dbPromise().then(db => {
        if (!db) return;

        let tx = db.transaction(storeName, 'readwrite');
        let newsStore = tx.objectStore(storeName);

//works in chrome but not compatible in firefox and most browsers,
//due to specification differences (as regards transactions, indexed db closing and promises)
        //let promiseChain = Promise.resolve();
        //news.forEach(singleNews => {
        //    promiseChain = promiseChain.then(val => newsStore.put(singleNews));
        //});

        //return promiseChain;

        return Promise.all(
            news.map(singleNews => newsStore.put(singleNews))
        );
    })
}

//helper function to save countries and sources
function saveValues(storeName, object, objectId, id) {
    return dbPromise().then(db => {
        if (!db) return;

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        const allObjects = {};
        allObjects[objectId] = id;
        allObjects['data'] = object;
        
        return store.put(allObjects)
    })
}


//function to clean general news store
function cleanAllNewsDb(storeName, count) {
    return dbPromise().then(db => {
        if (!db) return;

        let tx = db.transaction(storeName, 'readwrite');
        let store = tx.objectStore(storeName);

        return store.index('by-date').getAll().then(news => {
            news = news.reverse();

            tx = db.transaction(storeName, 'readwrite');
            store = tx.objectStore(storeName);

            let promiseArr = [];
            for (let i = count; i < news.length; i++) {
                promiseArr.push(
                    store.delete(news[i]['url'])
                );
            }

            return Promise.all(promiseArr);
        })
    });
}


//due to specification differences (as regards transactions, indexed db closing and promises), 
//works in chrome but not compatible in firefox and most browsers.
//function to clean general news store (not used)
function cleanAllNewsDb_Old(storeName, count) {
    return dbPromise().then(db => {
        if (!db) return;

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        return store.index('by-date').openCursor(null, 'prev').then(cursor => {
            if (!cursor) return;
            return cursor.advance(count);
        }).then(function deleteExtras(cursor) {
            if (!cursor) return;
            cursor.delete();
            cursor.continue().then(deleteExtras);
        })
    });
}


//function to clean up filtered new store
function cleanFilteredNewsDb(storeName, filterCount, key, filter) {
    return dbPromise().then(db => {
        if (!db) return;

        let tx = db.transaction(storeName, 'readwrite');
        let store = tx.objectStore(storeName);

        return store.index('by-date').getAll().then(news => {
            news = news.reverse();
            const maxCount = 1000;

            tx = db.transaction(storeName, 'readwrite');
            store = tx.objectStore(storeName);

            let promiseArr = [];        

            //for total news in source/country store
            for (let i = maxCount; i < news.length; i++) {
                promiseArr.push(
                    store.delete(news[i][key])
                );
            }

            //for total news by source/country (filterCount = maximum news for each source/country)
            const filteredNews = news.filter(singleNews => singleNews[key].endsWith(filter));
            for (let i = filterCount; i < filteredNews.length; i++) {
                promiseArr.push(
                    store.delete(filteredNews[i][key])
                );
            }

            return Promise.all(promiseArr);
        });
    });
}



//return a json formatted response
function getJsonResponse(jsonData) {
    return new Response(JSON.stringify(jsonData), { headers: { 'Content-Type': 'application/json' } });
}


//respond to message events on service worker
self.addEventListener('message', event => {
    if (event.data.key == 'skipWaiting') self.skipWaiting();
})


//respond to push notification arrival
self.addEventListener('push', event => {
    const promiseChain = self.registration.getNotifications().then(notifications => {
        const extraMsg = notifications.length > 0 ? ' (+' + notifications.length + ' message(s))' : '';
        const title = 'LATEST HEADLINE ' + extraMsg;
        const article = event.data.json();
        const options = {
            body: article.title,
            icon: 'assets/images/headlines.ico',
            image: article.urlToImage || '/assets/images/noImage.png',
            vibrate: [500, 100, 300, 100, 200],
            tag: 'newsNotiification',
            data: article,
            actions: [{ action: 'open', title: 'OPEN', icon: 'assets/images/headlines.ico' },
                { action: 'dismiss', title: 'DISMISS', icon: 'assets/images/headlinesRed.jpg' }]
        }

        return self.registration.showNotification(title, options);
    })

    event.waitUntil(promiseChain);
});


//respond to push notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') {
        return;
    }

    const urlToOpen = self.location.origin + '/'; 
    const article = event.notification.data;

    const promiseChain = saveNews('allNews', [article]).then(val => {
        return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(myClients => {
            //check for open client window
			for (const myClient of myClients) {
                if (myClient.url === urlToOpen) {
                    return myClient.focus().then(currentClient => {
                        return currentClient.postMessage({ article, shouldLoadArticle: true });                 	//send article to focused client
                    })
				}
			}

            //open new window if none exists
            return clients.openWindow(urlToOpen).then(currentClient => {
				//send message to client after half a second to avoid blocks during page load. Article is already retrieved from indexedDb when window loads
                return new Promise(resolve => setTimeout(() => resolve('done waiting'), 500))
                    .then(val => currentClient.postMessage({ shouldLoadArticle: false }));   
			});
		})		
	})

    event.waitUntil(promiseChain);
})