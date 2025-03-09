import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import chrome from "selenium-webdriver/chrome.js";
import { Builder, By, Key, until } from "selenium-webdriver";
import * as newman from "newman";
import { createRequire } from "module";
import { hrtime } from 'node:process';
import assert from 'node:assert'
import { once } from "events";
import axios from 'axios';
import inquirer from 'inquirer';
import excelJS from 'exceljs';

import { testCases, appLoadingTime, endpoints, filePaths } from "./constants.js";
import { roundNanoSec, averageArray, percentageDiff, checkIfTwoArraysEqual, getSortedFilesFromDir } from './test-utils.js'

const require = createRequire(import.meta.url); // construct the require method to use with module
const showError = (msg) => console.log('\x1b[31m', msg, '\x1b[0m'); // Error message is displayed in red at terminal
const showWarning = (msg) => console.log('\x1b[33m', msg, '\x1b[0m'); // Warning message is displayed in yellow at terminal


/**
 * Function to get environment variables from command
 * @param {array} optionsTxt array of option strings
 */
function getOptions(optionsTxt) {
  let options = {}
  let key, value;

  optionsTxt.forEach(optionTxt => {
    key = optionTxt.split('=')[0].toLowerCase().trim()
    value = optionTxt.split('=')[1].toLowerCase().trim()
    options[key] = value
  })

  return options
}


/**
 * Function to validate environment text and update testing environment in config file
 * @param {string} envTxt testing environment (dev, qa, or sb)
 */
export function setupEnv(envTxt) {
  
  if (envTxt === undefined) {
    throw Error('Please provide environment : dev');
  }
  const envs = ['dev'];
  const env = envTxt.toLowerCase().trim();
  
  if(!envs.includes(envTxt)) {
    throw Error('Invalid Environment is given');
  }

  try {
    const config = JSON.parse(readFileSync(filePaths.envFile, "utf-8"));
    config["CURRENT_ENV"] = env
    writeFileSync(filePaths.envFile, JSON.stringify(config, null, 2), {
      encoding: 'utf8',
      flag: 'w'
    });
  } catch(err) {
    showError(err)
  }
}

/** Function to read config file
 * @returns {object} config dictionary for current testing environment
 */
export function readConfig() {
  console.log("Reading config...");
  const config = JSON.parse(readFileSync(filePaths.envFile, "utf-8"));
  const currentEnv = config.CURRENT_ENV;
  return config[currentEnv];
}



/******************************************************************
 * Functions on postman scripts (functionality testing)
/*******************************************************************/


/** Function to update auth in postman environment variable file
 * @param {object} config config dictionary for current testing environment
 */
function updateAuthInEnv(config) {
  console.log("Updating auth in header...");

  const currentEnv = config["ENV"];
  const partnerId = config["PARTNER_ID"];
  const auth = `Basic ${config["AUTH"]}`;

  try {
    const data = require(`../config/.postman.${currentEnv}.json`);
    for (const variable of data["values"]) {
      switch (variable.key) {
        case "partner_id":
          variable["value"] = partnerId;
          break;
        case "auth":
          variable["value"] = auth;
          break;
        default:
          if (!variable["value"]) {
            throw Error('Please check the config file has values')
          }
          break;
      }
    }
    const envText = JSON.stringify(data, null, 2);
    writeFileSync(`./config/.postman.${currentEnv}.json`, envText, {
      encoding: "utf8",
      flag: "w",
    });
  } catch(err) {
    showError(err)
  }
}


/** Function sending profile request to confirm auth is valid with postman environment variables
 * @param {object} config config dictionary for current testing environment
 * @param {string} user user type: internal or external
 * @returns {boolean} request is successfully sent with valid auth
 */
async function checkAuthInEnvIsValid(config) {
  const testRun = newman.run({
    collection: require(`../scripts/functional/profile.json`),
    environment: `./config/.postman.${config["ENV"]}.json`,
  });

  const isAuthValid = (data) => {
    if (data.err || data.summary.run.failures.length > 0) {
      console.log(`Config is invalid...`);
      return false;
    }
    console.log(`Config is valid...`);
    return true;
  };

  await once(testRun, "done");
  return isAuthValid(testRun);
}


/** Function to send testcase via postman
 * @param {string} currentEnv current testing environment: dev or qa
 * @param {object} testCase
 * @param {string} testCase.script test script file path
 * @param {string} testCase.data data file path
 * @param {string} user user type: internal or external
 */
