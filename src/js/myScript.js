$(function () {
    basicMsg("Loading...");

    showCountries();
    showSources();
    showAllNews();
    notificationSetup();

    $('#countriesList').on('change', function () {
        const countryCode = $(this).find(":selected").val();
        const countryName = $(this).find(":selected").text();
        handleCountryChange(countryCode, countryName);
    });

    $('#sourcesList').on('change', function () {
        const sourceCode = $(this).find(":selected").val();
        const sourceName = $(this).find(":selected").text();
        handleSourceChange(sourceCode, sourceName);
    });
})


let lastNewsUrl, lastNewsCode, lastNewsTime;


//function to get and display all news
function showAllNews() {
    dataApi('GET', 'sw/allNews?socketId=' + getSocketId()).then(allNews => {
        if (allNews.Error != null) {
            errorMsg(allNews.Error);
            return;
        }

        lastNewsUrl = allNews[0].url;
        lastNewsTime = new Date(allNews[0].publishedAt);
        lastNewsCode = 'all';

        displayNews(allNews);
    })
        .catch(err => errorMsg('Network Error'));
}


//function to display generated news
function displayNews(newsArr) {
    const htmlString = getAllHtmlContent(newsArr);
    $('#newsContent').html(htmlString)
    $("html, body").animate({ scrollTop: 0 });
    successMsg("Number of records: " + newsArr.length);
}


//function to show countries available
function showCountries() {
    dataApi('GET', 'sw/countries').then(countries => {
        if (countries.Error != null) {
            errorMsg(countries.Error);
            $('#countriesList').html('<select><option>Not Loaded</option></select>');
            return;
        }

        let countriesList = $('#countriesList');
        const optionList = getSelectOptions(countries);
        countriesList.html(optionList);
    })
        .catch(err => errorMsg('Network Error'));
}


//function to show sources available
function showSources() {
    dataApi('GET', 'sw/sources').then(sourceObject => {
        if (sourceObject.Error != null) {
            errorMsg(sourceObject.Error);
            errorMsg('Error Loading Sources', $('#asideSources'));
            $('#sourcesList').html('<select><option>Not Loaded</option></select>');
            return;
        }

        const htmlString = getSourceHtml(sourceObject);
        $('#asideSources').html(htmlString);

        generateSourceList(sourceObject);
    })
        .catch(err => errorMsg('Network Error'));
}


//function to generate select list of sources
function generateSourceList(sourceObject) {
    let sourcesList = $('#sourcesList');
    let sources = [];

    for (const category in sourceObject) {
        for (const source of sourceObject[category]) sources.push(source);
    }

    sources.sort((source1, source2) => source1[1].toLowerCase().localeCompare(source2[1].toLowerCase()));

    const optionList = getSelectOptions(sources);
    sourcesList.html(optionList);
}


//function to handle change in country selected
function handleCountryChange(countryCode, countryName) {
    basicMsg("Loading...");
    $("#sourcesList").prop('selectedIndex', 0);

    if (countryCode === 'All') {
        displayFilterValues('ALL', '');
        showAllNews();
        return;
    }

    displayFilterValues('COUNTRY -', countryName);

    dataApi('GET', 'sw/byCountry/' + countryCode + '?socketId=' + getSocketId()).then(filteredNews => {
        if (filteredNews.Error != null) {
            errorMsg(filteredNews.Error);
            return;
        }

        lastNewsUrl = filteredNews[0].url;
        lastNewsTime = new Date(filteredNews[0].publishedAt);
        lastNewsCode = countryCode;

        displayNews(filteredNews);
    })
        .catch(err => errorMsg('Network Error'));
}


//function to handle change in source selected
function handleSourceChange(sourceCode, sourceName) {
    basicMsg("Loading...");
    $("#countriesList").prop('selectedIndex', 0);
    $("#sourcesList").val(sourceCode);

    if (sourceCode === 'All') {
        displayFilterValues('ALL', '');
        showAllNews();
        return;
    }

    displayFilterValues('SOURCE -', sourceName)

    dataApi('GET', 'sw/bySource/' + sourceCode + '?socketId=' + getSocketId()).then(filteredNews => {
        if (filteredNews.Error != null) {
            errorMsg(filteredNews.Error);
            return;
        }

        lastNewsUrl = filteredNews[0].url;
        lastNewsTime = new Date(filteredNews[0].publishedAt);
        lastNewsCode = sourceCode;

        displayNews(filteredNews);
    })
        .catch(err => errorMsg('Network Error'));
}


//function to display filtering constraints for articles
function displayFilterValues(type, name) {
    $("#filterType").text(type);

    if (name.length > 20) {
        const nameArr = name.split(' ');
        name = '';
        for (let count = 0; count < nameArr.length; count++) {
            if ((name + nameArr[count]).length > 20) break;
            name += ' ' + nameArr[count];
        }
        name = name.substring(1);
    }

    $("#filterName").text(name);
}


function basicMsg(msg, divMsg = $('#divMsg')) {
    divMsg.css("color", "purple");
    displayMsg(divMsg, msg);
}


