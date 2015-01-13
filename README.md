# gf-proxy
Middleware that allows you to expose reports from gofundraise.com.au for your ETL / reporting / mining needs.

The way it works is it essentially recreates the set of http requests needed to get to the relevant reports, essentially replacing the human work with this automation.

Essentially the automation is a node-cron job that runs on a daily basis.

There is an express site that's included but this is just an example and i recommend you replace this with something with a bit more security or get rid of it all together.

### prerequisites 
- Its expected that you have an existing go fundraise account. 
- Populate the env variables (GF_USER, GF_SECRET) or the commandline arguments (u,s) with the relevant details.
- Configure the (CRON_CONFIG_HOUR) env variable or the (c) commandline argument with the hour of the day you want the processing to run.
- 

### TODO
- The gfModel object needs to be refactored into its own module and included via require().
- Once its refactored this repo needs to just have that model instead of all the express and client stuff.
- cater for more than one event
