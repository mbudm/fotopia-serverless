import bunyan from 'bunyan';

const log = bunyan.createLogger({ name: 'fotopia' });

export default function logger(context = {}, startTime, fields = {}) {
  if (process.env.IS_OFFLINE) {
    log.info({
      ...context,
      latencyMs: Date.now() - startTime,
      ...fields,
    });
  } else {
    log.info({
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      requestId: context.awsRequestId,
      latencyMs: Date.now() - startTime,
      ...fields,
    });
  }
}
