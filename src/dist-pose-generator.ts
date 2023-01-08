import * as fs from "fs/promises";
import * as fs_ from "fs";
import { PoseJson, PoseJsonItem } from "ngx-mp-pose-extractor";
import { DistributionPoseJson } from "./distribution-pose-json";
import JSZip from "jszip";

interface PoseFileDefinition {
  title: string;
  type: "song" | "chanpoku";
}

class DistributionPoseGenerator {
  static readonly POSE_FILE_INDEX_PATH = `${__dirname}/../poses/index.json`;
  static readonly POSE_FILE_DIRECTORY_PATH = `${__dirname}/../poses/`;
  static readonly DISTRIBUTION_POSE_JSON_DIRECTORY_PATH = `${__dirname}/../dist/`;

  constructor() {}

  async start() {
    const packageJson = require(`${__dirname}/../package.json`);
    console.log(`--------------------------------------------------
 Distribution Pose Generator for ${packageJson.name}
--------------------------------------------------\n`);

    const poseFileDefinitions =
      require(DistributionPoseGenerator.POSE_FILE_INDEX_PATH) as {
        [key: string]: PoseFileDefinition;
      };
    if (!poseFileDefinitions) {
      console.error("Error: poseFileDefinitions is empty.");
      return;
    }

    console.log(`* Processing...`);
    const numOfPoseFiles = Object.keys(poseFileDefinitions).length;
    let count = 0;
    for (const poseFileName of Object.keys(poseFileDefinitions)) {
      try {
        await this.processPoseFile(
          poseFileName,
          poseFileDefinitions[poseFileName]
        );
        count++;
      } catch (e: any) {
        console.error(`    * Error occurred`, e);
      }
    }

    console.log(`\n* Processed ${count} / ${numOfPoseFiles} pose files.\n`);
  }

  async processPoseFile(poseFileName: string, definition: PoseFileDefinition) {
    console.log(`\n  * ${poseFileName} (${definition.title})`);

    if (
      fs_.existsSync(
        `${DistributionPoseGenerator.DISTRIBUTION_POSE_JSON_DIRECTORY_PATH}/${poseFileName}`
      )
    ) {
      console.log(`    * Skip`);
      return;
    }

    console.log(`    * Unzipping...`);
    const jsZip = new JSZip();
    const zip = await jsZip.loadAsync(
      await fs.readFile(
        `${DistributionPoseGenerator.POSE_FILE_DIRECTORY_PATH}/${poseFileName}.zip`
      )
    );
    const posesJsonRaw = await zip.file("poses.json")?.async("string");
    if (!posesJsonRaw) {
      throw new Error("poses.json not found");
    }

    const posesJson = JSON.parse(posesJsonRaw) as PoseJson;

    console.log(`    * Generating shrink json...`);
    await fs.mkdir(
      `${DistributionPoseGenerator.DISTRIBUTION_POSE_JSON_DIRECTORY_PATH}/${poseFileName}`
    );

    const shrinkedPoseJson = this.shrinkPosesJson(posesJson);
    await fs.writeFile(
      `${DistributionPoseGenerator.DISTRIBUTION_POSE_JSON_DIRECTORY_PATH}/${poseFileName}/poses.json`,
      JSON.stringify(shrinkedPoseJson, null, 2)
    );

    console.log(`    * Saving frame images...`);
    const numOfImages = await this.savePoseImages(poseFileName, posesJson, zip);
    console.log(`    * Saved ${numOfImages} frame images`);
  }

  async savePoseImages(
    poseJsonName: string,
    poseJson: PoseJson,
    poseFile: JSZip
  ) {
    let count = 0;
    for (const poseJsonItem of poseJson.poses) {
      const file = await poseFile
        .file("frame-" + poseJsonItem.t + ".jpg")
        ?.async("uint8array");

      if (!file) {
        continue;
      }

      await fs.writeFile(
        `${DistributionPoseGenerator.DISTRIBUTION_POSE_JSON_DIRECTORY_PATH}/${poseJsonName}/frame-${poseJsonItem.t}.jpg`,
        file
      );
      count++;
    }
    return count;
  }

  shrinkPosesJson(poseJson: PoseJson): DistributionPoseJson {
    (poseJson as any).poseLandmarkMapppings = undefined;
    return {
      ...poseJson,
      poses: poseJson.poses.map((poseJsonItem: PoseJsonItem) => {
        return {
          t: poseJsonItem.t,
          vectors: poseJsonItem.vectors,
        };
      }),
    };
  }
}

const generator = new DistributionPoseGenerator();
(async () => {
  await generator.start();
})();
