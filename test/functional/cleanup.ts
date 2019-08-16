import * as test from "tape";

export default function cleanup() {
  test("force kill amplify process", (t: test.Test) => {
    t.end();
    process.exit(0);
  });
}
