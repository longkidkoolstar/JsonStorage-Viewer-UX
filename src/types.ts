export interface JsonVersion {
  timestamp: string;
  data: any;
}

export interface JsonState {
  url: string;
  currentData: any;
  versions: JsonVersion[];
  apiKey: string;
}