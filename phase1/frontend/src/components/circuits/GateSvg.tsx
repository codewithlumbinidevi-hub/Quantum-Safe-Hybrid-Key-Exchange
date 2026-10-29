import React from 'react';
import { GateType } from '../../circuits/gateEngine';

interface GateSvgProps {
  type: GateType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  isActive?: boolean;
  isEvaluated?: boolean;
}

export const GateSvg: React.FC<GateSvgProps> = ({
  type,
  x,
  y,
  width = 60,
  height = 40,
  label,
  isActive = false,
  isEvaluated = false,
}) => {
  const strokeColor = isActive
    ? '#22c55e' // Active glowing green
    : isEvaluated
    ? '#38bdf8' // Evaluated sky blue
    : '#64748b'; // Idle slate

  const fillColor = isActive
    ? 'rgba(34, 197, 94, 0.15)'
    : isEvaluated
    ? 'rgba(56, 189, 248, 0.1)'
    : '#1e293b';

  const renderShape = () => {
    switch (type) {
      case 'AND':
        return (
          <path
            d={`M ${x} ${y} L ${x + width / 2} ${y} A ${height / 2} ${height / 2} 0 0 1 ${x + width / 2} ${y + height} L ${x} ${y + height} Z`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2.5"
          />
        );
      case 'OR':
        return (
          <path
            d={`M ${x} ${y} Q ${x + width / 3} ${y + height / 2} ${x} ${y + height} Q ${x + width * 0.7} ${y + height} ${x + width} ${y + height / 2} Q ${x + width * 0.7} ${y} ${x} ${y} Z`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2.5"
          />
        );
      case 'XOR':
        return (
          <g>
            <path
              d={`M ${x - 6} ${y} Q ${x + width / 3 - 6} ${y + height / 2} ${x - 6} ${y + height}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            <path
              d={`M ${x} ${y} Q ${x + width / 3} ${y + height / 2} ${x} ${y + height} Q ${x + width * 0.7} ${y + height} ${x + width} ${y + height / 2} Q ${x + width * 0.7} ${y} ${x} ${y} Z`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.5"
            />
          </g>
        );
      case 'NOT':
        return (
          <g>
            <polygon
              points={`${x},${y} ${x + width - 10},${y + height / 2} ${x},${y + height}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            <circle
              cx={x + width - 5}
              cy={y + height / 2}
              r="4"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
            />
          </g>
        );
      case 'NAND':
        return (
          <g>
            <path
              d={`M ${x} ${y} L ${x + width / 2} ${y} A ${height / 2} ${height / 2} 0 0 1 ${x + width / 2} ${y + height} L ${x} ${y + height} Z`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            <circle
              cx={x + width + 4}
              cy={y + height / 2}
              r="4"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
            />
          </g>
        );
      case 'NOR':
        return (
          <g>
            <path
              d={`M ${x} ${y} Q ${x + width / 3} ${y + height / 2} ${x} ${y + height} Q ${x + width * 0.7} ${y + height} ${x + width} ${y + height / 2} Q ${x + width * 0.7} ${y} ${x} ${y} Z`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            <circle
              cx={x + width + 4}
              cy={y + height / 2}
              r="4"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
            />
          </g>
        );
      default:
        return (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx="4"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2.5"
          />
        );
    }
  };

  return (
    <g className="transition-all duration-200">
      {renderShape()}
      {label && (
        <text
          x={x + width / 2}
          y={y - 8}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="11"
          fontWeight="600"
          className="select-none"
        >
          {label}
        </text>
      )}
      <text
        x={x + width / 2}
        y={y + height / 2 + 4}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="10"
        fontWeight="bold"
        className="select-none"
      >
        {type}
      </text>
    </g>
  );
};
