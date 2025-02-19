import { createReadStream, createWriteStream } from "node:fs"
import { copyFile, rename, cp } from "node:fs/promises"
import * as readline from "node:readline"
import { EOL } from "node:os"
import { execFileSync } from "node:child_process"
import { argv } from "node:process"

async function modifyFile(filePath: string, offset: number) {
    const tempFilePath = `${filePath}.tmp`

    const readStream = createReadStream(filePath, 'utf-8')
    const writeStream = createWriteStream(tempFilePath, 'utf-8')
    const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
    })

    const lines: string[] = []

    for await (const line of rl) {
        lines.push(line)
    }

    rl.close()
    readStream.close()

    if (lines[lines.length - (1 + offset)]?.slice(0, 6) === "export") {
        // Comment out export line
        lines[lines.length - (1 + offset)] = `// ${lines[lines.length - (1 + offset)]}`
    }

    for (const line of lines) {
        writeStream.write(line + EOL)
    }

    writeStream.end()

    writeStream.on('finish', async () => {
        // Rename the temporary file to overwrite the original file
        await rename(tempFilePath, filePath)
    })

    writeStream.on('error', (error) => {
        console.error('Error writing to file:', error)
    })
}
const copy_promise0 = cp("src", "_dist/src/", { recursive: true, force: true })
const copy_promise1 = cp("tests", "_dist/tests/", { recursive: true, force: true })
await Promise.all([copy_promise0, copy_promise1])
if (argv[2] !== undefined) {
    execFileSync("tsc", ["--mapRoot", argv[2], "--sourceRoot", argv[2]], { shell: true, encoding: 'utf-8', stdio: 'inherit' })
} else {
    execFileSync("tsc", { shell: true, encoding: 'utf-8', stdio: 'inherit' })
}
const promise1 = copyFile("_dist/src/NiconicoScript.ts", "build/NiconicoScript.ts")
const promise2 = copyFile("_dist/src/NiconicoScript.js", "build/NiconicoScript.js")
const promise3 = copyFile("_dist/src/NiconicoScript.js.map", "build/NiconicoScript.js.map")
await Promise.all([promise1, promise2, promise3])
modifyFile("build/NiconicoScript.ts", 0)
modifyFile("build/NiconicoScript.js", 1)
