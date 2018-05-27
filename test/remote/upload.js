import { Storage } from 'aws-amplify';

export default function upload(key, object, options) {
  return Storage.put(key, object, { level: 'protected', ...options});
}
