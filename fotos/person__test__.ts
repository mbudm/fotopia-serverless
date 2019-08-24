import * as test from "tape";
import * as person from "./person";
import { IPerson } from "./types";

test("getUpdatedPeople", (t) => {
  const existingPeople: IPerson[] = [
    {
      faces: [
        {
          ExternalImageId: "c7de65d0-9a12-11e8-a9e0-cb0dc753a59b",
          FaceId: "c7febf10-9a12-11e8-a9e0-cb0dc753a59b",
        },
      ],
      id: "c8523640-9a12-11e8-a9e0-cb0dc753a59b",
      imageDimensions: {
        height: 200,
        width: 300,
      },
      img_key: "tester/one.jpg",
      name: "",
      thumbnail: "tester/one-suffix.jpg",
      userIdentityId: "fakeid",
    },
    {
      faces: [
        {
          ExternalImageId: "c8852d20-9a12-11e8-a9e0-cb0dc753a59b",
          FaceId: "c885c960-9a12-11e8-a9e0-cb0dc753a59b",
        },
      ],
      id: "c8ba6df0-9a12-11e8-a9e0-cb0dc753a59b",
      imageDimensions: {
        height: 200,
        width: 300,
      },
      img_key: "tester/two.jpg",
      name: "",
      thumbnail: "tester/two-suffix.jpg",
      userIdentityId: "fakeid",
    },
  ];
  const data = { name: "Jacinta Dias" };
  const pathParams = { id: "c8523640-9a12-11e8-a9e0-cb0dc753a59b" };
  const result = person.getUpdatedPeople(existingPeople, data, pathParams);
  t.ok(Array.isArray(result), "people array");
  t.equal(result[0].name, data.name, "name updated");
  t.end();
});
