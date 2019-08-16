
import * as api from "./remote/api";
import auth from "./remote/auth";
import upload from "./remote/upload";

import functional from "./functional";

functional(auth, api, upload);
