import { CpuIcon } from "lucide-react";
import type React from "react";
import type { SwarmParameters } from "../../types/swarm";
import { AccordionSection } from "../ui/AccordionSection";
import { CheckboxField } from "../ui/CheckboxField";
import { SelectField } from "../ui/SelectField";
import { SliderField } from "../ui/SliderField";

interface SystemSectionProps {
  params: SwarmParameters;
  isOpen: boolean;
  onToggle: () => void;
  onParamChange: (
    key: keyof SwarmParameters,
    val: SwarmParameters[keyof SwarmParameters],
  ) => void;
}

const FPS_SAFETY_OPTIONS = [
  { label: "無効 (制限なし)", value: "0" },
  { label: "30 FPS 未満で追加停止", value: "30" },
  { label: "60 FPS 未満で追加停止", value: "60" },
];

export const SystemSection: React.FC<SystemSectionProps> = ({
  params,
  isOpen,
  onToggle,
  onParamChange,
}) => {
  return (
    <AccordionSection
      id="system"
      title="システム設定"
      icon={<CpuIcon className="w-4 h-4 text-indigo-600" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <SliderField
        label="初期エージェント数"
        description="指数スケール (10〜1000体)"
        value={params.agentCount}
        displayValue={`${params.agentCount}体`}
        min={10}
        max={1000}
        step={1}
        isLogarithmic={true}
        onChange={(val) => onParamChange("agentCount", Math.round(val))}
      />

      <SliderField
        label="ランダム移動速度"
        value={params.movementSpeed}
        displayValue={params.movementSpeed.toFixed(1)}
        min={0.0}
        max={5.0}
        step={0.1}
        onChange={(val) => onParamChange("movementSpeed", val)}
      />

      <SliderField
        label="回転速度"
        value={params.rotationSpeed}
        displayValue={params.rotationSpeed.toFixed(1)}
        min={0.0}
        max={3.0}
        step={0.1}
        onChange={(val) => onParamChange("rotationSpeed", val)}
      />

      <div className="space-y-2 pt-1 border-t border-gray-100">
        <CheckboxField
          label="画面外から継続登場"
          checked={params.spawnNewAgents}
          onChange={(checked) => onParamChange("spawnNewAgents", checked)}
        />

        <CheckboxField
          label="初期数を下回った場合のみ登場"
          checked={params.maintainPopulation}
          onChange={(checked) =>
            onParamChange("maintainPopulation", checked)
          }
        />

        {params.spawnNewAgents && (
          <div className="pt-1 space-y-2">
            <SliderField
              label="登場頻度 (1秒あたりの平均数)"
              value={params.spawnRate}
              displayValue={params.spawnRate.toFixed(1)}
              min={0.1}
              max={5.0}
              step={0.1}
              onChange={(val) => onParamChange("spawnRate", val)}
            />
            <SelectField
              label="FPS安全ガード (低下時に追加停止)"
              value={String(params.fpsSafetyLimit ?? 0)}
              options={FPS_SAFETY_OPTIONS}
              onChange={(val) =>
                onParamChange("fpsSafetyLimit", Number(val))
              }
            />
          </div>
        )}

        <CheckboxField
          className="pt-1"
          label="物理デバッグモード (剛体・力・拘束の可視化)"
          checked={params.debugMode}
          onChange={(checked) => onParamChange("debugMode", checked)}
        />

        {params.debugMode && (
          <div className="pl-6 pt-0.5">
            <CheckboxField
              label="動き（速度）・加わる力の矢印ベクトル表示"
              checked={params.debugVectors}
              onChange={(checked) =>
                onParamChange("debugVectors", checked)
              }
            />
          </div>
        )}
      </div>
    </AccordionSection>
  );
};
