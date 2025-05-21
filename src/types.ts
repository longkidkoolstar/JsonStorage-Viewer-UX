export interface JsonVersion {
  timestamp: string;
  data: any;
}

export interface JsonState {
  url: string;
  currentData: any;
  versionsByURL: {
    [url: string]: JsonVersion[];
  };
  apiKey: string;
}