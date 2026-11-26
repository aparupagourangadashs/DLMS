import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";

/** Where uploaded files live. Only the local driver exists; an S3-compatible one can replace it without touching callers. */
export type StorageDriver = {
    put(key: string, data: Buffer): Promise<void>;
    open(key: string, range?: { start: number; end: number }): Readable;
    remove(key: string): Promise<void>;
};

const KEY = /^[a-f0-9]{2}\/[a-f0-9]{32}$/;

/** A random key; nothing about the original file name or owner appears in it. */
export function newStorageKey() {
    const id = crypto.randomBytes(16).toString("hex");
    return `${id.slice(0, 2)}/${id}`;
}

// The upload directory is chosen at run time, so the bundler must not trace it into the build.
function rootDir() {
    return path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), "storage"));
}

function pathFor(key: string) {
    if (!KEY.test(key)) throw new Error("Invalid storage key.");
    return path.join(/*turbopackIgnore: true*/ rootDir(), ...key.split("/"));
}

const local: StorageDriver = {
    async put(key, data) {
        const target = pathFor(key);
        await fsp.mkdir(path.dirname(target), { recursive: true });
        await fsp.writeFile(target, data, { flag: "wx", mode: 0o640 });
    },
    open(key, range) {
        return fs.createReadStream(pathFor(key), range);
    },
    async remove(key) {
        await fsp.rm(pathFor(key), { force: true });
    },
};

export function getStorage(): StorageDriver {
    return local;
}
