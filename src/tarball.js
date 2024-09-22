// Credit @taybenlor (author of Runno) on GitHub
// import type { BinaryWASIFS } from "@runno/wasi";
import { Tarball } from "@obsidize/tar-browserify";

// @ts-ignore - No type definitions
import { inflate } from "pako/dist/pako_inflate.min.js";

/**
 * Fetch the binary for a .tar.gz file
 */
export const fetchTarredFS = async (fsURL) => {
  const response = await fetch(fsURL);
  const buffer = await response.arrayBuffer();
  return await extractTarGz(new Uint8Array(buffer));
}

/**
 * Extract a .tar.gz file.
 *
 * Prefers ustar format.
 *
 * @param binary .tar.gz file
 * @returns
 */
export const extractTarGz = async (
  binary
) => {
  // If we receive a tar.gz, we first need to uncompress it.
  let inflatedBinary;
  try {
    inflatedBinary = inflate(binary);
  } catch (e) {
    inflatedBinary = binary;
  }

  const entries = Tarball.extract(inflatedBinary);

  const fs = {};
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    // HACK: Make sure each file name starts with /
    const name = entry.fileName.replace(/^([^/])/, "/$1");
    fs[name] = {
      path: name,
      timestamps: {
        change: new Date(entry.lastModified),
        access: new Date(entry.lastModified),
        modification: new Date(entry.lastModified),
      },
      mode: "binary",
      content: entry.content,
    };
  }

  return fs;
};