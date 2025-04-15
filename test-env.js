const dotenv = require('dotenv');
dotenv.config();

console.log('LLM_API_KEY:', process.env.LLM_API_KEY);
console.log('LLM_PROVIDER:', process.env.LLM_PROVIDER);
console.log('LLM_MODEL:', process.env.LLM_MODEL);