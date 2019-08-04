import dotEnv from 'dotenv';

import createTests from './functional/create';
import setup from './functional/setup';
import uploadTests from './functional/upload';
import queryTests from './functional/query';
import deleteTests from './functional/del';
import getTests from './functional/get';
import updateTests from './functional/update';
import peopleTests from './functional/people';
import cleanup from './functional/cleanup';

dotEnv.config();

export default function (auth, api, upload) {
  setup(auth)
    .then((setupData) => {
      uploadTests(setupData, upload);
      createTests(setupData, api);
      queryTests(setupData, api);
      getTests(setupData, api);
      deleteTests(setupData, api);
      updateTests(setupData, api);
      peopleTests(setupData, api);
      cleanup();
    });
}
