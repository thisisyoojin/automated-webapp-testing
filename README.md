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
```
Fill out variables with suitable values, and if you don't know them, please ask test engineer for it.


## Functional Testing

Functional API testing is to ensure API returns correct output from requests.
To run, use the following command by environment you want to test. When test is done, html file will be open with chrome browser.
```
npm run func
```
