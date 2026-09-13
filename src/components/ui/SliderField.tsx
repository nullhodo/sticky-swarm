import type React from "react";

interface SliderFieldProps {
  label: string;
  value: number;
  displayValue?: string | number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  description?: string;
}

export const SliderField: React.FC<SliderFieldProps> = ({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  description,
}) => {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-mono text-gray-500">
          {displayValue ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full accent-indigo-600 cursor-pointer"
      />
      {description && (
        <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
  );
};
