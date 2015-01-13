# gf-proxy
Middleware that allows you to expose reports from gofundraise.com.au for your ETL / reporting / mining needs.

The way it works is it essentially recreates the set of http requests needed to get to the relevant reports, essentially replacing the human work with this automation.

There is an express site that's included but this is just an example an i recommend you implement some sort of security in there just to be cautious.

## prerequisites 
- Its expected that you have an existing go fundraise account
