import * as test from "tape";
import {
  IImage,
  IPerson,
  IPersonUpdateBody,
  IQueryBody,
  IQueryResponse,
  IQueryDBResponseItem,
  IPeopleMergeRequestBody,
} from "../../fotos/types";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";
import { FUNC_TEST_PREFIX } from "./constants";

export default function peopleTests(setupData, api) {
  const CLIENT_ID = `${FUNC_TEST_PREFIX} - people.ts`
  let people: IPerson[];
  let imageWithFourPeople: IQueryDBResponseItem | undefined;
  let imageWithOnePerson: IQueryDBResponseItem | undefined;

  const retryStrategy = [500, 1000, 2000, 5000];

  test("get all people, should have at least 5 test image people", (t) => {
    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/people"],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IPerson[]) => {
      if (responseBody.length < 5) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - retrieved only ${responseBody.length} people after ${retryCount} retries`);
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
      clientId: CLIENT_ID,
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
      .then((responseBody: IQueryResponse) => {
        imageWithOnePerson = responseBody.items.find((rec) => rec.img_key === setupData.records[0].img_key);
        t.ok(imageWithOnePerson, "image one found");
        imageWithFourPeople = responseBody.items.find((rec) => rec.img_key === setupData.records[1].img_key);
        t.ok(imageWithFourPeople, "image with four people found");
        t.end();
      })
      .catch(formatError);
  });

  let updatedImageWithOnePerson: IImage;
  let updatedIimageWithFourPeople: IImage;
  // do a seperate retry get with both images to check they have the
  // people - img w 4 has been observed as failing due to a def race condition
  test("image w 1 person has person populated", (t) => {
    const apiPath = getEndpointPath(imageWithOnePerson);
    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, apiPath],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IImage) => {
      if (responseBody!.people!.length !== 1) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - image has ${responseBody!.people!.length} people after ${retryCount} retries`);
          t.end();
        }
      } else {
        updatedImageWithOnePerson = responseBody;
        t.equal(
          updatedImageWithOnePerson!.people!.length,
          1,
          `image has people length of ${updatedImageWithOnePerson!.people!.length}`,
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

  test("image w 4 people has people populated", (t) => {
    const apiPath = getEndpointPath(imageWithFourPeople);
    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, apiPath],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IImage) => {
      if (responseBody!.people!.length !== 4) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - image has ${responseBody!.people!.length} people after ${retryCount} retries`);
          t.end();
        }
      } else {
        updatedIimageWithFourPeople = responseBody;
        t.equal(
          updatedIimageWithFourPeople!.people!.length,
          4,
          `image w 4 has people length of ${updatedIimageWithFourPeople!.people!.length}`,
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

  const updatedPerson: IPersonUpdateBody = {
    name: "Jacinta Dias",
  };
  test("updatePerson in image 1", (t) => {
    api
      .put(setupData.apiUrl, `/person/${updatedImageWithOnePerson!.people![0]}`, {
        body: updatedPerson,
      })
      .then((responseBody) => {
        t.ok(responseBody, `update person in image one ${updatedImageWithOnePerson!.people![0]} ok`);
        t.end();
      })
      .catch(formatError);
  });

  test("getPeople - check updated name", (t) => {
    api
      .get(setupData.apiUrl, "/people")
      .then((responseBody) => {
        people = responseBody;
        const personInResponse = responseBody.find(
          (person) => person.id === updatedImageWithOnePerson!.people![0],
        );
        t.ok(personInResponse, `image one found in people ${updatedImageWithOnePerson!.people![0]} ok`);
        t.equal(
          personInResponse.name,
          updatedPerson.name,
          `updated name for person 1 ${updatedImageWithOnePerson!.people![0]} in people`,
        );
        t.end();
      })
      .catch(formatError);
  });

  test("peopleMerge - merge first two people in image with 4 people", (t) => {
    const body: IPeopleMergeRequestBody = { people: [updatedIimageWithFourPeople!.people![0], updatedIimageWithFourPeople!.people![1]]};
    api.post(setupData.apiUrl, "/people/merge", {
        body,
      })
      .then((responseBody) => {
        t.ok(responseBody, "peopleMerge person ok");
        t.end();
      })
      .catch(formatError);
  });

  test("getPeople - check peopleMerge has removed person 1", (t) => {

    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/people"],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IPerson[]) => {
      if (responseBody.length !== people.length - 1) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - ${responseBody.length} people after ${retryCount} retries`);
          t.end();
        }
      } else {
        t.equal(responseBody.length, people.length - 1, "one less person");
        t.ok(responseBody.find(
          (person) => person.id === updatedIimageWithFourPeople!.people![0],
        ), "person 0 is still in the people object");
        t.notOk(responseBody.find(
          (person) => person.id === updatedIimageWithFourPeople!.people![1],
        ), "person 1 is not in the people object");
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

  test("after merge image that had person 1 now has person 0", (t) => {
    const apiPath = getEndpointPath(updatedIimageWithFourPeople);
    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, apiPath],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IImage) => {
      if (responseBody!.people!.length !== 3) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - image has ${responseBody!.people!.length} people after ${retryCount} retries`);
          t.end();
        }
      } else {
        t.equal(
          responseBody.img_key,
          updatedIimageWithFourPeople!.img_key,
          "response has same img_key",
        );
        t.equal(responseBody.id, updatedIimageWithFourPeople!.id, "response has same id");
        t.equal(
          responseBody.people!.length,
          3,
          "image has only 3 people",
        );
        t.equal(
          responseBody.people!.includes(updatedIimageWithFourPeople!.people![1]),
          false,
          "image doesnt have person 1",
        );
        t.equal(
          responseBody.people!.includes(updatedIimageWithFourPeople!.people![0]),
          true,
          "image has person 0",
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
}
