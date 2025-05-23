import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Editor from "@monaco-editor/react";
import ReactDiffViewer from 'react-diff-viewer-continued';
import {
  History,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  GitCompare,
  Bookmark,
  X,
  Folder,
  Edit,
  Trash,
} from 'lucide-react';
import axios from 'axios';
import { JsonState, JsonVersion } from './types';

// Interface for saved storage items
interface SavedStorage {
  id: string;
  name: string;
  url: string;
  lastAccessed: string;
}

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
  const [savedStorages, setSavedStorages] = useState<SavedStorage[]>([]);
  const [showSavedStorages, setShowSavedStorages] = useState(false);
  const [storageName, setStorageName] = useState('');
  const [editingStorage, setEditingStorage] = useState<SavedStorage | null>(null);
  const [activeStorageId, setActiveStorageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      const { apiKey, url } = JSON.parse(savedSettings);
      setState(prev => ({ ...prev, apiKey, url }));
    }

    // Load saved storages
    const savedStoragesData = localStorage.getItem('savedStorages');
    if (savedStoragesData) {
      setSavedStorages(JSON.parse(savedStoragesData));
    }

    // Load version history
    const savedVersionsData = localStorage.getItem('versionsByURL');
    if (savedVersionsData) {
      setState(prev => ({
        ...prev,
        versionsByURL: JSON.parse(savedVersionsData)
      }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('versionsByURL', JSON.stringify(state.versionsByURL));
  }, [state.versionsByURL]);

  useEffect(() => {
    localStorage.setItem('savedStorages', JSON.stringify(savedStorages));
  }, [savedStorages]);

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

  // Helper function to check if two JSON objects are equal
  const areJsonEqual = (json1: any, json2: any): boolean => {
    return JSON.stringify(json1) === JSON.stringify(json2);
  };

  const fetchJson = async () => {
    if (!state.url) {
      toast.error('Please enter a URL first');
      return;
    }

    setIsLoading(true);
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

      // Get current versions for the URL
      const currentVersions = state.versionsByURL[state.url] || [];

      // Check if the received data is the same as the most recent version
      const isDataUnchanged = currentVersions.length > 0 &&
                             areJsonEqual(response.data, currentVersions[0].data);

      if (isDataUnchanged) {
        setState(prev => ({
          ...prev,
          currentData: response.data,
          apiKey: apiKeyFromUrl || state.apiKey,
        }));
        toast.success('JSON loaded successfully (no changes detected)');
      } else {
        const newVersion: JsonVersion = {
          timestamp: new Date().toISOString(),
          data: response.data,
        };

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
      }

      // Find the storage that matches the current URL to set as active
      const matchingStorage = savedStorages.find(storage => storage.url === state.url);
      if (matchingStorage) {
        setActiveStorageId(matchingStorage.id);
      } else {
        // If no matching storage, clear the active storage ID
        setActiveStorageId(null);
      }

      saveSettingsToFile();
      return true; // Return success
    } catch (error) {
      toast.error('Failed to fetch JSON');
      // If fetch fails, don't update the active storage
      return false; // Return failure
    } finally {
      setIsLoading(false);
    }
  };

  const updateJson = async () => {
    if (isLoading) {
      toast.error('Please wait for the current operation to complete');
      return;
    }

    setIsLoading(true);
    try {
      // Extract the API key from the URL
      const urlParams = new URLSearchParams(new URL(state.url).search);
      const apiKeyFromUrl = urlParams.get('apiKey');
      const apiUrl = state.url.split('?')[0]; // Remove query parameters for the fetch request

      // Verify that we're updating the correct storage
      const matchingStorage = savedStorages.find(storage => storage.url === state.url);
      if (matchingStorage && matchingStorage.id !== activeStorageId) {
        // If the URL matches a saved storage but it's not the active one, show a warning
        if (!window.confirm('The displayed data may not match the selected storage. Continue with update?')) {
          setIsLoading(false);
          return;
        }
      }

      await axios.put(apiUrl, state.currentData, {
        params: {
          apiKey: apiKeyFromUrl || state.apiKey,
        },
      });

      // Get current versions for the URL
      const currentVersions = state.versionsByURL[state.url] || [];

      // Check if the current data is the same as the most recent version
      const isDataUnchanged = currentVersions.length > 0 &&
                             areJsonEqual(state.currentData, currentVersions[0].data);

      if (isDataUnchanged) {
        toast.success('JSON updated successfully (no changes to version history)');
      } else {
        const newVersion: JsonVersion = {
          timestamp: new Date().toISOString(),
          data: state.currentData,
        };

        setState(prev => ({
          ...prev,
          versionsByURL: {
            ...prev.versionsByURL,
            [state.url]: [newVersion, ...currentVersions],
          },
          apiKey: apiKeyFromUrl || state.apiKey,
        }));
        toast.success('JSON updated successfully');
      }

      // Update the active storage ID to match the current URL
      if (matchingStorage) {
        setActiveStorageId(matchingStorage.id);
      }
    } catch (error) {
      toast.error('Failed to update JSON');
    } finally {
      setIsLoading(false);
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

  const saveCurrentStorage = () => {
    // Don't allow saving while loading
    if (isLoading) {
      toast.error("Please wait for the current operation to complete");
      return;
    }

    if (!state.url) {
      toast.error("Please enter a URL first");
      return;
    }

    if (!storageName) {
      toast.error("Please enter a name for this storage");
      return;
    }

    if (editingStorage) {
      // Update existing storage
      setSavedStorages(prev =>
        prev.map(storage =>
          storage.id === editingStorage.id
            ? { ...storage, name: storageName, lastAccessed: new Date().toISOString() }
            : storage
        )
      );
      setEditingStorage(null);

      // If we're updating the active storage, keep it active
      if (activeStorageId === editingStorage.id) {
        // No need to change activeStorageId as it's already set correctly
      }

      toast.success('Storage updated successfully');
    } else {
      // Create new storage entry
      const newStorage: SavedStorage = {
        id: Date.now().toString(),
        name: storageName,
        url: state.url,
        lastAccessed: new Date().toISOString(),
      };

      setSavedStorages(prev => [...prev, newStorage]);

      // If this is the first storage or matches the current URL, set it as active
      if (savedStorages.length === 0 || state.currentData) {
        setActiveStorageId(newStorage.id);
      }

      toast.success('Storage saved successfully');
    }

    setStorageName('');
  };

  const loadStorage = async (storage: SavedStorage) => {
    // Don't allow loading a new storage while one is already loading
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      // First set the active storage ID to indicate which storage we're loading
      setActiveStorageId(storage.id);

      // Extract the API key from the URL
      const urlParams = new URLSearchParams(new URL(storage.url).search);
      const apiKeyFromUrl = urlParams.get('apiKey');
      const apiUrl = storage.url.split('?')[0]; // Remove query parameters for the fetch request

      // Directly fetch the data from the storage URL
      const response = await axios.get(apiUrl, {
        params: {
          apiKey: apiKeyFromUrl || state.apiKey,
        },
      });

      // Update the URL and data in state
      setState(prev => {
        // Get current versions for the URL
        const currentVersions = prev.versionsByURL[storage.url] || [];

        // Check if the received data is the same as the most recent version
        const isDataUnchanged = currentVersions.length > 0 &&
                               areJsonEqual(response.data, currentVersions[0].data);

        if (isDataUnchanged) {
          toast.success('JSON loaded successfully (no changes detected)');
          return {
            ...prev,
            url: storage.url,
            currentData: response.data,
            apiKey: apiKeyFromUrl || prev.apiKey,
          };
        } else {
          const newVersion: JsonVersion = {
            timestamp: new Date().toISOString(),
            data: response.data,
          };

          toast.success('JSON loaded successfully');
          return {
            ...prev,
            url: storage.url,
            currentData: response.data,
            versionsByURL: {
              ...prev.versionsByURL,
              [storage.url]: [newVersion, ...currentVersions],
            },
            apiKey: apiKeyFromUrl || prev.apiKey,
          };
        }
      });

      // Update lastAccessed timestamp
      setSavedStorages(prev =>
        prev.map(item =>
          item.id === storage.id
            ? { ...item, lastAccessed: new Date().toISOString() }
            : item
        )
      );

      // Hide the storage selection panel
      setShowSavedStorages(false);

      // Save settings to file
      saveSettingsToFile();
    } catch (error) {
      // If fetch fails, reset the active storage ID
      setActiveStorageId(null);
      toast.error('Failed to load storage data');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStorage = (id: string) => {
    // Don't allow deletion while loading
    if (isLoading) {
      return;
    }

    // If trying to delete the active storage, show a warning
    if (id === activeStorageId) {
      if (!window.confirm('This storage is currently active. Deleting it may cause issues. Continue?')) {
        return;
      }
      // Reset the active storage ID if deleting the active storage
      setActiveStorageId(null);
    }

    setSavedStorages(prev => prev.filter(storage => storage.id !== id));
    toast.success('Storage deleted');
  };

  const editStorage = (storage: SavedStorage) => {
    // Don't allow editing while loading
    if (isLoading) {
      return;
    }

    setStorageName(storage.name);
    setEditingStorage(storage);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">JSON Storage Viewer</h1>

          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JSON URL
              </label>
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col">
                  <input
                    type="text"
                    value={state.url}
                    onChange={(e) => {
                      setState(prev => ({ ...prev, url: e.target.value }));

                      // Check if the URL matches any saved storage
                      const matchingStorage = savedStorages.find(storage => storage.url === e.target.value);
                      if (matchingStorage && matchingStorage.id !== activeStorageId) {
                        // URL matches a different storage than the active one
                        toast(`This URL matches the storage "${matchingStorage.name}". Click Fetch to load it.`);
                      } else if (!matchingStorage && activeStorageId) {
                        // URL doesn't match any storage but there's an active one
                        toast('URL changed. This may not match the active storage.', {
                          icon: '⚠️'
                        });
                      }
                    }}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Enter JSON URL..."
                  />
                  {activeStorageId && savedStorages.find(s => s.id === activeStorageId)?.url !== state.url && (
                    <div className="text-xs text-amber-600 mt-1">
                      Warning: URL doesn't match the active storage
                    </div>
                  )}
                </div>
                <button
                  onClick={fetchJson}
                  disabled={isLoading}
                  className={`px-4 py-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md flex items-center gap-2`}
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  {isLoading ? 'Loading...' : 'Fetch'}
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

            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saved Storages
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSavedStorages(!showSavedStorages)}
                  disabled={isLoading}
                  className={`px-4 py-2 text-white rounded-md flex items-center gap-2 ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  <Folder size={16} />
                  {showSavedStorages ? 'Hide Storages' : 'Show Storages'}
                </button>
              </div>
            </div>
          </div>

          {showSavedStorages && (
            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Saved Storages</h2>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={storageName}
                    onChange={(e) => setStorageName(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder={editingStorage ? "Edit storage name..." : "Name this storage..."}
                  />
                  <button
                    onClick={saveCurrentStorage}
                    disabled={isLoading}
                    className={`px-3 py-1 text-white rounded-md flex items-center gap-1 ${
                      isLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <Bookmark size={14} />
                    {editingStorage ? 'Update' : 'Save'}
                  </button>
                  {editingStorage && (
                    <button
                      onClick={() => {
                        setEditingStorage(null);
                        setStorageName('');
                      }}
                      disabled={isLoading}
                      className={`px-3 py-1 text-white rounded-md flex items-center gap-1 ${
                        isLoading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gray-500 hover:bg-gray-600'
                      }`}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {savedStorages.length === 0 ? (
                <p className="text-gray-500 italic">No saved storages yet. Save one to get started!</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedStorages
                    .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
                    .map((storage) => (
                    <div
                      key={storage.id}
                      className={`flex items-center justify-between p-3 rounded-md border hover:bg-gray-100 transition-colors ${
                        activeStorageId === storage.id
                          ? 'bg-indigo-50 border-indigo-500'
                          : 'bg-white'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{storage.name}</h3>
                          {activeStorageId === storage.id && (
                            <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{storage.url}</p>
                        <p className="text-xs text-gray-400">
                          Last accessed: {new Date(storage.lastAccessed).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => loadStorage(storage)}
                          disabled={isLoading || (activeStorageId === storage.id && state.url === storage.url)}
                          className={`p-1 rounded-md ${
                            isLoading
                              ? 'text-gray-400 cursor-not-allowed'
                              : activeStorageId === storage.id && state.url === storage.url
                                ? 'text-green-600 cursor-default'
                                : 'text-indigo-600 hover:text-indigo-800'
                          }`}
                          title={activeStorageId === storage.id && state.url === storage.url
                            ? "Currently loaded"
                            : "Load this storage"}
                        >
                          {activeStorageId === storage.id && state.url === storage.url
                            ? <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            : <RefreshCw size={16} className={isLoading && activeStorageId === storage.id ? 'animate-spin' : ''} />
                          }
                        </button>
                        <button
                          onClick={() => editStorage(storage)}
                          disabled={isLoading}
                          className={`p-1 rounded-md ${
                            isLoading
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-amber-600 hover:text-amber-800'
                          }`}
                          title="Edit storage name"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteStorage(storage.id)}
                          disabled={isLoading}
                          className={`p-1 rounded-md ${
                            isLoading
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800'
                          }`}
                          title="Delete this storage"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {state.currentData && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">JSON Editor</h2>
                  {activeStorageId && (
                    <div className="text-sm text-gray-600 mt-1">
                      Currently editing: <span className="font-medium text-indigo-600">
                        {savedStorages.find(s => s.id === activeStorageId)?.name || 'Unknown storage'}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={updateJson}
                  disabled={isLoading}
                  className={`px-4 py-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md flex items-center gap-2`}
                >
                  <Save size={16} className={isLoading ? 'animate-spin' : ''} />
                  {isLoading ? 'Saving...' : 'Save Changes'}
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