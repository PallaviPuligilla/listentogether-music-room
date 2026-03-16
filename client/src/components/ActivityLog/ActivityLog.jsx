// components/ActivityLog/ActivityLog.jsx — Live event feed

import React from 'react';

export default function ActivityLog({ activities }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>
        Activity
      </div>
      <div className="rounded-2xl border overflow-hidden bg-white"
        style={{ borderColor: 'rgba(108,92,231,0.13)', maxHeight: '112px', overflowY: 'auto' }}>
        {activities.length === 0 ? (
          <div className="px-4 py-3 text-xs" style={{ color: '#9ca3af' }}>
            No activity yet...
          </div>
        ) : (
          activities.slice(0, 8).map((a) => (
            <div key={a.id}
              className="flex items-center gap-2 px-4 py-2 border-b text-xs last:border-b-0"
              style={{ borderColor: 'rgba(108,92,231,0.08)', color: '#6b7280' }}>
              <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>{a.icon}</span>
              <span className="flex-1 leading-snug">{a.text}</span>
              <span className="flex-shrink-0 ml-2" style={{ color: '#9ca3af', fontSize: '10px' }}>
                {a.ts}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}