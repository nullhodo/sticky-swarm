import { MousePointerIcon } from "lucide-react";
import type React from "react";
import type { SwarmParameters } from "../../types/swarm";
import { AccordionSection } from "../ui/AccordionSection";
import { CheckboxField } from "../ui/CheckboxField";
import { SliderField } from "../ui/SliderField";

interface InteractionSectionProps {
  params: SwarmParameters;
  isOpen: boolean;
  onToggle: () => void;
  onParamChange: (
    key: keyof SwarmParameters,
    val: SwarmParameters[keyof SwarmParameters],
  ) => void;
}

export const InteractionSection: React.FC<InteractionSectionProps> = ({
  params,
  isOpen,
  onToggle,
  onParamChange,
}) => {
  return (
    <AccordionSection
      id="interaction"
      title="マウス操作"
      icon={<MousePointerIcon className="w-4 h-4 text-purple-600" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <CheckboxField
        label="マウスインタラクションを有効化"
        checked={params.interactionEnable}
        onChange={(checked) => onParamChange("interactionEnable", checked)}
      />

      {params.interactionEnable && (
        <>
          <div>
            <span className="font-medium text-gray-700 block mb-1">
              反応モード
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onParamChange("interactionMode", "attract")}
                className={`py-1.5 px-2 rounded border text-xs font-medium cursor-pointer transition ${
                  params.interactionMode === "attract"
                    ? "bg-purple-50 border-purple-500 text-purple-700 font-bold"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                引き寄せる (Attract)
              </button>
              <button
                type="button"
                onClick={() => onParamChange("interactionMode", "repel")}
                className={`py-1.5 px-2 rounded border text-xs font-medium cursor-pointer transition ${
                  params.interactionMode === "repel"
                    ? "bg-purple-50 border-purple-500 text-purple-700 font-bold"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                反発する (Repel)
              </button>
            </div>
          </div>

          <SliderField
            label="力の強さ"
            value={params.interactionForce}
            displayValue={params.interactionForce.toFixed(1)}
            min={0.1}
            max={15.0}
            step={0.1}
            onChange={(val) => onParamChange("interactionForce", val)}
          />
        </>
      )}
    </AccordionSection>
  );
};
