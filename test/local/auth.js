import uuid from 'uuid';

export default function auth() {
  return new Promise(resolve => resolve({ username: uuid.v1() }));
}
