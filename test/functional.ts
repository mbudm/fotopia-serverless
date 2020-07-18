import { config } from "dotenv";

import api from "./remote/api";
import auth from "./remote/auth";
import uploader from "./remote/upload";

import deleteTests from "./functional/del";
import deleteAllTestData from "./functional/deleteMocks";
import getTests from "./functional/get";
import getBaselines from "./functional/getBaselines";
import indexesTests from "./functional/indexes";
import peopleTests from "./functional/people";
import queryTests from "./functional/query";
import setup from "./functional/setup";
import updateTests from "./functional/update";
import uploadTests from "./functional/upload";

config();

export default function functional() {
  setup(auth, uploader, api)
    .then((setupData: any) => {
      deleteAllTestData(setupData, setupData.api);
      return getBaselines(setupData);
    })
    .then((setupDataUpdated) => {
      uploadTests(setupDataUpdated, setupDataUpdated.upload);
      queryTests(setupDataUpdated, setupDataUpdated.api);
      getTests(setupDataUpdated, setupDataUpdated.api);
      indexesTests(setupDataUpdated, setupDataUpdated.api);
      updateTests(setupDataUpdated, setupDataUpdated.api);
      peopleTests(setupDataUpdated, setupDataUpdated.api);
      deleteTests(setupDataUpdated, setupDataUpdated.api);
    });
}

functional();
