import { PoseSetJson, PoseSetJsonItem } from "ngx-mp-pose-extractor";

export interface DistributionPoseJson
  extends Omit<PoseSetJson, "poses" | "poseLandmarkMapppings"> {
  // 各ポーズから p (pose)、l (leftHand)、r (rightHand) を除外し、ベクトルおよびその他の情報のみにする
  poses: Omit<PoseSetJsonItem, "p" | "l" | "r">[];
}
