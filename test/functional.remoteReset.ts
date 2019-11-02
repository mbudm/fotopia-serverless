import { config } from "dotenv";

import deleteAllNotJustTestData from "./functional/deleteAll";
import setup from "./functional/setup";
import * as api from "./remote/api";
import uploader from "./remote/upload";
import auth from "./remote/auth";

config();

setup(auth, uploader, api)
  .then((setupData: any) => {
    deleteAllNotJustTestData(setupData, api);
  });
