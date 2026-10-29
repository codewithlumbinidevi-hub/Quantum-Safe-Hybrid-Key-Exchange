import React, { useState } from 'react';
import { PqcApp } from './pages/PqcApp';
import { ScannerApp } from './pages/ScannerApp';

export function App() {
  const [appMode, setAppMode] = useState<'pqc' | 'scanner'>('pqc');

  if (appMode === 'scanner') {
    return <ScannerApp onSwitchToPqc={() => setAppMode('pqc')} />;
  }

  return <PqcApp onSwitchToScanner={() => setAppMode('scanner')} />;
}

export default App;
