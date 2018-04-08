
import test from 'tape';
import util from 'util';
import { getImageData } from '../fotos/uploaded';

const formatError = (e) => {
  console.log('error', util.inspect(e));
};

test('setup', (t) => {
  const url = 'http://localhost:5000/fotopia-web-app-prod/tester/two.jpg';
  const eventData = {
    bucket: 'fotopia-web-app-prod',
    s3key: 'fotopia-web-app-prod/tester/two.jpg',
  };
  // const url = 'http://www.usanetwork.com/sites/usanetwork/files/styles/629x720/public/Daniel_Bryan_1920x1080.jpg';
  getImageData(url, eventData)
    .then((result) => {
      t.deepEqual(result, {});
      t.end();
    })
    .catch(formatError);
});
