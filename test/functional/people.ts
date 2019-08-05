import * as test from "tape";
import { IPerson, IPersonMergeBody, IPersonUpdateBody } from "../../fotos/types";
import formatError from "./formatError";

export default function peopleTests(setupData, api) {
  let people: IPerson[];

  test("getPeople", (t) => {
    api.get(setupData.apiUrl, "/people")
      .then((responseBody: IPerson[]) => {
        people = responseBody;
        t.equal(responseBody.length, 4, "each person from image with 4 people should be identified");
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
      api.put(setupData.apiUrl, `/person/${people[0].id}`, { body: updatedPerson })
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
    api.get(setupData.apiUrl, "/people")
      .then((responseBody) => {
        people = responseBody;
        const personInResponse = responseBody.find((person) => person.id === people[0].id);
        t.equal(personInResponse.name, updatedPerson.name, "updated name");
        t.end();
      })
      .catch(formatError);
  });

  test("peopleMerge", (t) => {
    const body: IPersonMergeBody = [people[0].id, people[1].id];
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
    api.get(setupData.apiUrl, "/people")
      .then((responseBody: IPerson[]) => {
        t.equal(responseBody.length, people.length - 1, "one less person");
        t.equal(responseBody[0].id, [people[0].id], "person 0 is the same");
        t.equal(responseBody[1].id, [people[2].id], "person 2 is now at pos 1");
        t.equal(responseBody[2].id, [people[3].id], "person 3 is now at pos 2");
        t.end();
      })
      .catch(formatError);
  });
}
