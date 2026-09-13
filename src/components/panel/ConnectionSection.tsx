import { LinkIcon } from "lucide-react";
import type React from "react";
import type { SwarmParameters, TargetRule } from "../../types/swarm";
import { AccordionSection } from "../ui/AccordionSection";
import { CheckboxField } from "../ui/CheckboxField";
import { SelectField } from "../ui/SelectField";
import { SliderField } from "../ui/SliderField";

interface ConnectionSectionProps {
  params: SwarmParameters;
  isOpen: boolean;
  onToggle: () => void;
  onParamChange: (
    key: keyof SwarmParameters,
    val: SwarmParameters[keyof SwarmParameters],
  ) => void;
}

const TARGET_RULE_OPTIONS = [
  { label: "どこでも接着 (Any)", value: "any" },
  { label: "ボディ同士のみ (Body to Body)", value: "body_body" },
  { label: "腕同士のみ (一直線)", value: "arm_arm" },
  { label: "腕の先端のみ ※角度不問", value: "arm_tip_any_angle" },
  { label: "腕とボディのみ (Arm to Body)", value: "arm_body" },
];

export const ConnectionSection: React.FC<ConnectionSectionProps> = ({
  params,
  isOpen,
  onToggle,
  onParamChange,
}) => {
  return (
    <AccordionSection
      id="connection"
      title="接着・剛体化ルール"
      icon={<LinkIcon className="w-4 h-4 text-blue-600" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <SelectField
        label="接着する対象部位"
        value={params.targetRule}
        options={TARGET_RULE_OPTIONS}
        onChange={(val) => onParamChange("targetRule", val as TargetRule)}
      />

      <SliderField
        label="接着バネの硬さ (Stiffness)"
        value={params.stiffness}
        displayValue={params.stiffness.toFixed(2)}
        min={0.01}
        max={1.0}
        step={0.01}
        onChange={(val) => onParamChange("stiffness", val)}
      />

      <div className="pt-2 border-t border-gray-100 space-y-2.5">
        <CheckboxField
          label="接着バネ拘束線を表示 (白い線)"
          checked={params.showConstraints}
          onChange={(checked) => onParamChange("showConstraints", checked)}
          description="エージェント同士を繋ぐ物理バネの線を可視化します（デバッグモード時も自動表示）"
        />

        <CheckboxField
          label="接着時のボディ重複を防止"
          checked={params.preventBodyOverlap}
          onChange={(checked) =>
            onParamChange("preventBodyOverlap", checked)
          }
          description="接着後にエージェントの体（円）同士が重なり合う配置になる場合、接着を行わないようにします"
        />

        <CheckboxField
          label="一直線で複合剛体に結合 (Compound)"
          checked={params.compoundOnAlign}
          onChange={(checked) => onParamChange("compoundOnAlign", checked)}
          description="腕が揃った時点で1つの剛体に結合し、高速回転バグを防止して安定した巨大な塊を形成します"
        />

        <div className="pt-2 border-t border-gray-100">
          <CheckboxField
            label="接続の古さに応じて確率で切断 (Break by Age)"
            checked={params.disconnectionEnable}
            onChange={(checked) =>
              onParamChange("disconnectionEnable", checked)
            }
            description="結合してからの経過時間が長くなるにつれて、徐々に確率で結合が破断・分離します"
          />

          {params.disconnectionEnable && (
            <div className="pl-4 pt-2.5 space-y-2.5 border-l-2 border-blue-200 mt-2">
              <SliderField
                label="切断猶予時間"
                value={params.disconnectionMinAge}
                displayValue={`${params.disconnectionMinAge.toFixed(1)}秒`}
                min={0.5}
                max={20.0}
                step={0.5}
                description="結合直後にすぐ切断されないための最小猶予時間"
                onChange={(val) =>
                  onParamChange("disconnectionMinAge", val)
                }
              />

              <SliderField
                label="切断確率係数"
                value={params.disconnectionChance}
                displayValue={`${params.disconnectionChance.toFixed(2)} /秒`}
                min={0.01}
                max={0.5}
                step={0.01}
                description="猶予時間を超えた後の秒間あたりの基準切断確率"
                onChange={(val) =>
                  onParamChange("disconnectionChance", val)
                }
              />
            </div>
          )}
        </div>
      </div>
    </AccordionSection>
  );
};
