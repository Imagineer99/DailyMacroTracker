import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DataCleanupProps {
  corruptedEntries: number;
  onCleanup: () => void;
}

const DataCleanup: React.FC<DataCleanupProps> = ({ corruptedEntries, onCleanup }) => {
  if (corruptedEntries === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-800 mb-1">
            Data Cleanup Required
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            We found {corruptedEntries} corrupted food {corruptedEntries === 1 ? 'entry' : 'entries'} 
            with invalid nutritional data. These entries show as "NaN" values and should be removed.
          </p>
          <button
            onClick={onCleanup}
            className="inline-flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            Clean Up Corrupted Entries
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataCleanup; 