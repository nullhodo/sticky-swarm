import { CheckIcon, PaletteIcon, SparklesIcon } from "lucide-react";
import type React from "react";
import { PREDEFINED_PALETTES } from "../../constants/palettes";
import type { SwarmParameters } from "../../types/swarm";
import { AccordionSection } from "../ui/AccordionSection";
import { CheckboxField } from "../ui/CheckboxField";
import { SelectField } from "../ui/SelectField";
import { SliderField } from "../ui/SliderField";

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

  const currentPalette =
    PREDEFINED_PALETTES[params.paletteIndex] || PREDEFINED_PALETTES[0];

  const activeUniformColor =
    params.uniformColorHex || currentPalette.colors[0];

  const handleSwatchClick = (colorHex: string) => {
    if (!params.uniformColor) {
      onParamChange("uniformColor", true);
    }
    onParamChange("uniformColorHex", colorHex);
  };

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
          onChange={(val) => {
            const nextIdx = Number.parseInt(val, 10);
            onParamChange("paletteIndex", nextIdx);
            const nextPal = PREDEFINED_PALETTES[nextIdx];
            if (nextPal && nextPal.colors.length > 0) {
              onParamChange("availableObjectColors", nextPal.colors);
              onParamChange("uniformColorHex", nextPal.colors[0]);
            }
          }}
        />

        {/* Palette preview swatches with click-to-select */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
            <span>パレットカラー</span>
            <span className="text-[10px] text-gray-400">
              {params.uniformColor
                ? "クリックでエージェント色を選択"
                : "クリックで統一色に設定"}
            </span>
          </div>
          <div className="flex h-7 rounded overflow-hidden border border-gray-300 gap-0.5 bg-gray-100 p-0.5 shadow-inner">
            {currentPalette.colors.map((c) => {
              const isSelectedAgent =
                params.uniformColor &&
                activeUniformColor.toLowerCase() === c.toLowerCase();

              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSwatchClick(c)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onParamChange("backgroundColor", c);
                  }}
                  className={`flex-1 h-full rounded-xs transition-all relative flex items-center justify-center cursor-pointer ${
                    isSelectedAgent
                      ? "ring-2 ring-indigo-600 ring-offset-1 z-10 scale-105"
                      : "hover:opacity-90 hover:scale-[1.02]"
                  }`}
                  style={{ backgroundColor: c }}
                  title={`${c}\n左クリック: エージェント色に設定\n右クリック: 背景色に設定`}
                >
                  {isSelectedAgent && (
                    <span className="bg-black/40 rounded-full p-0.5 flex items-center justify-center">
                      <CheckIcon className="w-3 h-3 text-white drop-shadow" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-gray-100">
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

        {/* 1-click background picker from current palette */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-gray-500 shrink-0">
            パレットから選択:
          </span>
          <div className="flex gap-1 flex-1">
            {currentPalette.colors.map((c) => {
              const isSelectedBg =
                params.backgroundColor.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onParamChange("backgroundColor", c)}
                  className={`h-5 flex-1 rounded border transition-all cursor-pointer ${
                    isSelectedBg
                      ? "ring-2 ring-indigo-500 ring-offset-1 border-gray-400 scale-105 shadow-xs"
                      : "border-gray-300 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={`1クリックで背景色を ${c} に設定`}
                />
              );
            })}
          </div>
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

        <CheckboxField
          label="エージェントの影 (シャドウ) を有効化"
          checked={params.shadowEnable}
          onChange={(checked) => onParamChange("shadowEnable", checked)}
        />

        {params.shadowEnable && (
          <div className="pl-3.5 pr-1 py-1.5 space-y-2 border-l-2 border-amber-300 bg-amber-50/40 rounded-r text-[11px]">
            <SliderField
              label="影のぼかし半径 (Blur)"
              value={params.shadowBlur ?? 12}
              displayValue={`${params.shadowBlur ?? 12}px`}
              min={0}
              max={40}
              step={1}
              onChange={(v) => onParamChange("shadowBlur", v)}
            />
            <SliderField
              label="X方向オフセット"
              value={params.shadowOffsetX ?? 3}
              displayValue={`${params.shadowOffsetX ?? 3}px`}
              min={-25}
              max={25}
              step={1}
              onChange={(v) => onParamChange("shadowOffsetX", v)}
            />
            <SliderField
              label="Y方向オフセット"
              value={params.shadowOffsetY ?? 5}
              displayValue={`${params.shadowOffsetY ?? 5}px`}
              min={-25}
              max={25}
              step={1}
              onChange={(v) => onParamChange("shadowOffsetY", v)}
            />
            <SliderField
              label="影の不透明度 (Opacity)"
              value={params.shadowOpacity ?? 0.3}
              displayValue={
                Math.round((params.shadowOpacity ?? 0.3) * 100) / 100
              }
              min={0.05}
              max={1.0}
              step={0.05}
              onChange={(v) => onParamChange("shadowOpacity", v)}
            />
          </div>
        )}
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
