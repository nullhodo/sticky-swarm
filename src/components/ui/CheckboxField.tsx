import type React from "react";

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  className?: string;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  checked,
  onChange,
  description,
  className = "",
}) => {
  return (
    <div className={className}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
        />
        <span className="text-gray-700">{label}</span>
      </label>
      {description && (
        <p className="text-[11px] text-gray-400 ml-5 mt-0.5">
          {description}
        </p>
      )}
    </div>
  );
};
