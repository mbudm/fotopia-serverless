
export interface IPathParameters {
  id: string;
}

export interface ITraceMeta {
  parentId: string;
  traceId: string;
}

export interface ILoggerBaseParams {
  id: string; // A unique ID for each span
  name: string; // The specific call location (like a function or method name)
  parentId: string;	// The ID of this span’s parent span, the call location the current span was called from
  startTime: number;
  traceId: string; // The ID of the trace this span belongs to
}

export interface IIndex {
  [name: string]: number;
}

export interface IIndexRequestBody {
  index: IIndex;
  traceMeta: ITraceMeta;
}
