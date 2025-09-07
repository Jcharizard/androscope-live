import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface RunningApp {
  name: string;
  package_name: string;
  pid: string;
  cpu: string;
  memory: string;
}

interface ProcessManagerContextType {
  runningProcesses: RunningApp[];
  selectedProcess: string;
  setSelectedProcess: (process: string) => void;
  refreshProcesses: () => Promise<void>;
  isLoading: boolean;
}

const ProcessManagerContext = createContext<ProcessManagerContextType | undefined>(undefined);

export const useProcessManager = () => {
  const context = useContext(ProcessManagerContext);
  if (!context) {
    throw new Error('useProcessManager must be used within a ProcessManagerProvider');
  }
  return context;
};

interface ProcessManagerProviderProps {
  children: ReactNode;
}

export const ProcessManagerProvider: React.FC<ProcessManagerProviderProps> = ({ children }) => {
  const [runningProcesses, setRunningProcesses] = useState<RunningApp[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const refreshProcesses = async () => {
    setIsLoading(true);
    try {
      const processes = await invoke<RunningApp[]>('get_running_apps');
      setRunningProcesses(processes);
      
      // Auto-select DIVA if available and no process is selected
      if (!selectedProcess && processes.length > 0) {
        const divaProcess = processes.find(p => p.package_name === 'jakhar.aseem.diva');
        if (divaProcess) {
          setSelectedProcess(divaProcess.package_name);
        }
      }
    } catch (error) {
      console.error('Failed to get running processes:', error);
      setRunningProcesses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    refreshProcesses();
    const interval = setInterval(refreshProcesses, 5000);
    return () => clearInterval(interval);
  }, []);

  const value: ProcessManagerContextType = {
    runningProcesses,
    selectedProcess,
    setSelectedProcess,
    refreshProcesses,
    isLoading
  };

  return (
    <ProcessManagerContext.Provider value={value}>
      {children}
    </ProcessManagerContext.Provider>
  );
};
