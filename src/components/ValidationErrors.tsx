import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ValidationErrorsProps {
  errors: string[];
  className?: string;
}

const ValidationErrors: React.FC<ValidationErrorsProps> = ({ errors, className = '' }) => {
  if (errors.length === 0) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
        <div className="text-sm text-red-600">
          <p className="font-medium mb-1">Please fix the following errors:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ValidationErrors; 