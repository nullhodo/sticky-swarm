import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { SquareIcon } from "lucide-react";
import type React from "react";
import { recordingStateAtom } from "../state/swarmStore";

interface Props {
  onStopRecord: () => void;
}

export const RecordingOverlay: React.FC<Props> = ({ onStopRecord }) => {
  const [recordingState] = useAtom(recordingStateAtom);

  if (!recordingState.isRecording) return null;

  const totalSec = recordingState.elapsedSeconds;
  const mins = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const secs = String(totalSec % 60).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="absolute top-4 right-4 z-50 flex items-center gap-3 bg-red-600/95 text-white px-4 py-2.5 rounded-md shadow-lg backdrop-blur-md border border-red-500 font-sans"
    >
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
        <span className="text-xs font-bold tracking-wider">
          REC {mins}:{secs}
        </span>
      </div>

      <button
        type="button"
        onClick={onStopRecord}
        title="録画を停止して保存 (Sキー)"
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs px-2.5 py-1 rounded transition cursor-pointer font-medium active:scale-95"
      >
        <SquareIcon className="w-3 h-3 fill-current" />
        <span>停止</span>
      </button>
    </motion.div>
  );
};
