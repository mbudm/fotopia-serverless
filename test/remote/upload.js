import { Storage } from 'aws-amplify';

Storage.configure({ level: 'protected' });

export default function upload(key, object, options) {
  return Storage.put(key, object, { level: 'protected', ...options });
}
