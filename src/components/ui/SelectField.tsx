import type React from "react";

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectFieldProps {
  label: string;
  value: string | number;
  options: SelectOption[];
  onChange: (val: string) => void;
  description?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onChange,
  description,
}) => {
  return (
    <div>
      <label className="block font-medium text-gray-700 mb-1">
        <span>{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-indigo-500 cursor-pointer font-normal"
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {description && (
        <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
  );
};
