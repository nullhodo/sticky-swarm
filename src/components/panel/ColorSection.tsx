import { PaletteIcon, SparklesIcon } from "lucide-react";
import type React from "react";
import { PREDEFINED_PALETTES } from "../../constants/palettes";
import type { SwarmParameters } from "../../types/swarm";
import { AccordionSection } from "../ui/AccordionSection";
import { CheckboxField } from "../ui/CheckboxField";
import { SelectField } from "../ui/SelectField";

interface ColorSectionProps {
  params: SwarmParameters;
  isOpen: boolean;
  onToggle: () => void;
  onParamChange: (
    key: keyof SwarmParameters,
    val: SwarmParameters[keyof SwarmParameters],
  ) => void;
  onRandomizePalette: () => void;
}

export const ColorSection: React.FC<ColorSectionProps> = ({
  params,
  isOpen,
  onToggle,
  onParamChange,
  onRandomizePalette,
}) => {
  const paletteOptions = PREDEFINED_PALETTES.map((pal, idx) => ({
    label: pal.title,
    value: idx,
  }));

  return (
    <AccordionSection
      id="color"
      title="カラー設定"
      icon={<PaletteIcon className="w-4 h-4 text-amber-600" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div>
        <SelectField
          label="カラーパレット"
          value={params.paletteIndex}
          options={paletteOptions}
          onChange={(val) =>
            onParamChange("paletteIndex", Number.parseInt(val, 10))
          }
        />

        {/* Palette preview swatches */}
        <div className="flex h-4 rounded overflow-hidden mt-1.5 border border-gray-300">
          {PREDEFINED_PALETTES[params.paletteIndex].colors.map((c) => (
            <div
              key={c}
              className="flex-1"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700">背景色</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={params.backgroundColor}
            onChange={(e) =>
              onParamChange("backgroundColor", e.target.value)
            }
            className="w-7 h-7 rounded border border-gray-300 p-0.5 cursor-pointer"
          />
          <span className="font-mono text-gray-600 text-xs">
            {params.backgroundColor}
          </span>
        </div>
      </div>

      <div className="space-y-2 pt-1 border-t border-gray-100">
        <CheckboxField
          label="全エージェントを同じ色で統一"
          checked={params.uniformColor}
          onChange={(checked) => onParamChange("uniformColor", checked)}
        />

        <CheckboxField
          label="腕の色をボディより少し暗くする"
          checked={params.darkerArmColor}
          onChange={(checked) => onParamChange("darkerArmColor", checked)}
        />
      </div>

      <button
        type="button"
        onClick={onRandomizePalette}
        className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 py-1.5 px-3 rounded font-medium transition flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-xs"
      >
        <SparklesIcon className="w-3.5 h-3.5 text-amber-700" />
        <span>パレットをランダム切り替え</span>
      </button>
    </AccordionSection>
  );
};
