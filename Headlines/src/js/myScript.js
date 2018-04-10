$(function () {
    basicMsg("Loading...");

    showCountriesAsync();
    showSourcesAsync();
    showAllNewsAsync();
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

let lastNewsUrl, lastNewsCode;

function showAllNewsAsync() {
    dataApi('GET', 'sw/allNews').then(allNews => {
        if (allNews.Error != null) {
            errorMsg(allNews.Error);
            return;
        }
        
        lastNewsUrl = allNews[0].url;
        lastNewsCode = 'all';

        displayNews(allNews);
    })
}

function displayNews(newsArr) {
    const htmlString = getAllHtmlContent(newsArr);
    $('#newsContent').html(htmlString)
    $("html, body").animate({ scrollTop: 0 });
    successMsg("Number of records: " + newsArr.length);
}

function showCountriesAsync() {
    dataApi('GET', 'sw/countries').then(countries => {
        if (countries.Error != null) {
            errorMsg(countries.Error);
            $('#countriesList').html('<select><option>Not Loaded</option></select>');
            return;
        }

        let countriesList = $('#countriesList');
        const optionList = getSelectOptions(countries);
        countriesList.html(optionList);
    });
}

function showSourcesAsync() {
    dataApi('GET', 'sw/sources').then(sourceObject => {
        if (sourceObject.Error != null) {
            errorMsg(sourceObject.Error);
            errorMsg('Error Loading Sources', $('#asideSources'));
            $('#sourcesList').html('<select><option>Not Loaded</option></select>');
            return;
        }

        const htmlString = getSourceHtml(sourceObject);
        $('#asideSources').html(htmlString);

        //for source select list
        let sourcesList = $('#sourcesList');
        let sources = [];
        for (const category in sourceObject) {
            for (const source of sourceObject[category]) sources.push(source);
        }

        sources.sort((source1, source2) => source1[1].toLowerCase().localeCompare(source2[1].toLowerCase()));

        const optionList = getSelectOptions(sources);
        sourcesList.html(optionList);
    });
}

function handleCountryChange(countryCode, countryName) {
    basicMsg("Loading...");
    $("#sourcesList").prop('selectedIndex', 0);
    
    if (countryCode === 'All') {
        displayFilterValues('ALL', '');
        showAllNewsAsync();
        return;
    }

    displayFilterValues('COUNTRY -', countryName);

    dataApi('GET', 'sw/byCountry/' + countryCode).then(filteredNews => {
        if (filteredNews.Error != null) {
            errorMsg(filteredNews.Error);
            return;
        }
        
        lastNewsUrl = filteredNews[0].url;
        lastNewsCode = countryCode;

        displayNews(filteredNews);
    });
}

function handleSourceChange(sourceCode, sourceName) {
    basicMsg("Loading...");
    $("#countriesList").prop('selectedIndex', 0);
    $("#sourcesList").val(sourceCode);

    if (sourceCode === 'All') {
        displayFilterValues('ALL', '');
        showAllNewsAsync();
        return;
    }

    displayFilterValues('SOURCE -', sourceName)

    dataApi('GET', 'sw/bySource/' + sourceCode).then(filteredNews => {
        if (filteredNews.Error != null) {
            errorMsg(filteredNews.Error);
            return;
        }
        
        lastNewsUrl = filteredNews[0].url;
        lastNewsCode = sourceCode;

        displayNews(filteredNews);
    });
}

function displayFilterValues(type, name) {
    $("#filterType").text(type);

    if (name.length > 20) {
        const nameArr = name.split(' ');
        name = '';
        for (let count = 0;count<nameArr.length; count++) {
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

function getSourceHtml(sourceObject) {
    let htmlString = '';

    for (const category in sourceObject) {
        htmlString += getSourceCategoryHtml(sourceObject[category], category);
    }

    return htmlString;
}

function getSourceCategoryHtml(singleSrcCatgry, category) {
    let htmlString = '<p>' + toPascalCase(category) + '</p><ul>';

    for (const source of singleSrcCatgry) {
        htmlString += '<li><span class="aside-source" onclick="handleSourceChange(\'' + source[0] + '\', \'' + source[1] + '\')">' + source[1] + '<span></li>';
    }
    htmlString += '</ul>';

    return htmlString;
}

function toPascalCase(str) {
    return str[0].toUpperCase() + str.substring(1).toLowerCase();
}

function getAllHtmlContent(allNews) {
    let htmlString = "";
    for (const singleNews of allNews) {
        htmlString += getRowHtmlContent(singleNews);
    }

    return htmlString;
}

function getRowHtmlContent(singleNews) {
    const htmlString = '<div class="row justify-content-center single-news"> <div class="col-sm-12 col-md-4" > <img src="' + (singleNews.urlToImage || 'Headlines/src/assets/images/noImage.png') +
        '" alt="image" class="mx-3" /></div><div class="col-sm-12 col-md-8 info-headers"><div class="container"><div class="row"><div ' +
        'class="col-sm-12 col-md-4"><strong>Source: </strong> </div><div class="col-sm-12 col-md-8">' + singleNews.source.name + '</div>' +
        '<div class="col-sm-12 col-md-4"> <strong>Author: </strong></div><div class="col-sm-12 col-md-8">' + (singleNews.author || 'Anonymous') + '</div>' +
        '<div class="col-sm-12 col-md-4"> <strong>Date Published: </strong></div><div class="col-sm-12 col-md-8">' + getResolvedDate(singleNews.publishedAt) +
        '</div><div class="col-sm-12 col-md-4"><strong>Title: </strong></div><div class="col-sm-12 col-md-8">' + singleNews.title + '</div>' +
        '</div></div> </div> <div class="col-sm-12 info-desc"> <div class="container"> <div class="row"><div class="col-sm-12 col-md-2 text-center">' +
        '<a href="' + singleNews.url + '" target="_blank">View in site</a> </div> <div class="col-sm-12 col-md-10"> <span>' + (singleNews.description || 'No Content') +
        '</span></div></div></div></div> </div >';

    return htmlString;
}

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

function dateSuffix(date) {
    //set suffix according to date of the month
    if (date % 10 == 1 && date != 11) return 'st';
    else if (date % 10 == 2 && date != 12) return 'nd';
    else if (date % 10 == 3 && date != 13) return 'rd';
    else return 'th';
}

function getSelectOptions(options) {
    let optionsHtml = "<option value='All'>All</option>";
    for (const option of options) {
        optionsHtml += "<option value='" + option[0] + "'>" + option[1] + "</option>";
    }
    return optionsHtml;
}

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


//socket connection setup
let socket;
const socketInterval = setInterval(socketConnect, 20 * 1000);
socketConnect();

function socketConnect() {
    socket = io.connect('http://localhost:1337');
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

        updateNews(newsArr);
    })
}

function updateNews(newsArr){
    const oldHtml=$('#newsContent').html();
    const newHtml = getAllHtmlContent(newsArr);
    const updNewsHtml=newHtml+oldHtml;
    $('#newsContent').html(updNewsHtml);

    updateMsg(newsArr.length);
}

function updateMsg(length) {
    const oldMsg = $('#divMsg').text();
    const oldMsgArr = oldMsg.split(' ');

    const prevNo = parseInt(oldMsgArr[oldMsgArr.length - 1]);
    if (isNaN(prevNo)) return;

    const newNo = length + prevNo;
    successMsg("Number of records: " + newNo + " (updated)");
}


//push notification setup
function notificationSetup() {
    if (!('PushManager' in window)) {
        hideNotifDiv()
        return;
    }

    setNotifState(Notification.permission);

    $('#notifSelect').on('change', function () {
        if (isNotifOn()) {
            askPermission().then(result => {
                setNotifState(result);
                if (result === 'granted') return subscribeUserToPush();
                return result;
            })
                .then(result => {
                    if (result === 'default') errorMsg("Live news subscription unsuccessful");
                    else if (result === 'denied') errorMsg("Live news subscription blocked. Unblock from browser settings.");
                    else successMsg("Live news subscription successful");
                })
                .catch(err => {
                    unsubscribePushNotif();
                    notifSelectOff();
                    errorMsg("Live news subscription failed");
                });
        }
        else {
            unsubscribePushNotif()
                .then(val => successMsg("Live news successfully unsubscribed"))
                .catch(err => {
                    notifSelectOn();
                    errorMsg("Live news unsubscription failed");
                });
        }
    });
}

function showNotifDiv() {
    $('.notifDiv').css('display', 'block');
}


function hideNotifDiv() {
    $('.notifDiv').css('display', 'none');
}

function notifSelectOn() {
    $('#notifSelect').val('yes');
}

function notifSelectOff() {
    $('#notifSelect').val('no');
}

function setNotifState(result) {
    if (result === 'granted' || result === 'default') {
        showNotifDiv();
    }
    else if (result === 'denied') {
        hideNotifDiv();
    }
    navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(subscription => {
            subscription ? notifSelectOn() : notifSelectOff();
        })
    });
}

function isNotifOn() {
    return $('#notifSelect').val() === 'yes';
}

function askPermission() {
    return new Promise((resolve, reject) => {
        const permissionResult = Notification.requestPermission(result => resolve(result));
        if (permissionResult) permissionResult.then(resolve, reject);
    })
}

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

function sendSubscriptionToServer(pushSubscription) {
    return dataApi('POST', 'pushSubscriptions', pushSubscription);
}

function unsubscribePushNotif() {
    return navigator.serviceWorker.ready.then(reg => {
       return reg.pushManager.getSubscription().then(subscription => {
           return subscription.unsubscribe();
        })
    });
}

navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.key === 'refresh') {
        window.location.reload(true);
    }
});