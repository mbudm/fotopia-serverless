
import auth from './remote/auth';
import * as api from './remote/api';
import upload from './remote/upload';

import functional from './functional';

functional(auth, api, upload);
