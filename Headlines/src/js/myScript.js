$(function () {
    basicMsg("Loading...");

    showAllNewsAsync();
    showCountriesAsync();
    showSourcesAsync();
    handleCountryChange();
    handleSourceChange();
})

function showAllNewsAsync() {
    dataApi('GET', 'sw/allNews').then(allNews => {
        if (allNews.Error != null) {
            errorMsg(allNews.Error);
            return;
        }

        displayNews(allNews);
    })
}

function displayNews(newsArr) {
    const htmlString = getAllHtmlContent(newsArr);
    $('#newsContent').html(htmlString)
    successMsg(newsArr.length);
}

function showCountriesAsync() {
    dataApi('GET', 'sw/countries').then(countries => {
        if (countries.Error != null) {
            errorMsg(countries.Error);
            return;
        }

        let countriesList = $('#countriesList');
        const optionList = getSelectOptions(countries);
        countriesList.html(optionList);
    });
}

function showSourcesAsync() {
    dataApi('GET', 'sw/sources').then(sources => {
        if (sources.Error != null) {
            errorMsg(sources.Error);
            $('#sourcesList').html('<select><option>Not Loaded</option></select>');
            return;
        }

        let sourcesList = $('#sourcesList');
        const optionList = getSelectOptions(sources);
        sourcesList.html(optionList);
    });
}

function handleCountryChange() {
    $('#countriesList').on('change', function () {
        basicMsg("Loading...");
        $("#sourcesList").prop('selectedIndex', 0);

        const country = $(this).find(":selected").val();

        if (country === 'All') {
            showAllNewsAsync();
            return;
        }

        dataApi('GET', 'sw/byCountry/' + country).then(filteredNews => {
            if (filteredNews.Error != null) {
                errorMsg(filteredNews.Error);
                return;
            }

            displayNews(filteredNews);
        });
    });
}

function handleSourceChange() {
    $('#sourcesList').on('change', function () {
        basicMsg("Loading...");
        $("#countriesList").prop('selectedIndex', 0);

        const source = $(this).find(":selected").val();

        if (source === 'All') {
            showAllNewsAsync();
            return;
        }

        dataApi('GET', 'sw/bySource/' + source).then(filteredNews => {
            if (filteredNews.Error != null) {
                errorMsg(filteredNews.Error);
                return;
            }

            displayNews(filteredNews);
        });
    });
}

function basicMsg(msg, divMsg = $('#divMsg')) {
    divMsg.css("color", "purple");
    displayMsg(divMsg, msg);
}

function successMsg(count, divMsg = $('#divMsg')) {
    divMsg.css("color", "green");
    displayMsg(divMsg, "Number of records: " + count);
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

function getAllHtmlContent(allNews) {
    let htmlString = "";
    for (const singleNews of allNews) {
        htmlString += getRowHtmlContent(singleNews);
    }

    return htmlString;
}

function getRowHtmlContent(singleNews) {
    const htmlString = '<div class="row justify-content-center single-news"> <div class="col-sm-12 col-md-4" > <img src="' + (singleNews.urlToImage || 'Headlines/src/assets/NoImage.png') +
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

    return `${wkDay}, ${day}${dateSuffix(day)} ${month}, ${year} &nbsp;&nbsp;&nbsp;(${hour}:${min} GMT)`;
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