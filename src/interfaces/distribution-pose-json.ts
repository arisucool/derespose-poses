import { PoseSetJson, PoseSetJsonItem } from "ngx-mp-pose-extractor";

export interface DistributionPoseJson
  extends Omit<PoseSetJson, "poses" | "poseLandmarkMapppings"> {
  poses: Omit<PoseSetJsonItem, "l" | "r">[];
}
