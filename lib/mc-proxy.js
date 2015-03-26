var mcapi = require("mailchimp-api");


module.exports = function(cfg){
    
    // mail chimp context
    var mc = new mcapi.Mailchimp(cfg.mcApiKey);
    
    // paging size, defaults to 50
    var pgSize = cfg.mcPageSize || 50;

    // chained recurrsion to get the members of list
    var recurseListFromPage = function(arr,lid,pg,lm,cb){
        // function reference for recursion
        var fnCallee = arguments.callee;
        
        mc.lists.members({ id: lid, opts: { start: pg ,limit: lm }}, function(d){
            
            // add the items to the array
            arr = arr.concat(d.data);
            
            // recurse
            if(arr.length == d.total)
                return cb(arr); // here you have a complete list of members
            else
                return fnCallee(arr,lid,pg + 1,lm,cb);
        });
    };
    
    // public methods
    // get all the members in a list
    this.getListMembers = function(listId, cb){
        recurseListFromPage([], listId, 0, pgSize, cb);
    };
    
    // subscribe a batch of members
    // must follow the batch subscribe api method, refer to here:
    // https://apidocs.mailchimp.com/api/2.0/lists/batch-subscribe.php
    this.subscribe = function(listId, subscribersArray, cb){
        mc.lists.batchSubscribe({
            id: listId,
            batch: subscribersArray,
            double_optin: false,
            update_existing: true,
            replace_interests: false
        }, cb);
    };
    
};