import * as fs from "fs/promises";
import * as fs_ from "fs";
import JSZip from "jszip";
import { PoseJson, PoseJsonItem } from "ngx-mp-pose-extractor";
import { DistributionPoseJson } from "./interfaces/distribution-pose-json";
import { ImageTrimmer } from "./image-trimmer";
import { PoseFileDefinition } from "./interfaces/pose-file-definition";

class DistributionPoseGenerator {
  static readonly POSE_FILE_INDEX_PATH = `${__dirname}/../poses/poses.json`;
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
    const now = Date.now();
    let numOfSavedImages = 0;
    for (const poseJsonItem of posesJson.poses) {
      console.warn(`      * ${poseFileName}/frame-${poseJsonItem.t}.png`);
      try {
        await this.savePoseImage(poseFileName, poseJsonItem, zip);
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
    poseJsonItem: PoseJsonItem,
    poseFile: JSZip
  ) {
    let file: Buffer | undefined = await poseFile
      .file("frame-" + poseJsonItem.t + ".jpg")
      ?.async("nodebuffer");

    if (!file) {
      file = await poseFile
        .file("snapshot-" + poseJsonItem.t + ".jpg")
        ?.async("nodebuffer");
    }

    if (!file) {
      throw new Error("frame image not found");
    }

    // Trim the image
    const imageTrimmer = new ImageTrimmer();
    await imageTrimmer.loadByBuffer(file);
    const marginColor = await imageTrimmer.getMarginColor();
    if (marginColor == "#000000") {
      await imageTrimmer.trimMargin(marginColor);
      await imageTrimmer.resizeWithFit({
        width: 800,
      });
      const f = await imageTrimmer.getBuffer("image/jpeg", 80);
      if (f) {
        file = f;
      }
    }

    // Save the file
    await fs.writeFile(
      `${DistributionPoseGenerator.DISTRIBUTION_POSE_JSON_DIRECTORY_PATH}/${poseJsonName}/frame-${poseJsonItem.t}.jpg`,
      file
    );
  }

  shrinkPosesJson(poseJson: PoseJson): DistributionPoseJson {
    (poseJson as any).poseLandmarkMapppings = undefined;
    return {
      ...poseJson,
      poses: poseJson.poses.map((poseJsonItem: PoseJsonItem) => {
        return {
          t: poseJsonItem.t,
          d: poseJsonItem.d,
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
