export const getFrameworkPrompt = (framework) => {
  const prompts = {
    react: " You specialize in creating React applications with TypeScript, React Router, and Tailwind CSS.",
    node: " You specialize in creating Node.js applications with Express.js, MongoDB/Mongoose, and JWT authentication.",
    vue: " You specialize in creating Vue.js applications with TypeScript, Vue Router, and Vuex."
  };
  return prompts[framework] || '';
};

export const getSystemPrompt = (framework) => {
  return `You are a helpful assistant that generates structured responses for code generation. 
    Your response must always be in the following JSON format:
    {
      "files": [
        {
          "path": "relative/path/to/file.ext",
          "content": "file content here",
          "type": "create|update|delete"
        }
      ],
      "description": "Detailed explanation of changes",
      "dependencies": ["package1", "package2"]
    }${getFrameworkPrompt(framework)}`;
};
