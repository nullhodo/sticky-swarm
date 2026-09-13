import {
  DownloadIcon,
  FileCodeIcon,
  FolderOpenIcon,
  ImageIcon,
  SaveIcon,
  VideoIcon,
} from "lucide-react";
import type React from "react";
import type { SwarmParameters } from "../../types/swarm";
import { AccordionSection } from "../ui/AccordionSection";
import { SliderField } from "../ui/SliderField";

interface ExportSectionProps {
  params: SwarmParameters;
  isOpen: boolean;
  onToggle: () => void;
  onParamChange: (
    key: keyof SwarmParameters,
    val: SwarmParameters[keyof SwarmParameters],
  ) => void;
  onExportJpg: () => void;
  onExportSvg: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  isRecording: boolean;
  onExportJsonc: () => void;
  onTriggerImport: () => void;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  params,
  isOpen,
  onToggle,
  onParamChange,
  onExportJpg,
  onExportSvg,
  onStartRecord,
  onStopRecord,
  isRecording,
  onExportJsonc,
  onTriggerImport,
}) => {
  return (
    <AccordionSection
      id="export"
      title="ファイル & 書き出し"
      icon={<DownloadIcon className="w-4 h-4 text-rose-600" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <SliderField
        label="画像書き出し解像度倍率"
        value={params.exportScaleMultiplier}
        displayValue={`${params.exportScaleMultiplier}x`}
        min={1}
        max={4}
        step={1}
        onChange={(val) =>
          onParamChange("exportScaleMultiplier", Math.round(val))
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onExportJpg}
          title="高精細JPG画像と設定ファイルを書き出し"
          className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 py-2 px-2.5 rounded font-medium transition flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-xs"
        >
          <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
          <span>高解像度 JPG</span>
        </button>

        <button
          type="button"
          onClick={onExportSvg}
          title="p5.js-svg によるベクターSVG書き出し"
          className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 py-2 px-2.5 rounded font-medium transition flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-xs"
        >
          <FileCodeIcon className="w-3.5 h-3.5 text-blue-600" />
          <span>ベクター SVG</span>
        </button>
      </div>

      {/* MP4 Recording Control */}
      <div>
        {isRecording ? (
          <button
            type="button"
            onClick={onStopRecord}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm animate-pulse"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>録画停止 (Sキー)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartRecord}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2 px-3 rounded font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <VideoIcon className="w-4 h-4 text-red-400" />
            <span>MP4 録画開始 (Rキー)</span>
          </button>
        )}
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          mp4-muxer による 60fps H.264 MP4 直接録画
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onExportJsonc}
          className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-1.5 px-2 rounded transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
        >
          <SaveIcon className="w-3 h-3 text-gray-500" />
          <span>設定保存 (JSONC)</span>
        </button>
        <button
          type="button"
          onClick={onTriggerImport}
          className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-1.5 px-2 rounded transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
        >
          <FolderOpenIcon className="w-3 h-3 text-gray-500" />
          <span>読込 (JSONC)</span>
        </button>
      </div>
    </AccordionSection>
  );
};
