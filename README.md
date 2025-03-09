# Automated Web application Testing

Automated web app testing tool to perform functional and load testing of wholesale ethernet API.

## Prerequisites

As this testing framework is built on node.js with postman and Grafana k6, all dependencies needs to be installed for testing. To set up, run:
```
# homebrew: https://brew.sh/

brew install node
npm i
```

### Configuration

After installing dependencies, create result folders and configuration files with following command.
```
npm run setup
```

When configuration files are copied, some environment variables need to be provided in files below.
```
config/.env.conf.json
config/.postman.dev.json
config/.postman.qa.json
config/.postman.sb.json
```
Fill out variables with suitable values, and if you don't know them, please ask test engineer for it.


## Functional Testing

Functional API testing is to ensure API returns correct output from requests.
To run, use the following command by environment you want to test. When test is done, html file will be open with chrome browser.
```
npm run func
```

## AB Testing

AB Testing is implemented to compare two different versions of API. It can be used to compare two different environments(AB) or the same environment with different versions(Pre/Post).
A config file is located in `config/.request-config.json`, which you can change a number of iteration and endpoints.

For starting the test, you need to send requests, at least two, to compare with following command. Testing environments(dev, qa, sb) and tags are mandatory fields to provide.
```
npm run requests env="<environment>" tag="<tag to test>"
```
Tag is used as file name when saving the results in `results/run/responseTimes` folder.
** File name is saved as `<tag>(<env>)` - e.g. 1.24.2(dev)

After sending requests, you can compare two tags and export the result to excel file with following command. The file will be generated in `results` folder.
```
npm run compare a="<tag1>(<env1>)" b="<tag2>(<env2>)"
```

If you want to check requests sent in past, they can be checked with following command. 
```
npm run showTags
```

Basic testing flow is sending two requests to compare, then comparing results from the requests. For an instance, you can compare development and qa environment API with following flow.

```
# send requests to environment dev with a suitable tag
npm run requests env="qa" tag="1.26.1-42-gb148e635"
npm run requests env="dev" tag="1.26.1-43-gd05b949b"

# confirm files for tags are generated
npm run showTags

# compare results between two tags
npm run compare a="1.26.1-42-gb148e635(qa)" b="1.26.1-43-gd05b949b(dev)"
```


## Smoke Testing

A smoke test is a test configured for minimal load to verify that API doesn't throw errors when under minimal load.
Currently smoke testing is sending requests in 3 times.
```
npm run smoke:dev
npm run smoke:qa
npm run smoke:sb
```

## Performance Testing

Once smoke test shows zero errors, performance testing can be executed. This is primarily concerned with assessing the current performance of API in terms of concurrent users under both normal and peak conditions. Currently performance testing is taking 17 minutes each for internal and external user.
```
npm run perf:dev
npm run perf:qa
npm run perf:sb
```

## Check Testing Result

Test results are exported as html files. These files can be found on `results/result-dev.html`, `results/result-qa.html`, or `results/result-sb.html`
```
npm run show:dev
npm run show:qa
npm run show:sb
```

## Futures
1. Add more test cases including negative test cases
2. Dockerize the code
3. Integrate with CI/CD 
4. Send an email with test result
