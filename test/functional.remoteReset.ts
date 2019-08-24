import { config } from "dotenv";

import cleanup from "./functional/cleanup";
import deleteAllNotJustTestData from "./functional/deleteAll";
import setup from "./functional/setup";
import * as api from "./remote/api";
import auth from "./remote/auth";

config();

setup(auth)
  .then((setupData: any) => {
    deleteAllNotJustTestData(setupData, api);
    cleanup();
  });
