import { config } from "dotenv";

import setup from "./functional/setup-node";
import api from "./remote/api-node";
import auth from "./remote/auth-node";
import uploader from "./remote/upload";

config();

// Yay
// https://serverless-stack.com/chapters/connect-to-api-gateway-with-iam-auth.html

setup(auth, uploader, api)
  .then((setupData: any) => {
    // tslint:disable-next-line:no-console
    console.log("setupData:", setupData);
  });
