import crypto from 'node:crypto';
import fs, { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import type { KFNFile, KFNHeader } from 'jaraoke-shared/types';
import { createLogger } from '../../utils/logger';

const BYTES_TO_READ = 4;

type HeaderKeys = keyof KFNHeader;

const AES128Decryptor = (key: string) => {
  const keyBuffer = Buffer.alloc(16, 0);
  Buffer.from(key).copy(keyBuffer, 0, 0, Math.min(key.length, 16));

  return (encrypted: Buffer): Buffer => {
    const decipher = crypto.createDecipheriv('aes-128-ecb', keyBuffer, null);
    decipher.setAutoPadding(false);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  };
};

const logger = createLogger('kfn-reader');

export const kfnReader = (kfnFilePath: string, outputDir: string) => {
  let offset = 0;

  let header: KFNHeader | null = null;
  let directory: KFNFile[] | null = null;
  let decryptor: ((encrypted: Buffer) => Buffer) | null = null;

  if (!fs.existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const readBytes = async (bytesToRead = 4) => {
    const chunks = [];

    for await (const chunk of fs.createReadStream(kfnFilePath, {
      start: offset,
      end: offset + bytesToRead - 1,
    })) {
      chunks.push(chunk);
    }

    offset += bytesToRead;

    return Buffer.concat(chunks);
  };

  const readFile = async (start: number, length: number) => {
    const chunks = [];

    for await (const chunk of fs.createReadStream(kfnFilePath, {
      start,
      end: start + length - 1,
    })) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  };

  const readByte = async () => {
    return readBytes(1);
  };

  const readDWord = async () => {
    const buff = readBytes();
    return (await buff).readUInt32LE(0);
  };

  const readHeader = async () => {
    const output: KFNHeader = {};

    const initSignature = (await readBytes(BYTES_TO_READ)).toString('utf8');

    if (initSignature !== 'KFNB') {
      throw Error('File is not valid KFN file');
    }

    while (true) {
      const signature = (await readBytes()).toString() as HeaderKeys;
      const type = (await readByte()).readInt8();
      const lengthOrValue = await readDWord();

      switch (type) {
        case 1:
          output[signature] = lengthOrValue.toString();
          break;
        case 2: {
          const buf = await readBytes(lengthOrValue);
          const value = buf.toString('utf8');
          output[signature] = value;
          break;
        }
      }

      if (signature === 'ENDH') {
        break;
      }
    }

    if (output.FLID) {
      decryptor = AES128Decryptor(output.FLID);
    }

    return output;
  };

  const getHeader = async () => {
    if (!header) {
      header = await readHeader();
    }

    return header;
  };

  const readDirectory = async () => {
    const numberFiles = await readDWord();
    const kfnFiles: KFNFile[] = [];

    for (let i = 0; i < numberFiles; i++) {
      const fileNameLength = await readDWord();
      const fileName = await readBytes(fileNameLength);
      const fileType = await readDWord();
      const fileLengthOne = await readDWord();
      const fileOffset = await readDWord();
      const fileLengthTwo = await readDWord();
      const fileFlags = await readDWord();

      kfnFiles.push({
        fileName: fileName.toString('utf8'),
        type: fileType,
        flags: fileFlags,
        length: fileLengthOne,
        encryptedLength: fileLengthTwo,
        offset: fileOffset,
      });
    }

    kfnFiles.forEach((f) => {
      f.offset += offset;
    });

    return kfnFiles;
  };

  const getDirectory = async () => {
    if (!directory) {
      directory = await readDirectory();
    }

    return directory;
  };

  const decryptFile = async (fileBuffer: Buffer, originFileLength: number) => {
    if (!decryptor) {
      throw new Error(`Needs encryption key`);
    }

    const decrypted = decryptor?.(fileBuffer);

    const output = Buffer.alloc(originFileLength);
    decrypted.copy(output);

    return output;
  };

  const extractFile = async (kfnFile: KFNFile, songOutputDir: string) => {
    const outputFile = join(songOutputDir.toString(), kfnFile.fileName);

    if (kfnFile.flags === 1) {
      const fileBuffer = await readFile(
        kfnFile.offset,
        kfnFile.encryptedLength,
      );
      const decryptedFile = await decryptFile(fileBuffer, kfnFile.length);
      fs.writeFileSync(outputFile, decryptedFile);
      logger.debug(`Decrypted and Saved: ${outputFile}`);
      return;
    }

    const fileBuffer = await readFile(kfnFile.offset, kfnFile.length);
    fs.writeFileSync(outputFile, fileBuffer);
    logger.info(`Saved: "${outputFile}"`);
  };

  const extractFiles = async (extractToRoot: boolean = false) => {
    // Need to do this to ensure the correct file length is read
    const headers = await getHeader();
    const kfnFiles = await getDirectory();

    const songOutputDir = join(outputDir.toString(), headers.TITL!);
    const dir = extractToRoot ? outputDir.toString() : songOutputDir;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    for (const f of kfnFiles) {
      await extractFile(f, dir);
    }

    return dir;
  };

  return {
    extractFiles,
    getHeader,
    getDirectory,
  };
};
