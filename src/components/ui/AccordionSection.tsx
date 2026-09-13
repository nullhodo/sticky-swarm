import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import type React from "react";

interface AccordionSectionProps {
  id?: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between font-bold text-gray-800 border-b border-gray-200 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? (
          <ChevronDownIcon className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {isOpen && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
};
