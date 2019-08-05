import * as util from "util";

const formatError = (e: any) => {
  const data = e && e.response && e.response.data
    ? JSON.stringify(e.response.data, null, 2)
    : util.inspect(e);
  // tslint:disable-next-line:no-console
  console.error("error", data);
};

export default formatError;
