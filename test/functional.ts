import { config } from "dotenv";

import * as api from "./remote/api";
import auth from "./remote/auth";
import uploader from "./remote/upload";

import createTests from "./functional/create";
import deleteTests from "./functional/del";
import deleteAllTestData from "./functional/deleteMocks";
import getTests from "./functional/get";
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
      deleteAllTestData(setupData, api);
      uploadTests(setupData, setupData.upload);
      createTests(setupData, api);
      queryTests(setupData, api);
      getTests(setupData, api);
      indexesTests(setupData, api);
      updateTests(setupData, api);
      peopleTests(setupData, api);
      deleteTests(setupData, api);
    });
}

functional();
