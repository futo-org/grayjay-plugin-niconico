//#region imports
import { describe, test } from "node:test"
import assert from "node:assert"
// initializes global state
import "@kaidelorenzo/grayjay-polyfill"

import { milliseconds_to_WebVTT_timestamp } from "./NiconicoScript.js"
//#endregion

await Promise.allSettled([describe("script module integration", { skip: false }, () => {
    return     test("test milliseconds conversion", { skip: false }, () => {
        const timestamp = milliseconds_to_WebVTT_timestamp(12345)
        assert.strictEqual(timestamp, "00:00:12.345")
    })
})])
