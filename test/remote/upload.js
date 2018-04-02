import { Storage } from 'aws-amplify';

export default function upload(key, object, options) {
  return Storage.vault.put(key, object, options);
}
