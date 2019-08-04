import util from 'util';

const formatError = (e) => {
  const data = e && e.response && e.response.data
    ? JSON.stringify(e.response.data, null, 2)
    : util.inspect(e);
  console.log('error', data);
};

export default formatError;
