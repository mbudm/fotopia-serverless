import { config } from "dotenv";

import cleanup from "./functional/cleanup";
import deleteAllTests from "./functional/deleteAll";
import setup from "./functional/setup";
import * as api from "./remote/api";
import auth from "./remote/auth";

config();

setup(auth)
  .then((setupData: any) => {
    deleteAllTests(setupData, api);
    cleanup();
  });
