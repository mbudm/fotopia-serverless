import * as test from "tape";
import { failure, success } from "./responses";

test("success", (t) => {
  const body = "success";
  const res = success(body);
  t.equal(res.statusCode, 200);
  t.ok(res.body.indexOf(body));
  t.end();
});

test("failure", (t) => {
  const body = "Oops";
  const res = failure(body);
  t.equal(res.statusCode, 500);
  t.equal(res.body, JSON.stringify({ error: body }));
  t.end();
});