function successMsg(msg, divMsg = $('#divMsg')) {
    divMsg.css("color", "green");
    displayMsg(divMsg, msg);
}


function errorMsg(msg, divMsg = $('#divMsg')) {
    divMsg.css("color", "red");
    displayMsg(divMsg, msg);
}


function displayMsg(divMsg, msg) {
    divMsg.css("display", "block");
    divMsg.text(msg);
}


function hideMsg(divMsg = $('#divMsg')) {
    divMsg.css("display", "none");
}


//function to get sources as html string
function getSourceHtml(sourceObject) {
    let htmlString = '';

    for (const category in sourceObject) {
        htmlString += getSourceCategoryHtml(sourceObject[category], category);
    }

    return htmlString;
}


//helper function to generate each source html
function getSourceCategoryHtml(singleSrcCatgry, category) {
    let htmlString = '<p>' + toPascalCase(category) + '</p><ul>';

    for (const source of singleSrcCatgry) {
        htmlString += '<li><span class="aside-source" onclick="handleSourceChange(\'' + source[0] + '\', \'' + source[1] + '\')">' + source[1] + '<span></li>';
    }
    htmlString += '</ul>';

    return htmlString;
}


//function to convert a string to UpperCamelCase
function toPascalCase(str) {
    return str[0].toUpperCase() + str.substring(1).toLowerCase();
}


//function to get html string from news articles
function getAllHtmlContent(allNews) {
    let htmlString = "";
    for (const singleNews of allNews) {
        htmlString += getRowHtmlContent(singleNews);
    }

    return htmlString;
}


//helper function to generate html string for each news article
function getRowHtmlContent(singleNews) {
    const htmlString = '<div class="row justify-content-center single-news"> <div class="col-sm-12 col-md-4"> <div class="imgDiv mx-3"><img src="' + (singleNews.urlToImage ||
        '/src/assets/images/noImage.png') + '" alt="image"/></div></div><div class="col-sm-12 col-md-8 info-headers"><div class="container"><div class="row"><div ' +
        'class="col-sm-12 col-md-4"><strong>Source: </strong> </div><div class="col-sm-12 col-md-8">' + singleNews.source.name + '</div>' +
        '<div class="col-sm-12 col-md-4"> <strong>Author: </strong></div><div class="col-sm-12 col-md-8">' + (singleNews.author || 'Anonymous') + '</div>' +
        '<div class="col-sm-12 col-md-4"> <strong>Date Published: </strong></div><div class="col-sm-12 col-md-8">' + getResolvedDate(singleNews.publishedAt) +
        '</div><div class="col-sm-12 col-md-4"><strong>Title: </strong></div><div class="col-sm-12 col-md-8">' + singleNews.title + '</div>' +
        '</div></div> </div> <div class="col-sm-12 info-desc"> <div class="container"> <div class="row"><div class="col-sm-12 col-md-2 text-center href">' +
        '<a href="' + singleNews.url + '" target="_blank">View in site</a> </div> <div class="col-sm-12 col-md-9 offset-md-1"> <span>' + (singleNews.description || 'Details available in source site') +
        '</span></div></div></div></div> </div >';

    return htmlString;
}


//function to generate a properly formatted date
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function getResolvedDate(dateStr) {
    const date = new Date(dateStr);

    const year = date.getFullYear();
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const wkDay = weekDays[date.getDay()];
    const hour = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    const min = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();

    return `${wkDay}, ${day}${dateSuffix(day)} ${month}, ${year} &nbsp;&nbsp;&nbsp;(${hour}:${min})`;
}


//helper function to append the correct suffix to a date
function dateSuffix(date) {
    //set suffix according to date of the month
    if (date % 10 == 1 && date != 11) return 'st';
    else if (date % 10 == 2 && date != 12) return 'nd';
    else if (date % 10 == 3 && date != 13) return 'rd';
    else return 'th';
}


//function to generate a select list
function getSelectOptions(options) {
    let optionsHtml = "<option value='All'>All</option>";
    for (const option of options) {
        optionsHtml += "<option value='" + option[0] + "'>" + option[1] + "</option>";
    }
    return optionsHtml;
}


//function to make ajax calls and return a promise which resolve to the needed information
function dataApi(type, url, data, async = true) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type,
            url,
            data,
            async,
            success: data => resolve(data),
            error: err => reject(err)
        });
    })
}


//SOCKET CONNECTION SETUP
let socket;
const socketInterval = setInterval(socketConnect, 20 * 1000);
socketConnect();


//function to create a socket connection when one exists
function socketConnect() {
    const address = 'https://headlines-tobe.herokuapp.com';            ////http://localhost:3000 //http://localhost:1337 //https://headlines-tobe.herokuapp.com/
    socket = io.connect(address);
    if (!socket) return;
    else clearInterval(socketInterval);

    socket.on('updatedNews', (newsArr, code) => {
        if (lastNewsCode !== code || lastNewsCode == null) return;

        for (let i = 0; i < newsArr.length; i++) {
            if (lastNewsUrl === newsArr[i].url) {
                if (i === 0) return;
                const updNewsArr = newsArr.slice(0, i);
                updateNews(updNewsArr);
                return;
            }
        }

        if (new Date(newsArr[0].publishedAt) > lastNewsTime && lastNewsTime) {
            updateNews(newsArr);
        }
    })
}


