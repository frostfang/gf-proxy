var request = require('request');
var cheerio = require('cheerio');
var extend = require('util')._extend;

// cfg params
// @gfUser: the username for the gf account,
// @gfSecret: the secret for the gf user account
// @gfEventId: the id of the gf event that holds the form
// @gfFormId: the id of the gf form that you want to process
module.exports = function(cfg) {
    // - module variables
    this.user = {
        username: cfg.gfUser,
        secret: cfg.gfSecret
    };
    this.urls = {
        base: 'http://www.gofundraise.com.au',
        baseSSL: 'https://www.gofundraise.com.au'
    };
    this.urls.loginExport = this.urls.baseSSL + 
        '/account/logon?ReturnUrl=%2feventcreator%2fforms%2fexport-entries%2f' + 
        cfg.gfEventId + 
        '%3fformId%3d' + 
        cfg.gfFormId +
        '%26includeFrpDetails%3Dtrue';
    this.urls.generateExport = this.urls.base + 
        '/eventcreator/forms/export-entries/' + 
        cfg.gfEventId + 
        '?formId=' +
        cfg.gfFormId +
        '&includeFrpDetails=true';
    this.urls.loginManage = this.urls.baseSSL + 
        '/account/logon?ReturnUrl=%2feventcreator%2fforms%2fmanage%2f' + 
        cfg.gfEventId +  
        '%3fformId%3d' + 
        cfg.gfFormId;
    
    
    // - module methods
    // This will kick off the GF report generating process
    this.startProcessing = function(cbComplete){
        var me = this;
        
        request.post(
            this.urls.loginManage,
            {
                form:{
                    Provider: 'facebook',
                    UserName: this.user.username,
                    Password: this.user.secret
                },
                followAllRedirects: true,
                jar:true
            },
            function(postErr,postRes,postBody){
                // grab some details from the page
                var pHTML = cheerio.load(postBody);
                var pData = {
                    totalRegistrations: pHTML('span#TotalRecordCount').text(),
                };
                
                
                if (!postErr) {
                    // you need to make another post here, form body should 
                    // be empty plus the credentials should be jar'd
                    request.post(me.urls.generateExport,
                    {
                        followAllRedirects: true,
                        jar: true
                    },
                    function(expErr,expRes,expBody) {
                        var expData = JSON.parse(expBody);
                        if(cbComplete){
                            cbComplete(null, extend(pData, expData));
                        }
                    });
                }
        });    
    };
    
    // function to download the file
    // expects the response object from an express route
    this.downloadExport = function(resp){
        // needed for remembering scope on callback
        var me = this;
        
        request.post(
            this.urls.loginManage,
            {
                form:{
                    Provider:'facebook',
                    UserName: this.user.username,
                    Password: this.user.secret
                },
                followAllRedirects: true,
                jar:true
            },
            function(postErr,postRes,postBody){
                
                if (!postErr) {
                    var pHTML = cheerio.load(postBody);
                    
                    var d = {
                        totalRegistrations: pHTML('span#TotalRecordCount').text(),
                        registrationExportLink: pHTML('a#lnkExportEntries').attr('href'),
                        registrationDownloadLink: pHTML('div.message.success a').attr('href')
                    };
                    
                    if(resp){
                        if(d.registrationDownloadLink){
                            // send the file along the wire
                            
                            request.get(
                                me.urls.base + d.registrationDownloadLink,
                                {
                                    followAllRedirects: true,
                                    jar:true    
                                }
                            ).pipe(resp); 
                        }
                        else
                        {
                            // no file ready then send response otherwise do nothing
                            if(resp.send)
                                resp.send('woah there, the file is still being processed. Please try again later.');
                        }
                    }
                    
                }
        });
    
    };
};

