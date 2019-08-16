const getEndpointPath = (rec) => {
  return `/foto/${rec.username}/${rec.id}`;
};

export default getEndpointPath;
