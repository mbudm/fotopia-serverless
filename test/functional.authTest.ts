import { config } from "dotenv";

import setup from "./functional/setup";
import * as api from "./remote/api";
import auth from "./remote/auth-node";
import uploader from "./remote/upload";

config();

setup(auth, null, null)
  .then((setupData: any) => {
    // tslint:disable-next-line:no-console
    console.log("setupData:", setupData);
  });
