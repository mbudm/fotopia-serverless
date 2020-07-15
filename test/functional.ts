import { config } from "dotenv";

import api from "./remote/api";
import auth from "./remote/auth";
import uploader from "./remote/upload";

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
      deleteAllTestData(setupData, setupData.api);
      uploadTests(setupData, setupData.upload);
      queryTests(setupData, setupData.api);
      getTests(setupData, setupData.api);
      indexesTests(setupData, setupData.api);
      updateTests(setupData, setupData.api);
      peopleTests(setupData, setupData.api);
      deleteTests(setupData, setupData.api);
    });
}

functional();