async function runPostmanTest(currentEnv, testCase) {
  console.log(`Testing ${testCase.script}`);
  const testRun = newman.run({
    collection: require(`../scripts/functional/${testCase.script}.json`),
    environment: `./config/.postman.${currentEnv}.json`,
    iterationData: `${testCase.data}`,
    reporters: ["htmlextra"],
    reporter: {
      htmlextra: {
        export: `./results/run/${currentEnv}/func-${testCase.script}.html`,
        template: "./utils/dashboard-template.hbs",
      },
    },
  });

  const hasPassed = (data) => {
    if (data.err || data.summary.run.failures.length > 0) {
      showError(`Test failed: ${testCase.script}`);
      return false;
    }
    return true;
  };

  await once(testRun, "done");
  return hasPassed(testRun)
}

/** Function to run all postman test scripts */
export async function runAllPostmanTests() {
  const config = readConfig();
  validateConfigValues(config, 'external')
  const currentEnv = config["ENV"];

  const authIsValid = await checkAuthInEnvIsValid(config);
  if (!authIsValid) {
    await updateAuthInEnv(config);
  }

  testCases.forEach(async testCase => {
    await runPostmanTest(currentEnv, testCase);
  });
}

/******************************************************************
 * Functions to update cookie for k6 scripts (load testing)
/*******************************************************************/

/** Function to verify if cookie in config file is valid, and if it is not, it updates file
* @param {object} config config dictionary for current testing environment
*/
export async function verifyCookieInConfig() {
  const config = readConfig();
  validateConfigValues(config, 'all')
  const isValid = await checkCookieInConfigIsValid(config);
  if (!isValid) {
    await updateCookieInConfig(config);
  }
}

/** k6 script uses text file with cookie, so need to check cookie is valid with test request 
 * @param {object} config config dictionary for current testing environment
 * @returns {boolean} request is successfully sent with valid auth
 */
async function checkCookieInConfigIsValid(config) {
  
  const URL = config["SPI_URL"];
  let cookie = config["COOKIE"];

  try {
    const response = await axios.get(`${URL}/${endpoints.profile}/`, { headers: { "cookie": cookie }});
    assert(response.data.type === 'internal')
    console.log(response)
    return true;
  } catch (err) {
    showWarning('Profile request does not return JSON. Need to get new cookie...');
    return false; // when cookie is invalid, it returns html instead of json, which causes error
  }
}

/** Function to update cookie in environment variable json file
 * @param {object} config config dictionary for current testing environment
 */
async function updateCookieInConfig(config) {
  const cookie = await getAuthCookies(config);
  const data = require(`../config/.env.conf.json`);
  const currentEnv = config.ENV;
  data[currentEnv]['COOKIE'] = cookie;
  const envText = JSON.stringify(data, null, 2);
  writeFileSync(`./config/.env.conf.json`, envText, {
    encoding: "utf8",
    flag: "w",
  });
}

/******************************************************************
 * Functions on AB testing
/*******************************************************************/


/**
 * Function to check if options for sending request function are correctly provided
 * @param {array} options array with environment environment names and values 
 * @returns {object} testing environment and tag
 */
async function validateRequestOptions(options) {

  const { env, tag } = getOptions(options);

  if (tag === undefined) {
    throw Error('A tag is not provided')
  }
  
  const allTags = readdirSync(filePaths.requestResult)
  for (let existTag of allTags) {
    if (existTag === tag) {
      await inquirer.prompt({
        type: 'list',
        name: 'tag',
        message: `A tag already exists. Do you want to overwrite it?`,
        choices: ['yes', 'no']
      }).then(answers => {
        if (answers['tag'] === 'no') {
          throw new Error('Please provide new tag')
        }
      })
    }
  }
  return { env, tag }
}



/**
 * Function to read config from 'config/.request-config.json' and send requests
 * @returns {object} results with response times by requests
 */
async function sendRequests() {

  const config = readConfig()
  validateConfigValues(config, 'external')
  const testConfig = require(`../${filePaths.requestConfig}`)
  
  const results = {
    'testDate': new Date().toDateString(),
    'testTime': new Date().toTimeString(),
    'iteration': testConfig['iteration'],
    'requests': []
  }

  for (const testUrl of testConfig['urls']) {
    const { requestName, responseTimes } = await sendRequestsToUrl(testUrl, testConfig['iteration'], config)
    results[requestName] = responseTimes
    results['requests'].push(requestName)
  }

  return results
}
