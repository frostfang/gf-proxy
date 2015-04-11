require('newrelic');
var http = require('http');
var path = require('path');
var express = require('express');
// var request = request.defaults({jar: true}) // to jar cookies for subsequent requests
var cronJob = require('cron').CronJob;
var gfproxy = require("./lib/gf-proxy.js");
var mcproxy = require("./lib/mc-proxy.js");
var xlsx = require("xlsx");
var fs = require("fs");
var us = require("underscore");

// mail chimp
var mcModel = new mcproxy({
    mcApiKey: process.env.MC_API_KEY,
    mcPageSize: 100
});

//var mc = new mcapi.Mailchimp(cfg.mcApiKey);

// gofundraise
var gfModel = new gfproxy({
    gfUser: process.env.GF_USER,
    gfSecret: process.env.GF_SECRET,
    gfEventId: process.env.GF_EVENT_ID,
    gfFormId: process.env.GF_FORM_ID
});



var processConfig = '00 00 ' + process.env.CRON_PROCESS_HOUR + ' * * *';
var syncConfig = '00 00 ' + process.env.CRON_SYNC_HOUR + ' * * *';
var jobRunLog = [];
// the cron job to hit the GF page every day
// 00 00 13 * * *'
new cronJob(processConfig, function(){
    
    gfModel.startProcessing(function(err,d){
        
        jobRunLog.push({
            timestamp: new Date(),
            error: err,
            data: d
        });
        
        // after the file is processed, grab a copy of regos to temp
        var ws = fs.createWriteStream(process.env.GF_LOCAL_FILENAME);
        ws.on('error', function(wsErr) { 
            jobRunLog.log(wsErr); 
        });
        ws.on('finish', function(){ 
            jobRunLog.log({ 
                timestamp: new Date(), 
                message: process.env.GF_LOCAL_FILENAME + ' has been saved'
            });
        });
        gfModel.downloadExport(ws);
        
    });
}, null, true);

new cronJob(syncConfig, function(){
    syncEmails(function(d){
        jobRunLog.log({
            timestamp: new Date(),
            message: 'sync job complete',
            data: d
        });
    });
}, null,true);

// the web server
var router = express();
var server = http.createServer(router);

router.use(express.static(path.resolve(__dirname, 'client')));

router.get('/reprocess', function(req,res){
    gfModel.startProcessing(function(err,d){
        if(err)
            return res.send(err);
            
        res.send(d);
    });
});

router.get('/download', function(req,res){
    gfModel.downloadExport(res);
});

router.get('/joblog', function(req, res) {
    res.send(jobRunLog);
});


router.get('/gf/grab', function(req, res) {
    // grab the list of regos
    var ws = fs.createWriteStream(process.env.GF_LOCAL_FILENAME);
    ws.on('error', function(err) { 
        console.log(err); 
    });
    ws.on('finish', function(){ 
        res.send({ msg: process.env.GF_LOCAL_FILENAME + ' has been cached locally' });
    });
    gfModel.downloadExport(ws);
});

router.get('/gf/members', function(req, res) {
    // grab the goffundraise members
    var sheet = process.env.GF_XLSX_SHEET;
    var wb = xlsx.readFile(process.env.GF_LOCAL_FILENAME);
	res.send(xlsx.utils.sheet_to_row_object_array(wb.Sheets[sheet]));
});

router.get('/gf/jsonp', function(req, res) {
    var sheet = process.env.GF_XLSX_SHEET;
    var wb = xlsx.readFile(process.env.GF_LOCAL_FILENAME);
    var o = us.chain(xlsx.utils.sheet_to_row_object_array(wb.Sheets[sheet]))
        .where({ "I would like to register as:": "A Rider $300|300.00" })
        .map(function(r){
            return {
                Title: r["Title"],
                FirstName: r["Name (First)"],
                LastName: r["Name (Last)"],
                Group: r["Preferred Ride Group"]
            };
        })
        .sortBy(function(r){
            return r.Group; 
        })
        .value();
    res.jsonp(o);
});
        

router.get('/mc/members', function(req, res) {
    
    // grab the mailchimp members
    mcModel.getListMembers(process.env.MC_API_LISTID, function(d){
        res.send(d);
    });
        
});

router.get('/mc/sync', function(req, res) {
    syncEmails(function(d){
        res.send(d);
    });
});    

var syncEmails=function(cb){
    
    // local variables
    var lid = process.env.MC_API_LISTID;
    var grpid = process.env.MC_API_LIST_GRPID;
    var sheet = process.env.GF_XLSX_SHEET;
    
    // grab the gofundraise members from cached local file
    var wb = xlsx.readFile(process.env.GF_LOCAL_FILENAME);
	var gfData = xlsx.utils.sheet_to_row_object_array(wb.Sheets[sheet]);

    // grab the mailchimp members
    mcModel.getListMembers(lid, function(mcData){
        
        // find missing emails in mailchimp
        var missing = us.difference(
            us.map(gfData, function(i) {
                return i["Email"].toLowerCase().trim();    
            }), 
            us.map(mcData, function(i) {
                return i["email"].toLowerCase().trim();
            })
        );
        
        // get the missing objects from the GF data
        var arrToAdd = us.chain(gfData)
            .filter(function(i){ 
                return us.contains(missing, i["Email"].toLowerCase().trim()); 
            }).map(function(i){
                
                // sort out grouping array
                var grps = [];
                if(i["I would like to register as:"] === "A Rider $300|300.00")
                    grps.push('Rider');
                if(i["I would like to register as:"] === "A Supporter $150|150.00")
                    grps.push('Supporter');
                    
                // structure is what mailchimp expects
                return {
                    email: {
                        email: i["Email"].toLowerCase().trim()
                    },
                    email_type: 'html',
                    merge_vars:{
                        EMAIL: i["Email"].toLowerCase().trim(),
                        FNAME: i["Name (First)"], 
                        LNAME: i["Name (Last)"],
                        GROUPINGS: [
                            {
                                id: grpid,
                                groups: grps
                            }
                        ]
                    }
                };
            });
        
        
        // subscribe in batch
        mcModel.subscribe(lid,arrToAdd,function(d){
            if(cb)
                cb({ data: d });
                
        });
        
        // TODO: You need to sort out excluding those that have unsubsribed
    });

};



server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("gf-proxy server listening at", addr.address + ":" + addr.port);
});