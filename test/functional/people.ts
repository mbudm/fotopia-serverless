import * as test from "tape";
import {
  IImage,
  IPerson,
  IPersonMergeBody,
  IPersonUpdateBody,
  IQueryBody,
} from "../../fotos/types";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";

export default function peopleTests(setupData, api) {
  let people: IPerson[];
  let imageWithFourPeople: IImage | undefined;
  let imageWithOnePerson: IImage | undefined;

  const retryStrategy = [500, 1000, 2000, 5000];

  test("get all people, should have at least 5 test image people", (t) => {
    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/people"],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IPerson[]) => {
      if (responseBody.length <= 5) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed to get more than 5 people after ${retryCount} retries`);
          t.end();
        }
      } else {
        people = responseBody;
        t.equal(
          responseBody.length >= 5,
          true,
          `length of ${responseBody.length} - at least each person from image one and image with 4 people`,
        );
        t.end();
      }
    };
    const retry = () => {
      retryableTest.fn.apply(this, retryableTest.args)
        .then(retryableTestThen)
        .catch(formatError);
    };

    retry();
  });

  test("query all to get the test image records", (t) => {

    const query: IQueryBody = {
      criteria: {
        people: [],
        tags: [],
      },
      from: setupData.startTime,
      to: Date.now(),
      username: setupData.username,
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody: IImage[]) => {
        imageWithOnePerson = responseBody.find((rec) => rec.img_key === setupData.records[0].img_key);
        t.ok(imageWithOnePerson, "image one found");
        t.equal(
          imageWithOnePerson!.people!.length,
          1,
          `image has people length of ${imageWithOnePerson!.people!.length}`,
        );
        imageWithFourPeople = responseBody.find((rec) => rec.img_key === setupData.records[1].img_key);
        t.ok(imageWithFourPeople, "image with four people found");
        t.equal(
          imageWithFourPeople!.people!.length,
          4,
          `image w 4 has people length of ${imageWithFourPeople!.people!.length}`,
        );
        t.end();
      })
      .catch(formatError);
  });

  const updatedPerson: IPersonUpdateBody = {
    name: "Jacinta Dias",
  };

  // purposely checking this later (see last test) to allow for latency
  test("updatePerson in image 1", (t) => {
    api
      .put(setupData.apiUrl, `/person/${imageWithOnePerson!.people![0]}`, {
        body: updatedPerson,
      })
      .then((responseBody) => {
        t.ok(responseBody, `update person in image one ${imageWithOnePerson!.people![0]} ok`);
        t.end();
      })
      .catch(formatError);
  });

  test("peopleMerge - merge first two people in image with 4 people", (t) => {
    const body: IPersonMergeBody = [imageWithFourPeople!.people![0], imageWithFourPeople!.people![1]];
    api
      .post(setupData.apiUrl, "/people/merge", {
        body,
      })
      .then((responseBody) => {
        t.ok(responseBody, "peopleMerge person ok");
        t.end();
      })
      .catch(formatError);
  });

  test("getPeople - check peopleMerge has removed person 1", (t) => {
    api
      .get(setupData.apiUrl, "/people")
      .then((responseBody: IPerson[]) => {
        t.equal(responseBody.length, people.length - 1, "one less person");
        t.ok(responseBody.find(
          (person) => person.id === imageWithFourPeople!.people![0],
        ), "person 0 is still in the people object");
        t.notOk(responseBody.find(
          (person) => person.id === imageWithFourPeople!.people![1],
        ), "person 1 is not in the people object");
        t.end();
      })
      .catch(formatError);
  });

  test("wait for 3 seconds", (t) => {
    setTimeout(() => {
      t.comment("Waited for 3 secs");
      t.end();
    }, 3000);
  });

  test("after merge image that had person 1 now has person 0", (t) => {
    const apiPath = getEndpointPath(imageWithFourPeople);
    api
      .get(setupData.apiUrl, apiPath)
      .then((responseBody: IImage) => {
        t.equal(
          responseBody.img_key,
          imageWithFourPeople!.img_key,
          "response has same img_key",
        );
        t.equal(responseBody.id, imageWithFourPeople!.id, "response has same id");
        t.equal(
          responseBody.people!.length,
          3,
          "image has only 3 people",
        );
        t.equal(
          responseBody.people!.includes(imageWithFourPeople!.people![1]),
          false,
          "image doesnt have person 1",
        );
        t.equal(
          responseBody.people!.includes(imageWithFourPeople!.people![0]),
          true,
          "image has person 0",
        );
        t.end();
      })
      .catch(formatError);
    });

  // purposely doing this after name update to allow for latency
  test("getPeople - check updated name", (t) => {
    api
      .get(setupData.apiUrl, "/people")
      .then((responseBody) => {
        people = responseBody;
        const personInResponse = responseBody.find(
          (person) => person.id === imageWithOnePerson!.people![0],
        );
        t.ok(personInResponse, `image one found in people ${imageWithOnePerson!.people![0]} ok`);
        t.equal(
          personInResponse.name,
          updatedPerson.name,
          `updated name for person 1 ${imageWithOnePerson!.people![0]} in people`,
        );
        t.end();
      })
      .catch(formatError);
  });
}
