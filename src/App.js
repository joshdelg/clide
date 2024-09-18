import { Box, Button, Text, Textarea } from "@chakra-ui/react";
import { useState } from "react";
import "@runno/runtime";
import { headlessRunCode } from "@runno/runtime";

function App() {

  const [ code, setCode ] = useState('print("Hello, world!")');

  const execute = async() => {
    const result = await headlessRunCode("python", code);
    console.log(result);
  }
  
//   const text = `
// name = input("What's your name? ")
// if "i" in name:
//   print("You've got an I in your name, how selfish.")
// else:
//   print("There's no I in your name.")
// `

  return (
    <div className="App">
      <Text fontSize="6xl">Hello, world!</Text>
      <Box>
        <Textarea placeholder="Enter C++ code" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button onClick={execute}>Execute!</Button>
      </Box>
    </div>
  );
}

export default App;
