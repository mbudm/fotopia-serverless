import * as test from "tape";
import * as indexes from "./indexes";
import { IIndex } from "./types";

test("removeZeroCounts ", (t) => {
  const index: IIndex = {
    people: {
      emma: 1,
      leona: 1,
      wilma: 2,
    },
    tags: {
      black: 0,
      pink: 2,
      yellow: 1,
    },
  };
  const result = indexes.removeZeroCounts(index);
  t.equal(result.tags.black, undefined, "0 index has been removed");
  t.end();
});
