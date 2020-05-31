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

const baseApiKey = '/';

let lastNewsUrl, lastNewsCode, lastNewsTime;        //track most recent news for live updating from server


//function to get and display all news
function showAllNews() {
    const url = 'news/allNews?socketId=' + getSocketId();
    return displayNewsInfo(url, 'All');
}


//function to show countries available
async function showCountries() {
    try {
        const countries = await networkApi('GET', baseApiKey + 'news/countries');
        if (countries.Error != null) {
            errorMsg(countries.Error); //display error from server
            $('#countriesList').html('<select><option>Not Loaded</option></select>');
            return;
        }
        const optionList = getSelectOptions(countries); //generate select list html
        $('#countriesList').html(optionList);
    }
    catch (err) {
        return errorMsg('Error retrieving countries from server.');
    }
}


//function to show sources available
async function showSources() {
    try {
        const sourceObject = await networkApi('GET', baseApiKey + 'news/sources');
        if (sourceObject.Error != null) {
            errorMsg(sourceObject.Error);
            errorMsg('Error Loading Sources', $('#asideSources'));
            $('#sourcesList').html('<select><option>Not Loaded</option></select>');
            return;
        }
        const htmlString = getSourceHtml(sourceObject);
        $('#asideSources').html(htmlString);
        generateSourceList(sourceObject);
    }
    catch (err) {
        return errorMsg('Error retrieving sources from server.');
    }
}


//function to generate select list of sources
function generateSourceList(sourceObject) {
    let sources = [];

    for (const category in sourceObject) {
        for (const source of sourceObject[category]) sources.push(source);   //get all sources from each news category
    }

    //sort all sources in alphabetical order
    sources.sort((source1, source2) => source1[1].toLowerCase().localeCompare(source2[1].toLowerCase()));       

    const optionList = getSelectOptions(sources);
    $('#sourcesList').html(optionList);
}


//function to handle change in country selected
function handleCountryChange(countryCode, countryName) {
    basicMsg("Loading...");
    $("#sourcesList").prop('selectedIndex', 0);         //reset sources list

    if (countryCode === 'All') {
        displayFilterValues('ALL', '');                 //display news header title
        showAllNews();                                  //reload all news
        return;
    }

    displayFilterValues('COUNTRY -', countryName);

    const url = 'news/byCountry/' + countryCode + '?socketId=' + getSocketId();
    displayNewsInfo(url, countryCode);
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

    const url = 'news/bySource/' + sourceCode + '?socketId=' + getSocketId();
    displayNewsInfo(url, sourceCode);
}


//function to get socket id
function getSocketId() {
    const socketId = socket ? socket.id : 'none';

    return socketId || 'none';
}


//function to generate information from ajax call
async function displayNewsInfo(url, code) {
    try {
        const allNews = await networkApi('GET', baseApiKey + url);
        if (allNews.Error != null) {
            errorMsg(allNews.Error);
            return;
        }
        setLatestDetails(allNews[0], code);
        displayNews(allNews);
    }
    catch (err) {
        return errorMsg('Error retrieving news from server (' + code + ').');
    }
}


//function to display generated news
function displayNews(newsArr) {
    const htmlString = getAllHtmlContent(newsArr);          //generate html encoded string with needed values
    $('#newsContent').html(htmlString)                      //set as news content
    $("html, body").animate({ scrollTop: 0 });              //scroll to top of page
    successMsg("Number of records: " + newsArr.length);     //display number of records
}


//function to set last details
function setLatestDetails(latestArticle, code) {
    lastNewsUrl = latestArticle.url;                        //hold latest news url
    lastNewsTime = new Date(latestArticle.publishedAt);     //hold latest news published date
    lastNewsCode = code;                                    //hold code to track all news
}

