import { type PrimitiveAtom, atom } from "jotai";
import { DEFAULT_SWARM_PARAMETERS } from "../constants/palettes";
import type { SwarmParameters } from "../types/swarm";

interface RecordingState {
  isRecording: boolean;
  elapsedSeconds: number;
}

export const swarmParamsAtom: PrimitiveAtom<SwarmParameters> = atom(
  DEFAULT_SWARM_PARAMETERS,
);

export const historyStackAtom: PrimitiveAtom<SwarmParameters[]> = atom([
  DEFAULT_SWARM_PARAMETERS,
]);

export const historyPointerAtom: PrimitiveAtom<number> = atom(0);

export const isPanelOpenAtom: PrimitiveAtom<boolean> = atom(true);

export const recordingStateAtom: PrimitiveAtom<RecordingState> =
  atom<RecordingState>({
    isRecording: false,
    elapsedSeconds: 0,
  });