//function to get socket id
function getSocketId() {
    const socketId = socket ? socket.id : 'none';

    return socketId || 'none';
}


//function to display updated news
function updateNews(newsArr) {
    const oldHtml = $('#newsContent').html();
    const newHtml = getAllHtmlContent(newsArr);
    const updNewsHtml = newHtml + oldHtml;
    $('#newsContent').html(updNewsHtml);

    updateMsg(newsArr.length);
}


//function to update the number of records being displayed
function updateMsg(length) {
    const oldMsg = $('#divMsg').text();
    const oldMsgArr = oldMsg.split(' ');

    const prevNo = parseInt(oldMsgArr[oldMsgArr.length - 1]);
    if (isNaN(prevNo)) return;

    const newNo = length + prevNo;
    successMsg("Number of records: " + newNo + " (updated)");
}


//PUSH NOTIFICATION SETUP
function notificationSetup() {
    if (!('PushManager' in window)) {
        hideNotifDiv()
        return;
    }

    setNotifState(Notification.permission);

    $('#btnNotifYes').on('change', function () {
        getPushSubscription().then(registration => {
            if (registration) return;

            disableNotifBtns();

            return askPermission().then(result => {
                if (result === 'granted') return subscribeUserToPush();
                return result;
            })
                .then(result => {
                    if (result === 'default') errorMsg("Live news subscription unsuccessful");
                    else if (result === 'denied') errorMsg("Live news subscription blocked. Unblock from browser settings.");
                    else if (result.Error && result.Error != '') errorMsg(result.Error);
                    else successMsg("Live news subscription unsuccessful");
                })
                .catch(err => {
                    unsubscribePushNotif();
                    notifSelectOff();
                    errorMsg("Live news subscription failed");
                })
        }).then(() => enableNotifBtns());
    });

    $('#btnNotifNo').on('change', function () {
        getPushSubscription().then(registration => {
            if (!registration) return;

            disableNotifBtns();

            return unsubscribePushNotif()
                .then(val => successMsg("Live news successfully unsubscribed"))
                .catch(err => {
                    notifSelectOn();
                    errorMsg("Live news unsubscription failed");
                })
        }).then(() => enableNotifBtns());
    })
}


function showNotifDiv() {
    $('.notifDiv').css('display', 'block');
}


function hideNotifDiv() {
    $('.notifDiv').css('display', 'none');
}

function notifSelectOn() {
    $('#notifYes').addClass('focus active');
    $('#notifNo').removeClass('focus active');
}


function notifSelectOff() {
    $('#notifNo').addClass('focus active');
    $('#notifYes').removeClass('focus active');
}


function disableNotifBtns() {
    $("#notifNo").css("opacity", 0.2);
    $("#notifYes").css("opacity", 0.2);
    return;
}

function enableNotifBtns() {
    $("#notifNo").css("opacity", 1);
    $("#notifYes").css("opacity", 1);
    return;
}


//function to set the notification state of the client
function setNotifState(result) {
    if (result === 'granted' || result === 'default') {
        showNotifDiv();
    }
    else{
        hideNotifDiv();
    }

    getPushSubscription().then(subscription => {
        subscription ? notifSelectOn() : notifSelectOff();
    })
}


//function to ask for permission for subscriptions
function askPermission() {
    return new Promise((resolve, reject) => {
        const permissionResult = Notification.requestPermission(result => resolve(result));
        if (permissionResult) permissionResult.then(resolve, reject);
    })
}


//function to subscribe a user to push notifications
function subscribeUserToPush() {
    return navigator.serviceWorker.ready.then(reg => {
        const subscriptionOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('BJbGel5u8l_RfmWqO1yW-Hshdo4HfLCS8FlNMx0rBVIEBOR2a3h_NDbw4EGvJfv_vKdAhFrq5NdG1Q3JLT5Ux4o')
        };
        return reg.pushManager.subscribe(subscriptionOptions);
    }).then(pushSubscription => {
        notifSelectOn();
        return sendSubscriptionToServer(pushSubscription.toJSON());
    })
}


//function to convert a base 64 url value to base 8 array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}


//function to send user subscription to the server for persistence
function sendSubscriptionToServer(pushSubscription) {
    return dataApi('POST', 'pushSubscriptions', pushSubscription);
}


//function to get the subscription state of the client
function getPushSubscription() {
    if (!navigator.serviceWorker) return;

    return navigator.serviceWorker.ready.then(reg => {
        return reg.pushManager.getSubscription()
    });
}


//function to unsubscribe a user from push notifications
function unsubscribePushNotif() {
    return getPushSubscription().then(registration => registration.unsubscribe());
}


//function to listen to message events from the service worker
navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.key === 'refresh') {
        window.location.reload(true);
    }
});