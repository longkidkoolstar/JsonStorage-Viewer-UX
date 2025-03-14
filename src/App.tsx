import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Editor from "@monaco-editor/react";
import ReactDiffViewer from 'react-diff-viewer-continued';
import {
  History,
  Save,
  RefreshCw,
  Link,
  Key,
  Eye,
  EyeOff,
  Clock,
  Edit3,
  GitCompare,
} from 'lucide-react';
import axios from 'axios';
import { JsonState, JsonVersion } from './types';

function App() {
  const [state, setState] = useState<JsonState>({
    url: '',
    currentData: null,
    versionsByURL: {},
    apiKey: '',
  });
  const [showDiff, setShowDiff] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<[number | null, number | null]>([null, null]);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      const { apiKey, url } = JSON.parse(savedSettings);
      setState(prev => ({ ...prev, apiKey, url }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('versionsByURL', JSON.stringify(state.versionsByURL));
  }, [state.versionsByURL]);

  const saveSettingsToFile = () => {
    const settings = {
      apiKey: state.apiKey,
      url: state.url,
    };

    try {
      localStorage.setItem('settings', JSON.stringify(settings));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const fetchJson = async () => {
    try {
      // Extract the API key from the URL
      const urlParams = new URLSearchParams(new URL(state.url).search);
      const apiKeyFromUrl = urlParams.get('apiKey');
      const apiUrl = state.url.split('?')[0]; // Remove query parameters for the fetch request

      const response = await axios.get(apiUrl, {
        params: {
          apiKey: apiKeyFromUrl || state.apiKey,
        },
      });

      const newVersion: JsonVersion = {
        timestamp: new Date().toISOString(),
        data: response.data,
      };

      // Check if the URL already exists in versionsByURL
      const currentVersions = state.versionsByURL[state.url] || [];
      
      setState(prev => ({
        ...prev,
        currentData: response.data,
        versionsByURL: {
          ...prev.versionsByURL,
          [state.url]: [newVersion, ...currentVersions],
        },
        apiKey: apiKeyFromUrl || state.apiKey,
      }));

      toast.success('JSON loaded successfully');
      saveSettingsToFile();
    } catch (error) {
      toast.error('Failed to fetch JSON');
    }
  };

  const updateJson = async () => {
    try {
      // Extract the API key from the URL
      const urlParams = new URLSearchParams(new URL(state.url).search);
      const apiKeyFromUrl = urlParams.get('apiKey');
      const apiUrl = state.url.split('?')[0]; // Remove query parameters for the fetch request

      await axios.put(apiUrl, state.currentData, {
        params: {
          apiKey: apiKeyFromUrl || state.apiKey,
        },
      });

      const newVersion: JsonVersion = {
        timestamp: new Date().toISOString(),
        data: state.currentData,
      };

      // Get current versions for the URL
      const currentVersions = state.versionsByURL[state.url] || [];
      
      setState(prev => ({
        ...prev,
        versionsByURL: {
          ...prev.versionsByURL,
          [state.url]: [newVersion, ...currentVersions],
        },
        apiKey: apiKeyFromUrl || state.apiKey,
      }));

      toast.success('JSON updated successfully');
    } catch (error) {
      toast.error('Failed to update JSON');
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    try {
      if (value) {
        const parsedJson = JSON.parse(value);
        setState(prev => ({
          ...prev,
          currentData: parsedJson,
        }));
      }
    } catch (error) {
      // Don't update if JSON is invalid
    }
  };

  const handleVersionSelect = (index: number) => {
    setSelectedVersions(prev => {
      if (prev[0] === null) return [index, null];
      if (prev[1] === null) return [prev[0], index];
      return [index, null];
    });
    setShowDiff(true);
  };

  const clearVersionSelection = () => {
    setSelectedVersions([null, null]);
    setShowDiff(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">JSON Storage Viewer</h1>
          
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JSON URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={state.url}
                  onChange={(e) => setState(prev => ({ ...prev, url: e.target.value }))}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter JSON URL..."
                />
                <button
                  onClick={fetchJson}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Fetch
                </button>
              </div>
            </div>
            
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={state.apiKey}
                  onChange={(e) => {
                    setState(prev => ({ ...prev, apiKey: e.target.value }));
                    saveSettingsToFile();
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {state.currentData && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">JSON Editor</h2>
                <button
                  onClick={updateJson}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Editor
                  height="400px"
                  defaultLanguage="json"
                  value={JSON.stringify(state.currentData, null, 2)}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    formatOnPaste: true,
                    formatOnType: true,
                  }}
                />
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <History size={20} />
                    Version History
                  </h2>
                  <div className="flex gap-2">
                    {showDiff && (
                      <button
                        onClick={clearVersionSelection}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                      >
                        Clear Selection
                      </button>
                    )}
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
                    >
                      <GitCompare size={16} />
                      {showDiff ? 'Hide Diff' : 'Compare Versions'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {(state.versionsByURL[state.url] || []).map((version, index) => (
                    <div
                      key={version.timestamp}
                      className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                        selectedVersions.includes(index) ? 'border-indigo-500 bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock size={16} />
                          {new Date(version.timestamp).toLocaleString()}
                        </div>
                        <button
                          onClick={() => handleVersionSelect(index)}
                          className={`${
                            selectedVersions.includes(index)
                              ? 'bg-indigo-600 text-white'
                              : 'text-indigo-600 hover:text-indigo-800'
                          } px-3 py-1 rounded-md transition-colors`}
                        >
                          {selectedVersions.includes(index) ? 'Selected' : 'Select'}
                        </button>
                      </div>

                      {showDiff && 
                       selectedVersions[0] !== null && 
                       selectedVersions[1] !== null && 
                       selectedVersions.includes(index) && 
                       index === Math.min(...selectedVersions.filter((v): v is number => v !== null)) && (
                        <div className="mt-4">
                          <ReactDiffViewer
                            oldValue={JSON.stringify(state.versionsByURL[state.url][Math.max(...selectedVersions.filter((v): v is number => v !== null))].data, null, 2)}
                            newValue={JSON.stringify(version.data, null, 2)}
                            splitView={true}
                            hideLineNumbers={true}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;