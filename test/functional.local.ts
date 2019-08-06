import * as api from "./local/api";
import auth from "./local/auth";
import upload from "./local/upload";

import functional from "./functional";

functional(auth, api, upload);
