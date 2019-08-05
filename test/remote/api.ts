import { API } from "aws-amplify";

const endpointName = "fotos";
export const post = (hostname: string, route: string, params: any) => API.post(endpointName, route, params);
export const get = (hostname: string, route: string) => API.get(endpointName, route, {});
export const del = (hostname: string, route: string) => API.del(endpointName, route, {});
export const put = (hostname: string, route: string, params: any) => API.put(endpointName, route, params);
