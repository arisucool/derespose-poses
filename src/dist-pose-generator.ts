import * as fs from "fs/promises";
import * as fs_ from "fs";
import JSZip from "jszip";
import { PoseSetJson, PoseSetJsonItem } from "ngx-mp-pose-extractor";
import { DistributionPoseJson } from "./interfaces/distribution-pose-json";
import { PoseSetsDefinition } from "./interfaces/pose-sets-definition";

class DistributionPoseGenerator {
  static readonly POSE_SET_DEFINITIONS_PATH = `${__dirname}/../pose-sets/pose-sets.json`;
  static readonly POSE_SET_DIRECTORY_PATH = `${__dirname}/../pose-sets/`;
  static readonly POSE_SET_ZIP_FILE_NAME_POSTFIX = `-poses.zip`;
  static readonly POSE_SET_FRAME_IMAGE_EXTENSION = `.webp`;
  static readonly DISTRIBUTION_POSE_SETS_DIRECTORY_PATH = `${__dirname}/../dist/`;

  constructor() {}

  async start() {
    const packageJson = require(`${__dirname}/../package.json`);
    console.log(`--------------------------------------------------
 Distribution Pose Generator for ${packageJson.name}
--------------------------------------------------\n`);

    const poseSetDefinitions =
      require(DistributionPoseGenerator.POSE_SET_DEFINITIONS_PATH) as {
        [key: string]: PoseSetsDefinition;
      };
    if (!poseSetDefinitions) {
      console.error("Error: poseSetDefinitions is empty.");
      return;
    }

    console.log(`* Processing...`);
    const numOfPoseFiles = Object.keys(poseSetDefinitions).length;
    let count = 0;
    for (const poseSetName of Object.keys(poseSetDefinitions)) {
      try {
        await this.processPoseFile(
          poseSetName,
          poseSetDefinitions[poseSetName]
        );
        count++;
      } catch (e: any) {
        console.error(`    * Error occurred`, e);
      }
    }

    console.log(`\n* Processed ${count} / ${numOfPoseFiles} pose files.\n`);
  }

  async processPoseFile(poseSetName: string, definition: PoseSetsDefinition) {
    console.log(`\n  * ${poseSetName} (${definition.title})`);

    if (
      fs_.existsSync(
        `${DistributionPoseGenerator.DISTRIBUTION_POSE_SETS_DIRECTORY_PATH}/${poseSetName}`
      )
    ) {
      console.log(`    * Skip`);
      return;
    }

    console.log(`    * Unzipping...`);
    const jsZip = new JSZip();
    const zip = await jsZip.loadAsync(
      await fs.readFile(
        `${DistributionPoseGenerator.POSE_SET_DIRECTORY_PATH}/${poseSetName}${DistributionPoseGenerator.POSE_SET_ZIP_FILE_NAME_POSTFIX}`
      )
    );
    const poseSetJsonString = await zip.file("poses.json")?.async("string");
    if (!poseSetJsonString) {
      throw new Error("poses.json not found");
    }

    const poseSetJson = JSON.parse(poseSetJsonString) as PoseSetJson;

    console.log(`    * Generating shrinked json of poseset...`);
    await fs.mkdir(
      `${DistributionPoseGenerator.DISTRIBUTION_POSE_SETS_DIRECTORY_PATH}/${poseSetName}`
    );

    const shrinkedPoseJson = this.shrinkPosesJson(poseSetJson);
    await fs.writeFile(
      `${DistributionPoseGenerator.DISTRIBUTION_POSE_SETS_DIRECTORY_PATH}/${poseSetName}/poses.json`,
      JSON.stringify(shrinkedPoseJson, null, 2)
    );

    console.log(`    * Saving frame images...`);
    const now = Date.now();
    let numOfSavedImages = 0;
    for (const poseJsonItem of poseSetJson.poses) {
      console.log(`      * ${poseSetName}/frame-${poseJsonItem.t}.png`);
      try {
        await this.savePoseImage(poseSetName, poseJsonItem, zip);
      } catch (e: any) {
        console.warn(`        * Error:`, e);
        continue;
      }
      numOfSavedImages++;
    }
    console.log(
      `    * Saved ${numOfSavedImages} frame images (${Math.floor(
        (Date.now() - now) / 1000
      )}sec.)`
    );
  }

  async savePoseImage(
    poseJsonName: string,
    poseJsonItem: PoseSetJsonItem,
    poseSetFile: JSZip
  ) {
    let file: Buffer | undefined = await poseSetFile
      .file(
        "frame-" +
          poseJsonItem.t +
          DistributionPoseGenerator.POSE_SET_FRAME_IMAGE_EXTENSION
      )
      ?.async("nodebuffer");

    if (!file) {
      file = await poseSetFile
        .file(
          "snapshot-" +
            poseJsonItem.t +
            DistributionPoseGenerator.POSE_SET_FRAME_IMAGE_EXTENSION
        )
        ?.async("nodebuffer");
    }

    if (!file) {
      throw new Error("frame image not found");
    }

    // Save the file
    await fs.writeFile(
      `${DistributionPoseGenerator.DISTRIBUTION_POSE_SETS_DIRECTORY_PATH}/${poseJsonName}/frame-${poseJsonItem.t}${DistributionPoseGenerator.POSE_SET_FRAME_IMAGE_EXTENSION}`,
      file
    );
  }

  shrinkPosesJson(poseJson: PoseSetJson): DistributionPoseJson {
    (poseJson as any).poseLandmarkMapppings = undefined;
    return {
      ...poseJson,
      poses: poseJson.poses.map((poseJsonItem: PoseSetJsonItem) => {
        return {
          t: poseJsonItem.t,
          d: poseJsonItem.d,
          v: poseJsonItem.v,
          h: poseJsonItem.h,
          e: poseJsonItem.e,
        };
      }),
    };
  }
}

const generator = new DistributionPoseGenerator();
(async () => {
  await generator.start();
})();
