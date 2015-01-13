# gf-proxy
Middleware that allows you to expose reports from gofundraise.com.au for your ETL / reporting / mining needs.

The way it works is it essentially recreates the set of http requests needed to get to the relevant reports, essentially replacing the human work with this automation.

example usage with express

```javascript
var express = require('express');
var gfproxy = require("./lib/gf-proxy.js"); // or wherever you put it.

// config params
// @gfUser: the username for the gf account
// @gfSecret: the secret for the gf user account
// @gfEventId: the id of the gf event that holds the form
// @gfFormId: the id of the gf form that you want to process
var gfModel = new gfproxy({
    gfUser: process.env.GF_USER,
    gfSecret: process.env.GF_SECRET,
    gfEventId: process.env.GF_EVENT_ID,
    gfFormId: process.env.GF_FORM_ID
});

// example call to begin processing
gfModel.startProcessing(function(err,d){
    // do something with d
});

// example piping to express response
router.get('/download', function(req,res){
    // the downloadExport will pipe the file to the express response
    gfModel.downloadExport(res);
});

```

### prerequisites 
- Its expected that you have an existing gofundraise.com.au account. 
- Populate the env variables (GF_USER, GF_SECRET) or the commandline arguments (u,s) with the relevant details.
- Configure the (CRON_CONFIG_HOUR) env variable or the (c) commandline argument with the hour of the day you want the processing to run.
- You need to use the downloadExport method with an express route because it pipes the file to the route response (removes the need to save the file locally)

### TODO
- cater for more than one event, i.e. the config doesnt accept the event, you add it in the processing method etc...
- extend downloadExport to not depend on express
- add to npm
