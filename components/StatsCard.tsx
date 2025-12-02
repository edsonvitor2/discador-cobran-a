import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color: 'blue' | 'green' | 'red' | 'orange';
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
};

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, trend, color }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start justify-between transition-all hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {trend && (
          <p className="text-xs font-medium text-green-600 mt-2 flex items-center">
            {trend}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${colorMap[color]}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export default StatsCard;