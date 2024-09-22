import React, { useState } from 'react';
import { WASIFS, WASIWorkerHost, WASIWorkerHostKilledError, WASI } from '@runno/wasi';
import { headlessRunCode, headlessRunFS } from "@runno/runtime";
import { ChakraProvider, Box, VStack, Textarea, Flex, Button, Text } from '@chakra-ui/react';
import { extractTarGz, fetchTarredFS } from './tarball';


const IDELayout = () => {
        const DEFAULT_CODE = `
#include <iostream>
int main() {
  std::cout << "Hello, world!" << std::endl;
  return 0;
}
`;

    const [code, setCode] = useState(DEFAULT_CODE);

    // For binaries/tars hosted in the public folder
    const baseURL = process.env.PUBLIC_URL;
    
    // Main file to try and compile
    const entryPath = "/main.cpp";

    let programFS = {
        "/main.cpp": {
            path: "/main.cpp",
            timestamps: {
                access: new Date(),
                change: new Date(),
                modification: new Date()
            },
            mode: "string",
            content: code
        }
    };

    const compile = async () => {
        console.log("COMPILING...");

        const command = {
            binaryURL: `${baseURL}/clang.wasm`,
            binaryName: "clang",
            args: [
                "-cc1",
                "-v",
                "-Werror",
                "-emit-obj",
                "-disable-free",
                "-isysroot",
                "/sys",
                "-internal-isystem",
                "/sys/include/c++/v1",
                "-internal-isystem",
                "/sys/include",
                "-internal-isystem",
                "/sys/lib/clang/8.0.1/include",
                "-ferror-limit",
                "4",
                "-fmessage-length",
                "80",
                "-fcolor-diagnostics",
                "-O2",
                "-o",
                "/program.o",
                "-x",
                "c++",
                entryPath,
            ],
            env: {},
            baseFSURL: `${baseURL}/clang-fs.tar.gz`,
        }

        console.log("Extracting includes");
        let extractedFS = await fetchTarredFS(`${baseURL}/clang-fs.tar.gz`);
        programFS = {...programFS, ...extractedFS};

        console.log("Compiling");
        const result = await WASI.start(fetch(command.binaryURL), {
            args: [command.binaryName, ...command.args],
            env: command.env,
            stdout: (out) => console.log("stdout:", out),
            stderr: (err) => console.log("stderr:", err),
            stdin: () => prompt("stdin:"),
            fs: programFS
        });

        programFS = result.fs;

        console.log("Finished compilation");
    };

    const link = async () => {
        console.log("LINKING...");

        const command = {
            binaryURL: `${baseURL}/wasm-ld.wasm`,
            binaryName: "wasm-ld",
            args: [
                "--no-threads",
                "--export-dynamic",
                "--verbose",
                "-z",
                "stack-size=1048576",
                "-L/sys/lib/wasm32-wasi",
                "/sys/lib/wasm32-wasi/crt1.o",
                "/program.o",
                "-lc",
                "-lc++",
                "-lc++abi",
                "-o",
                "/program.wasm",
            ],
            env: {},
        };

        const result = await WASI.start(fetch(command.binaryURL), {
            args: [command.binaryName, ...command.args],
            env: command.env,
            stdout: (out) => console.log("stdout:", out),
            stderr: (err) => console.log("stderr", err),
            stdin: () => prompt("stdin:"),
            fs: programFS,
        });

        programFS = result.fs;
        
        console.log("Finished linking!", programFS);
    };

    const run = async () => {
        const command = {
            fsPath: "/program.wasm",
            binaryName: "program",
        }

        const file = programFS[command.fsPath];

        if(!file) throw new Error("Attempting to run nonexisten file:", command.fsPath);

        const blob = new Blob([file.content], {type: "application/wasm"});
        const binaryPath =  URL.createObjectURL(blob);

        const result = await WASI.start(fetch(binaryPath), {
            args: [command.binaryName],
            env: {},
            fs: programFS,
            stdout: (out) => console.log("stdout", out),
            stderr: (err) => console.log("stderr", err),
            stdin: () => prompt("stdin")
        });

        console.log("Finished execution!", result);
    };

    const compile_link_run = async () => {
        await compile();
        await link();
        await run();
    };

    return (
        <ChakraProvider>
            <Flex height="100vh">
                {/* File Pane: Left 1/4 */}
                <Box width="25%" bg="gray.100" p={4}>
                    <VStack spacing={4}>
                        <Box p={2} bg="gray.200" borderRadius="md">File 1</Box>
                        <Box p={2} bg="gray.200" borderRadius="md">File 2</Box>
                        <Box p={2} bg="gray.200" borderRadius="md">File 3</Box>
                    </VStack>
                </Box>

                {/* Code Editor + Terminal: Right 3/4 */}
                <Box width="75%" p={4}>
                    <Flex direction="column" height="100%">
                        <Flex direction="row" justifyContent="center" alignItems="center" my={4}>
                            <Button onClick={compile_link_run}>Run!</Button>
                        </Flex>
                        {/* Code Editor: Top 7/8 */}
                        <Box flex="7" bg="white" border="1px solid" borderColor="gray.200" mb={4}>
                            <Textarea
                                placeholder="Write your C++ code here..."
                                height="100%"
                                resize="none"
                                fontFamily="monospace"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />
                        </Box>

                        {/* Terminal: Bottom 1/8 */}
                        <Box flex="1" bg="black" color="white" p={2} borderRadius="md" fontFamily="monospace">
                            {/* <Text fontSize="md">{terminalOut}</Text> */}
                        </Box>
                    </Flex>
                </Box>
            </Flex>
        </ChakraProvider>
    );
};

export default IDELayout;
