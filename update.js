function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, //< Default Max Timout is 3s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof testFx === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    console.log("processCount: " + processCount);
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    typeof onReady === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 250); //< repeat check every 250ms
};

var webPage = require('webpage');
var page = webPage.create();

var page01 = require('webpage').create();
var page02 = require('webpage').create();
var page03 = require('webpage').create();
var page04 = require('webpage').create();
var page05 = require('webpage').create();

var fs = require('fs');

//var queryUrl = 'http://localhost:8008/getPlotData/1/recent';
//var openUrl = 'http://localhost:8888';
var queryUrl = 'http://localhost:8008/farm1/tank1';
var openUrl = 'http://localhost:8888';

var gribBase = 'http://newsky2.kma.go.kr/service/SecndSrtpdFrcstInfoService2/ForecastGrib',
    spaceDataBase = 'http://newsky2.kma.go.kr/service/SecndSrtpdFrcstInfoService2/ForecastSpaceData',
    ServiceKey = 'vztFW4jcaKrqM65vFkNWMUYQN3o7vkNYZ0kcYlOhMOpRSmt7%2BxDDbSsmTWLbF6HynlYM5UFQ7zss6zUlrfuwEA%3D%3D',
    nx = "68",
    ny = "113";

var processCount = 0;
var logTime = new String();

var data = false;

page.open(queryUrl, function(status) {
    console.log("Query status: " + status);
    if(status !== 'success') {
        console.log("FAIL to query");
        phantom.exit();
    } else {
        console.log("query succeeded");
        
        logTime = page.evaluate(function() {
            return document.querySelector(".logTime").innerHTML;
        });
        
        data = {
            waterTemp: JSON.parse(fs.read('./data/AvgWaterTemp/data.json')),
            visibleLight: JSON.parse(fs.read('./data/AvgVisibleLight/data.json')),
            DO: JSON.parse(fs.read('./data/AvgDO/data.json')),
            airTemp: JSON.parse(fs.read('./data/AvgAirTemp/data.json'))
        };
        
        processCount++;
    }
});

var average = {
    waterTemp: new Number(),
    visibleLight: new Number(),
    DO: new Number(),
    airTemp: new Number(),
    isDay: new Boolean()
};

waitFor(function() {
    if(processCount >= 1) {
        return data;
    }
}, function() {
    Object.keys(data).forEach(function(key) {
        var sum = 0;
        
        data[key].forEach(function(d, i) {
            Object.keys(d).forEach(function(element) {
                if(element !== "LogTime") {
                    sum += +d[element];
                }
            });
        });

        average[key] = sum / data[key].length;
    });
});

