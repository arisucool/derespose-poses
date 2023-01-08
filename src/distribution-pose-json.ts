import { PoseJson } from "ngx-mp-pose-extractor";

export interface DistributionPoseJson
  extends Omit<PoseJson, "poses" | "poseLandmarkMapppings"> {
  poses: {
    t: number;
    vectors: number[][];
  }[];
}