//function to display filtering constraints for articles
function displayFilterValues(type, name) {
    $("#filterType").text(type);

    //to ensure that the name is not too long
    const maxNameLength = 25;
    if (name.length > maxNameLength) {
        const nameArr = name.split(' ');
        name = '';
        for (let count = 0; count < nameArr.length; count++) {
            if ((name + nameArr[count]).length > maxNameLength) break;
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
    const hr = date.getHours();
    const hour = formattedHour(hr);
    const meridean = hr < 12 ? 'AM' : 'PM';
    const min = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();

    return `${wkDay}, ${day}${dateSuffix(day)} ${month}, ${year} &nbsp;&nbsp;&nbsp;(${hour}:${min} ${meridean})`;
}


//helper function to append the correct suffix to a date
function dateSuffix(day) {
    //set suffix according to date of the month
    if (day % 10 == 1 && day != 11) return 'st';
    else if (day % 10 == 2 && day != 12) return 'nd';
    else if (day % 10 == 3 && day != 13) return 'rd';
    else return 'th';
}


//helper function to generate properly formatted hour
function formattedHour(hr) {
    let hour;
    if (hr === 0) hour = '12';              //e.g. 12 AM
    else if (hr < 10) hour = '0' + hr;      //e.g. 09
    else if (hr <= 12) hour = hr + '';      //e.g. 11
    else hour = (hr - 12) + '';             //e.g. 1 PM

    return hour;
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
function networkApi(type, url, data, async = true) {
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
const socketInterval = setInterval(socketConnect, 20 * 1000);       //check for connection availability every 20 seconds
socketConnect();


//function to create a socket connection when one exists
function socketConnect() {
    const address = '/';//'https://headlines-tobe.herokuapp.com';           
    socket = io.connect(address);  //{ secure: true }
    if (!socket) return;
    else clearInterval(socketInterval);             //clear connection checking

    socket.on('updatedNews', (newsArr, code) => {
        if (lastNewsCode !== code || lastNewsCode == null) return;      //validate socket code to ensure that it tallies with current session

        for (let i = 0; i < newsArr.length; i++) {
            if (lastNewsUrl === newsArr[i].url) {                       //get last url to begin update
                if (i === 0) return;
                const updNewsArr = newsArr.slice(0, i);
                updateNews(updNewsArr);
                return;
            }
        }

        if (lastNewsTime && new Date(newsArr[newsArr.length - 1].publishedAt) > lastNewsTime) {  //update with all entries for new articles
            updateNews(newsArr);
        }
    })
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
                    else successMsg("Live news subscription successful");
                })
                .catch(err => {
                    unsubscribePushNotif();
                    putNotifBtnOff();
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
                    putNotifBtnOn();
                    errorMsg("Live news unsubscription failed");
                })
        }).then(() => enableNotifBtns());
    })
}


//function to show notification panel/div
function showNotifDiv() {
    $('.notifDiv').css('display', 'block');
}


//function to gide notification panel/div
function hideNotifDiv() {
    $('.notifDiv').css('display', 'none');
}


//function to set notification status as 'yes'/subscribed
function putNotifBtnOn() {
    $('#notifYes').addClass('focus active');
    $('#notifNo').removeClass('focus active');
}


//function to set notification status as 'no'/unsubscribed
function putNotifBtnOff() {
    $('#notifNo').addClass('focus active');
    $('#notifYes').removeClass('focus active');
}


//function to disable notification buttons
function disableNotifBtns() {
    $("#notifNo").css("opacity", 0.2);
    $("#notifYes").css("opacity", 0.2);
    return;
}


//function to enable notification buttons
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
        subscription ? putNotifBtnOn() : putNotifBtnOff();
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
        putNotifBtnOn();
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
    return networkApi('POST', baseApiKey + 'pushSubscriptions', pushSubscription);
}


//function to get the subscription state of the client
function getPushSubscription() {
    if (!navigator.serviceWorker) return;

    return navigator.serviceWorker.ready.then(reg => {
        return reg.pushManager.getSubscription();
    });
}


//function to unsubscribe a user from push notifications
function unsubscribePushNotif() {
    return getPushSubscription().then(registration => registration.unsubscribe());
}


//function to listen to message events from the service worker
navigator.serviceWorker.addEventListener('message', event => {
    const article = event.data.article;
    const shouldLoadArticle = event.data.shouldLoadArticle;
    if (shouldLoadArticle == null) return;
	if(shouldLoadArticle){		//while the page is up
		updateNews([article]);
	}
	
    $("#countriesList").prop('selectedIndex', 0);
    $("#sourcesList").prop('selectedIndex', 0);
    successMsg('Latest news article loaded');    
});