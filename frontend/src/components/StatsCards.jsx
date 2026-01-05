import React from "react";
import { Card, Statistic } from "antd";

const StatsCards = ({ stats, themeColor }) => {
  if (!stats || stats.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((s, idx) => (
        <Card
          key={idx}
          size="small"
          title={<span className="text-gray-600 font-medium">{s.metric}</span>}
          className="shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl border border-gray-100"
          bordered={false}
        >
          <Statistic
            title={<span className="text-xs text-gray-400">平均值</span>}
            value={s.avg}
            precision={2}
            valueStyle={{ fontWeight: 600, color: themeColor }}
          />
          <div className="flex justify-between mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
            <span className="font-mono">Min: {s.min}</span>
            <span className="font-mono">Max: {s.max}</span>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
