import { createServer } from "node:http"
import { networkInterfaces } from "node:os"
import { readFile } from "node:fs/promises"

const PORT = 8080

// Define a map of files to serve
const files = {
    "/src/NiconicoScript.js": {
        content: await readFile("build/NiconicoScript.js"),
        type: "application/javascript",
    },
    "/src/NiconicoScript.ts": {
        content: await readFile("build/NiconicoScript.ts"),
        type: "application/x-typescript",
    },
    "/src/NiconicoScript.js.map": {
        content: await readFile("build/NiconicoScript.js.map"),
        type: "application/json",
    },
    "/src/NiconicoConfig.json": {
        content: await readFile("build/NiconicoConfig.json"),
        type: "application/json",
    },
    "/src/NiconicoIcon.png": {
        content: await readFile("build/NiconicoIcon.png"),
        type: "image/png",
    },
} as const

function getLocalIPAddress(): string {
    const br = networkInterfaces()
    const network_devices = Object.values(br)
    for (const network_interface of network_devices) {
        if (network_interface === undefined) {
            continue
        }
        for (const { address, family } of network_interface) {
            if (family === "IPv4" && address !== "127.0.0.1") {
                return address
            }
        }

    }
    throw new Error("panic")
}

createServer((req, res) => {
    const file = (() => {
        switch (req.url) {
            case "/src/NiconicoScript.js":
                return files[req.url]
            case "/src/NiconicoScript.ts":
                return files[req.url]
            case "/src/NiconicoScript.js.map":
                return files[req.url]
            case "/src/NiconicoConfig.json":
                return files[req.url]
            case "/src/NiconicoIcon.png":
                return files[req.url]
            default:
                return undefined
        }
    })()

    if (file !== undefined) {
        res.writeHead(200, { "Content-Type": file.type })
        res.end(file.content)
        return
    }

    res.writeHead(404)
    res.end("File not found")
    return
}).listen(PORT, () => {
    console.log(`Server running at http://${getLocalIPAddress()}:${PORT.toString()}/src/NiconicoConfig.json`)
})
