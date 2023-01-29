import { lstat } from "fs";
import Jimp from "jimp";

export class ImageTrimmer {
  image?: Jimp;

  constructor() {}

  async loadByPath(path: string) {
    this.image = await Jimp.read(path);
  }

  async loadByBuffer(file: Buffer) {
    this.image = await Jimp.read(file);
  }

  async trimMargin(marginColor: string) {
    if (this.image === undefined) throw new Error("Image is not loaded");

    const edgePositionFromTop = await this.getVerticalEdgePositionOfColor(
      marginColor,
      "top"
    );
    const marginTop = edgePositionFromTop != null ? edgePositionFromTop : 0;

    const edgePositionFromBottom = await this.getVerticalEdgePositionOfColor(
      marginColor,
      "bottom"
    );
    const marginBottom =
      edgePositionFromBottom != null
        ? edgePositionFromBottom
        : this.image.bitmap.height;

    this.image.crop(
      0,
      marginTop,
      this.image.bitmap.width,
      marginBottom - marginTop
    );

    return {
      marginTop: marginTop,
      marginBottom: marginBottom,
      height: this.image.bitmap.height,
    };
  }

  async getMarginColor() {
    if (!this.image) {
      return null;
    }
    let marginColor: string | null = null;

    for (const { x, y, idx, image: any } of this.image.scanIterator(
      0,
      0,
      this.image.bitmap.width,
      this.image.bitmap.height
    )) {
      const red = this.image?.bitmap.data[idx + 0]!;
      const green = this.image?.bitmap.data[idx + 1]!;
      const blue = this.image?.bitmap.data[idx + 2]!;
      const alpha = this.image?.bitmap.data[idx + 3]!;

      const colorCode = this.rgbToHexColorCode(red, green, blue);
      if (marginColor != colorCode) {
        if (marginColor === null) {
          marginColor = colorCode;
        } else {
          break;
        }
      }
    }

    return marginColor;
  }

  async getVerticalEdgePositionOfColor(
    color: string,
    direction: "top" | "bottom",
    minX?: number,
    maxX?: number
  ) {
    if (!this.image) {
      return null;
    }

    if (minX === undefined) {
      minX = 0;
    }
    if (maxX === undefined) {
      maxX = this.image.bitmap.width;
    }

    let edgePositionY;
    if (direction === "top") {
      edgePositionY = 0;

      let isLast = false;

      for (let y = 0; y < this.image.bitmap.height && !isLast; y++) {
        for (let x = 0; x < this.image.bitmap.width; x++) {
          const idx = this.image.getPixelIndex(x, y);
          const red = this.image?.bitmap.data[idx + 0]!;
          const green = this.image?.bitmap.data[idx + 1]!;
          const blue = this.image?.bitmap.data[idx + 2]!;

          const colorCode = this.rgbToHexColorCode(red, green, blue);
          if (color == colorCode) {
            if (edgePositionY < y) {
              edgePositionY = y;
            }
          } else {
            isLast = true;
            break;
          }
        }
      }
    } else {
      edgePositionY = this.image.bitmap.height;

      let isLast = false;

      for (let y = this.image.bitmap.height - 1; y >= 0 && !isLast; y--) {
        for (let x = 0; x < this.image.bitmap.width; x++) {
          const idx = this.image.getPixelIndex(x, y);
          const red = this.image?.bitmap.data[idx + 0]!;
          const green = this.image?.bitmap.data[idx + 1]!;
          const blue = this.image?.bitmap.data[idx + 2]!;

          const colorCode = this.rgbToHexColorCode(red, green, blue);
          if (color == colorCode) {
            if (y < edgePositionY) {
              edgePositionY = y;
            }
          } else {
            isLast = true;
            break;
          }
        }
      }
    }

    return edgePositionY;
  }

  async getWidth() {
    return this.image?.bitmap.width;
  }

  async getHeight() {
    return this.image?.bitmap.height;
  }

  async resizeWithFit(param: { width?: number; height?: number }) {
    if (!this.image) {
      return;
    }
    let width = param.width || this.image.bitmap.width;
    let height = param.height || this.image.bitmap.height;

    return new Promise<void>((resolve) => {
      this.image?.scaleToFit(width, height, () => {
        resolve();
      });
    });
  }

  async resizeWithScale(scale: number) {
    return new Promise<void>((resolve) => {
      this.image?.scale(scale, () => {
        resolve();
      });
    });
  }

  async saveToPath(path: string, jpegQuality?: number) {
    if (jpegQuality !== undefined) {
      this.image?.quality(jpegQuality).write(path);
    } else {
      this.image?.write(path);
    }
  }

  async getBuffer(
    mime: "image/jpeg" | "image/png" = "image/jpeg",
    jpegQuality?: number
  ) {
    const jimpMime = mime == "image/jpeg" ? Jimp.MIME_JPEG : Jimp.MIME_PNG;
    if (jpegQuality) {
      return await this.image?.quality(jpegQuality).getBufferAsync(jimpMime);
    } else {
      return await this.image?.getBufferAsync(jimpMime);
    }
  }

  private rgbToHexColorCode(r: number, g: number, b: number) {
    return "#" + this.valueToHex(r) + this.valueToHex(g) + this.valueToHex(b);
  }

  private valueToHex(value: number) {
    return ("0" + value.toString(16)).slice(-2);
  }
}
