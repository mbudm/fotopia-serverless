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

  test("getPeople", (t) => {
    api
      .get(setupData.apiUrl, "/people")
      .then((responseBody: IPerson[]) => {
        people = responseBody;
        t.equal(
          responseBody.length,
          5,
          "each person from image one and image with 4 people should be identified",
        );
        t.end();
      })
      .catch(formatError);
  });

  // These test are conditional on people length
  // this is a temp fix for occasional race condition -
  // eg: https://travis-ci.org/mbudm/fotopia-serverless/jobs/426215588
  // sometimes the faces lambda - that creates the people object in s3 is not complete
  // before the functional tests get to this point. Until I think of a more robust option,
  // cordoning off these two tests
  const updatedPerson: IPersonUpdateBody = {
    name: "Jacinta Dias",
  };

  test("updatePerson", (t) => {
    if (people.length > 0) {
      api
        .put(setupData.apiUrl, `/person/${people[0].id}`, {
          body: updatedPerson,
        })
        .then((responseBody) => {
          t.ok(responseBody, "update person ok");
          t.end();
        })
        .catch(formatError);
    } else {
      t.end();
    }
  });

  test("getPeople - check updated name", (t) => {
    api
      .get(setupData.apiUrl, "/people")
      .then((responseBody) => {
        people = responseBody;
        const personInResponse = responseBody.find(
          (person) => person.id === people[0].id,
        );
        t.equal(personInResponse.name, updatedPerson.name, "updated name");
        t.end();
      })
      .catch(formatError);
  });

  let imageWithPerson1: IImage;

  test("get (query) image with person 1 before we merge", (t) => {
    t.plan(3);

    const query: IQueryBody = {
      criteria: {
        people: [people[1].id],
        tags: [],
      },
      from: setupData.startTime,
      to: Date.now(),
    };

    api
      .post(setupData.apiUrl, "/query", {
        body: query,
      })
      .then((responseBody) => {
        t.equal(responseBody.length, 1);
        t.equal(
          responseBody[0].people.contains(people[1].id),
          true,
          "image has person 1",
        );
        imageWithPerson1 = responseBody[0];
      })
      .catch(formatError);
  });

  test("peopleMerge - merge person 1 into person 0", (t) => {
    const body: IPersonMergeBody = [people[0].id, people[1].id];
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
        t.equal(responseBody[0].id, [people[0].id], "person 0 is the same");
        t.equal(responseBody[1].id, [people[2].id], "person 2 is now at pos 1");
        t.equal(responseBody[2].id, [people[3].id], "person 3 is now at pos 2");
        t.end();
      })
      .catch(formatError);
  });

  test("after merge image that had person 1 now has person 0", (t) => {
    t.plan(2);
    const apiPath = getEndpointPath(imageWithPerson1);
    api
      .get(setupData.apiUrl, apiPath)
      .then((responseBody: IImage) => {
        t.equal(
          responseBody.img_key,
          imageWithPerson1!.img_key,
          "response has same img_key",
        );
        t.equal(responseBody.id, imageWithPerson1!.id, "response has same id");
        t.equal(
          responseBody[0].people.contains(people[1].id),
          false,
          "image doesnt have person 1",
        );
        t.equal(
          responseBody[0].people.contains(people[0].id),
          true,
          "image has person 0",
        );
      })
      .catch(formatError);
  });
}
