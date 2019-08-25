import { config } from "dotenv";

import cleanup from "./functional/cleanup";
import createTests from "./functional/create";
import deleteTests from "./functional/del";
import deleteAllTestData from "./functional/deleteMocks";
import getTests from "./functional/get";
import peopleTests from "./functional/people";
import queryTests from "./functional/query";
import setup from "./functional/setup";
import updateTests from "./functional/update";
import uploadTests from "./functional/upload";

config();

export default function(auth: any, api: any, upload: any) {
  setup(auth)
    .then((setupData: any) => {
      // to check - there may be a prob when I delete the
      // index and people objects, this adds time and so
      // tests that check for people dont pass...?
      deleteAllTestData(setupData, api);
      uploadTests(setupData, upload);
      createTests(setupData, api);
      queryTests(setupData, api);
      getTests(setupData, api);
      updateTests(setupData, api);
      peopleTests(setupData, api);
      deleteTests(setupData, api);
      cleanup();
    });
}
