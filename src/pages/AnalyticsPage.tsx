import React from 'react';
import { BarChart3 } from 'lucide-react';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
      <BarChart3 className="mx-auto text-gray-300 mb-6" size={48} />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
      <p className="text-gray-600 text-sm max-w-md mx-auto">
        Detailed nutrition analytics and trends will be available here. Track your progress over time with comprehensive charts and insights.
      </p>
    </div>
  );
};

export default AnalyticsPage; 