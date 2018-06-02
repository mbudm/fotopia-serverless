export default function auth() {
  return new Promise(resolve => resolve({
    username: 'tester',
    userIdentityId: 'fakeid'
  }));
}