waitFor(function() {
    return logTime.length;
}, function() {
    var weatherInfo = {};
    
    var monthToInt = {
        Jan: '01',
        Feb: '02',
        Mar: '03',
        Apr: '04',
        May: '05',
        Jun: '06',
        Jul: '07',
        Aug: '08',
        Sep: '09',
        Oct: '10',        
        Nov: '11',
        Dec: '12'
    };
    
    var split = logTime.split(" ");
    
    var d_year = split[3],
        d_month = monthToInt[split[1]],
        d_date = split[2];
    var dateString = d_year + d_month + d_date;
    
    var t_root = split[4].split(":");
    
    var t_hour = t_root[0],
        t_minute = t_root[1];
    
    var timeString = split[4].replace(":", "").substr(0, 4);
    
    var base_date = dateString,
        base_time = timeString;
    
    var base_date_mod = base_date,
        base_time_mod = base_time;
    
    var checkDate = new Date(d_year, Number(d_month) - 1, d_date, t_hour, t_minute);
    
    var numOfRows = 77;
    
    if(checkDate < new Date(d_year, Number(d_month) - 1, d_date, 2, 30)) {
        checkDate.setDate(checkDate.getDate() - 1);
        numOfRows = 155;
    }
    
    checkDate.setHours(2);
    checkDate.setMinutes(0);
    
    base_date_mod = checkDate.getFullYear().toString() + (checkDate.getMonth() < 9 ? "0" + (checkDate.getMonth() + 1) : (checkDate.getMonth() + 1).toString()) + (checkDate.getDate() > 9 ? checkDate.getDate().toString() : "0" + checkDate.getDate());

    base_time_mod = (checkDate.getHours() > 9 ? checkDate.getHours().toString() : "0" + checkDate.getHours()) + (checkDate.getMinutes() > 9 ? checkDate.getMinutes().toString() : "0" + checkDate.getMinutes());
       
    var gribRequest = gribBase + 
        "?" + 
        "ServiceKey=" + ServiceKey + "&" + 
        "base_date=" + base_date + "&" + 
        "base_time=" + base_time + "&" + 
        "nx=" + nx + "&" + "ny=" + ny;
    
    var spaceDataRequest = spaceDataBase +
        "?" +
        "ServiceKey=" + ServiceKey + "&" +
        "base_date=" + base_date_mod + "&" + 
        "base_time=" + base_time_mod + "&" + 
        "nx=" + nx + "&" + "ny=" + ny + "&" +
        "numOfRows=" + numOfRows;
    
    var weather = {
        sky: '',
        t1h: '',
        pty: '',
        tmn: '',
        tmx: ''
    };
    
    page05.open(gribRequest, function() {
        var grib = page05.evaluate(function() {
            var oSerializer = new XMLSerializer();
            var item_list = document.querySelectorAll("category");
            
            for (i = 0; i < item_list.length; i++) {
                switch(item_list.item(i).textContent) {
                    case 'SKY':
                        var SKY = /\d/g.exec(
                            oSerializer.serializeToString(
                                item_list.item(i).parentNode.querySelector("obsrValue")
                            )
                        );
                        break;
                    case 'T1H':
                        var T1H = /\d/g.exec(
                            oSerializer.serializeToString(
                                item_list.item(i).parentNode.querySelector("obsrValue")
                            )
                        );
                        break;
                    case 'PTY':
                        var PTY = /\d/g.exec(
                            oSerializer.serializeToString(
                                item_list.item(i).parentNode.querySelector("obsrValue")
                            )
                        );
                    default:
                        break;
                }
            }
            
            return {sky: SKY, t1h: T1H, pty: PTY};
        });
        
        Object.keys(grib).forEach(function(key) {
            weather[key] = grib[key];
        });
        
        processCount++;
    });
    
    page04.open(spaceDataRequest, function() {
        var spaceData = page04.evaluate(function() {
            var oSerializer = new XMLSerializer();
            var item_list = document.querySelectorAll("category");
            
            for (i = 0; i < item_list.length; i++) {
                switch(item_list.item(i).textContent) {
                    case 'TMN':
                        var TMN = /[\d.-]+/g.exec(
                            oSerializer.serializeToString(
                                item_list.item(i).parentNode.querySelector("fcstValue")
                            )
                        );
                        break;
                    case 'TMX':
                        var TMX = /[\d.-]+/g.exec(
                            oSerializer.serializeToString(
                                item_list.item(i).parentNode.querySelector("fcstValue")
                            )
                        );
                        break;
                    default:
                        break;
                }
            }
            
            return {tmn: TMN, tmx: TMX};
        });
        
        Object.keys(spaceData).forEach(function(key) {
            weather[key] = spaceData[key];
        });
        
        processCount++;
    });
    
    waitFor(function() {
        return processCount >= 4;
    }, function() {
        fs.write('./data/weather.json', JSON.stringify(weather), 'w');
        processCount++;
    });
});

var now = new Date();
now.setHours(now.getHours() + 9);

var sunQuery = 'http://astro.kasi.re.kr/Life/Knowledge/sunmoon_map/sunmoon_popup.php?' + 'year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1) + '&location=%C3%BB%C1%D6';

page03.open(sunQuery, function(status) {
    if(status !== 'success') {
        console.log("failed to get sunrise and sunset time");
    } else {
        var date = now.getDate(),
            hours = now.getHours(),
            minutes = now.getMinutes();
        
        var sun = page03.evaluate(function(date) {
            var currentRow = document.querySelectorAll("table.graytable tbody tr:nth-child(" + date + ") td");
            
            var rise = currentRow[2].innerHTML.split(":"),
                set = currentRow[4].innerHTML.split(":");
            
            return {rise: rise, set: set};
        }, date);
                
        waitFor(function() {
            return sun !== undefined;
        }, function() {
            var sunrise = new Date(now.getFullYear(), now.getMonth(), date, Number(sun.rise[0]), Number(sun.rise[1])),
                sunset = new Date(now.getFullYear(), now.getMonth(), date, Number(sun.set[0]), Number(sun.set[1]));
            
            if(now >= sunrise && now < sunset) {
                average.isDay = true;
                processCount++;
            } else {
                average.isDay = false;
                processCount++;
            }
            
            setTimeout(function() {
                waitFor(function() {
                    return average.waterTemp > 0 && average.visibleLight > 0 && average.DO > 0 && average.airTemp > 0 && processCount >= 5;
                }, function() {
                    var averageContents = JSON.stringify(average);
                    fs.write('./data/average_raw.json', averageContents, 'w');

                    fs.write('./data/average.json', 'parseData(' + averageContents + ')', 'w');
                    
                    processCount++;
            	});
            });
        });
    }
});

waitFor(function() {
    return processCount >= 6;
}, function() {
    phantom.exit();
}, 6000);
