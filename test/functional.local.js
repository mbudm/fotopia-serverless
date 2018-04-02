import auth from './local/auth';
import * as api from './local/api';
import upload from './local/upload';

import functional from './functional';

functional(auth, api, upload);
