import { config } from "dotenv";

import setup from "./functional/setup-node";
import api from "./remote/api-node";
import auth from "./remote/auth-node";
import uploader from "./remote/upload";

config();

setup(auth, uploader, api)
  .then((setupData: any) => {
    // tslint:disable-next-line:no-console
    console.log("setupData:", setupData);
  });
