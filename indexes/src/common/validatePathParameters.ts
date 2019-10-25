import { IPathParameters } from "../types";

const validatePathParameters = (params: any): IPathParameters => {
  if (params && params.id) {
    return params as IPathParameters;
  } else {
    throw new Error("Invalid path parameters");
  }
};
export default validatePathParameters;
