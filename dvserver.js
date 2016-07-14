var http = require('http');
var mysql = require('mysql');
var fs = require('fs');
var express = require('express');
var app = express();
var helmet = require('helmet');
        
var pool = mysql.createPool({
    host: 'manna.czdzkfmelnfb.ap-northeast-1.rds.amazonaws.com',
    user: 'manna',
    password: '321annam',
    database: 'manna'
});

var logTime;
var processCount = 0;

http.createServer((req, res) => {
    var headers = req.headers;
    var method = req.method;
    var url = req.url;
    var body = [];
    
    req.on('error', (err) => {
        console.error(err);
        res.statusCode = 400;
        res.end();
    });
    
    res.on('error', (err) => {
        console.error(err);
    });
    
    var farmId = req.url.match(/^\/farm[\d]+/g);
    var tankId = req.url.match(/\/tank[\d]+/g);
    
    if (farmId && tankId) {
        farmId = farmId[0].match(/[\d]+/);
        tankId = tankId[0].match(/[\d]+/);
        
        recordData(farmId, tankId, 'WaterTemp', res);
        recordData(farmId, tankId, 'VisibleLight', res);
        recordData(farmId, tankId, 'AirTemp', res);
        recordData(farmId, tankId, 'DO', res);
    }
}).listen(8008);

app.use(helmet.xssFilter());
app.use(helmet.hidePoweredBy());
app.use(helmet.ieNoOpen());

app.use(express.static('data'));

app.get('*', (req, res, next) => {
    var headers = req.headers;console.log(headers);
    if (headers.referer !== undefined || headers.referer !== null || !(headers.referer.search('mannabox.co.kr') + 1)) {
        res.statusCode = 403;
        res.end();
    } else {
        next();
    }
});

app.listen(8888);

function recordData(farmId, tankId, sensor, res) {
    pool.getConnection( (err, connection) => {
        var args = [farmId, tankId, sensor];

        connection.query("CALL manna.USP_Get_Last_24h_Data ({farmId}, {tankId}, '{sensor}')".replace(/\{[\w]+\}/g, (match) => {
            return args.shift();
        }), (err, rows, fields) => {
            if (err) console.error(err);

            var data = [],
                sum = 0,
                key = 'Avg' + sensor;
            
            var lastIndex = rows[0].length - 1;
            
            rows[0].forEach( (element, index) => {
                var chunk = {};
                chunk[key] = element[key]; 
                chunk['LogTime'] = element.LogTime.toString(),
                
                data.push(chunk);
                
                if(index === lastIndex && logTime === undefined) logTime = element.LogTime;
            });
            
            if (sensor === 'DO') {
                data.forEach( (element, index) => {
                    if (element[key] < 6) element[key] = element[key] / 6 + 5;
                });
            }
            
            fs.writeFile('./data/' + key + '/data.json', JSON.stringify(data));
            
            if (++processCount >= 4) res.end('<div class="logTime">' + logTime + '</div>', 'utf8', () => {
                logTime = undefined;
                processCount = 0;
            });
        });

        connection.release();
    });
}
