import * as path from "path";
import formatError from "./formatError";
import getConfig from "./getConfig";

import { ISetupData } from "../types";

export default function setupTests(auth: any, uploader?: any, api?: any) {
  const setupData: ISetupData = {
    apiUrl: "",
    collectionId: `${process.env.FOTOPIA_GROUP}-${process.env.STAGE}`,
    images: [],
    records: [],
    startTime: Date.now(),
    uniqueTag: `_${Math.random().toString(36).substr(2, 9)}`,
    username: "",
  };
  return getConfig()
    .then((config: any) => {
      setupData.apiUrl = config.ServiceEndpoint;
      setupData.region = config.Region;
      return auth(config);
    })
    .then((signedIn) => {
      // eslint-disable-next-line prefer-destructuring
      setupData.signedIn = signedIn;
      setupData.username = signedIn.username;
      setupData.images = [{
        key: `${setupData.username}/one.jpg`,
        path: path.resolve(__dirname, "../mock/one.jpg"),
      }, {
        key: `${setupData.username}/four_people.jpg`,
        path: path.resolve(__dirname, "../mock/four_people.jpg"),
      }, {
        key: `${setupData.username}/two.jpg`,
        path: path.resolve(__dirname, "../mock/two.jpeg"), // throwaway image used just to hack storage to get creds
      }];
      setupData.records = [{
        birthtime: Date.now(),
        img_key: `${setupData.username}/one.jpg`,
        meta: {
          height: 683,
          width: 1024,
        },
        tags: ["blue", "red", setupData.uniqueTag],
        userIdentityId: signedIn.userIdentityId,
        username: setupData.username,
      }, {
        birthtime: setupData.startTime + Math.round((Date.now() - setupData.startTime) / 2),
        img_key: `${setupData.username}/four_people.jpg`,
        meta: {
          height: 654,
          width: 1359,
        },
        tags: ["xlabs", "Melbourne University"],
        userIdentityId: signedIn.userIdentityId,
        username: setupData.username,
      }];

      setupData.api = api;
      setupData.bucket = signedIn.bucket;
      setupData.userIdentityId = signedIn.userIdentityId;
      setupData.upload = uploader && uploader(setupData);
      return api && api.get(setupData.apiUrl, "/indexes");
    })
    .then((existingIndexes) => ({ ...setupData, existingIndexes}))
    .catch(formatError);
}
