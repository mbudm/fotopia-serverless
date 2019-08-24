import * as fs from "fs";

export function fetchConfig(domain: string) {
  const configEndpoint = `https://${domain}/config`;
  // eslint-disable-next-line no-undef
  return fetch(configEndpoint)
    .then((response) => response.json());
}

export function readOutputConfig() {
  return new Promise((resolve, reject) => {
    fs.readFile("./output/config.json", (err, buffer) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const data = JSON.parse(buffer.toString());
        // tslint:disable-next-line:no-console
        console.log("output", data);
        resolve(data);
      } catch (exception) {
        reject(exception);
      }
    });
  });
}

export default function getConfig() {
  return new Promise((res, rej) => {
    const stage = process.env.STAGE || "dev";
    const useCustomDomain = process.env[`USE_CUSTOM_DOMAIN_${stage.toUpperCase()}`];
    // tslint:disable-next-line:no-console
    console.log(stage, useCustomDomain);
    const customDomain = process.env[`CUSTOM_DOMAIN_${stage.toUpperCase()}`];
    if (useCustomDomain === "true" && customDomain) {
      fetchConfig(customDomain)
        .then(res)
        .catch(rej);
    } else {
      readOutputConfig()
        .then(res)
        .catch(rej);
    }
  });
}
