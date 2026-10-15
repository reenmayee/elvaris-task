import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface MetricTooltipProps {
  title: string;
  explanation: string;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({ title, explanation }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <HelpCircle 
        size={13} 
        style={{ color: '#64748B', cursor: 'help', verticalAlign: 'middle', transition: 'color 0.15s' }}
      />
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            bottom: '120%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0F172A',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: '8px 12px',
            width: 240,
            fontSize: 12,
            lineHeight: 1.4,
            color: '#E2E8F0',
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 600, color: '#38BDF8', marginBottom: 4 }}>{title}</div>
          <div>{explanation}</div>
        </div>
      )}
    </div>
  );
};
