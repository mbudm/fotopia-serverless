import { config } from "dotenv";

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

export default function(auth: any, api: any, upload: any) {
  setup(auth)
    .then((setupData: any) => {
      deleteAllTestData(setupData, api);
      uploadTests(setupData, upload);
      createTests(setupData, api);
      queryTests(setupData, api);
      getTests(setupData, api);
      indexesTests(setupData, api);
      updateTests(setupData, api);
      peopleTests(setupData, api);
      deleteTests(setupData, api);
    });
}
