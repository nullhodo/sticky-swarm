import type React from "react";

interface SliderFieldProps {
  label: string;
  value: number;
  displayValue?: string | number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  description?: string;
  isLogarithmic?: boolean;
}

export const SliderField: React.FC<SliderFieldProps> = ({
  label,
  value,
  displayValue,
  min,
  max,
  step = 1,
  onChange,
  description,
  isLogarithmic = false,
}) => {
  const logMin = isLogarithmic ? Math.log(Math.max(1, min)) : 0;
  const logMax = isLogarithmic ? Math.log(Math.max(1, max)) : 0;

  const sliderVal = isLogarithmic
    ? Math.max(
        0,
        Math.min(
          1000,
          ((Math.log(Math.max(min, value)) - logMin) / (logMax - logMin)) *
            1000,
        ),
      )
    : value;

  const handleSliderChange = (raw: number) => {
    if (isLogarithmic) {
      const computed = Math.round(
        Math.exp(logMin + (raw / 1000) * (logMax - logMin)),
      );
      onChange(Math.max(min, Math.min(max, computed)));
    } else {
      onChange(raw);
    }
  };

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
        min={isLogarithmic ? 0 : min}
        max={isLogarithmic ? 1000 : max}
        step={isLogarithmic ? 1 : step}
        value={sliderVal}
        onChange={(e) =>
          handleSliderChange(Number.parseFloat(e.target.value))
        }
        className="w-full accent-indigo-600 cursor-pointer"
      />
      {description && (
        <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
  );
};
