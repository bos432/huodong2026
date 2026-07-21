import { Transform } from "node:stream";

const DEFINER_MARKER = Buffer.from("/*!50017 DEFINER=");
const COMMENT_END = Buffer.from("*/");

export function createSqlDefinerSanitizer() {
  let pending = Buffer.alloc(0);
  let stripping = false;

  return new Transform({
    transform(chunk, _encoding, callback) {
      pending = Buffer.concat([pending, chunk]);

      while (pending.length) {
        if (stripping) {
          const end = pending.indexOf(COMMENT_END);
          if (end < 0) {
            pending = Buffer.alloc(0);
            break;
          }
          pending = pending.subarray(end + COMMENT_END.length);
          stripping = false;
          continue;
        }

        const marker = pending.indexOf(DEFINER_MARKER);
        if (marker >= 0) {
          if (marker > 0) this.push(pending.subarray(0, marker));
          pending = pending.subarray(marker + DEFINER_MARKER.length);
          stripping = true;
          continue;
        }

        const retainedLength = Math.min(pending.length, DEFINER_MARKER.length - 1);
        const emittedLength = pending.length - retainedLength;
        if (emittedLength > 0) this.push(pending.subarray(0, emittedLength));
        pending = pending.subarray(emittedLength);
        break;
      }

      callback();
    },
    flush(callback) {
      if (stripping) {
        callback(new Error("Malformed mysqldump DEFINER clause"));
        return;
      }
      if (pending.length) this.push(pending);
      callback();
    }
  });
}
