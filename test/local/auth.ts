export default function auth() {
  return new Promise((resolve) => resolve({
    userIdentityId: "fakeid",
    username: "tester",
  }));
}
