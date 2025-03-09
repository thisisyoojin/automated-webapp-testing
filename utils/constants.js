/** file paths for all testings */
export const filePaths = {
  envFile: "config/.env.conf.json",
  requestConfig: "config/.request-config.json",
  requestResult: "results/run/responseTimes",
  devResult: "results/run/dev",
  qaResult: "results/run/qa",
  sandboxResult: "results/run/sb"
};

/** postman test constants */
export const testCases = [
  {
    script: "quote-validation",
    data: "./scripts/data/quote-validation.csv"
  }
];

export const appLoadingTime = 4500;

/** k6 test constants */

export const endpoints = {
  profile: "ethernet/v1/profile",
  multiquotes: "ethernet/v1/multiquotes",
  orders: "ethernet/v1/orders/eaccess",
  services: "ethernet/v1/services/eaccess"
};


export const testOptions = (testType) => {
  
  let option, waitTime;

  switch (testType) {
    case "smoke":
      option = {
        vus: 1,
        iterations: 3
      };
      waitTime = 1;      
      break;

    case "perf":
      option = {
        scenarios: {
          minimum_load: {
            executor: "per-vu-iterations",
            vus: 1,
            iterations: 5,
            startTime: "0s",
            maxDuration: "5m"
          },
          normal_load: {
            executor: "per-vu-iterations",
            vus: 5,
            iterations: 10,
            startTime: "5m",
            maxDuration: "7m"
          },
          peak_load: {
            executor: "per-vu-iterations",
            vus: 10,
            iterations: 5,
            startTime: "12m",
            maxDuration: "5m",
          }
        }
      };
      waitTime = 15;
      break;

    default:
      console.log("test type should be provided");
  }
  return { option, waitTime };
};


