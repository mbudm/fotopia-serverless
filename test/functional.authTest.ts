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
    const body = {param1:"fakeid1", param2:"fakeid2"};
    // const body = ["fakeid1", "fakeid2"];
    setupData.api.post(setupData.apiUrl, "/people/merge", {
        body,
      })
      .then((responseBody) => {
        console.log(responseBody)
      })
      .catch(err => {
        console.log(err)
      });
  });
