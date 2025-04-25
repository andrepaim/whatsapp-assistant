/**
 * LangSmith Evaluation Demo
 * 
 * This script demonstrates how to use LangSmith for evaluating LLM responses
 * and running tests on your LLM application.
 * 
 * To run this demo:
 * 1. Set up your .env file with LangSmith credentials
 * 2. Run: node examples/langsmith-evaluation.js
 */

require('dotenv').config();
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { Client: LangSmithClient } = require('langsmith');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');

// Check if LangSmith environment variables are set
if (!process.env.LANGCHAIN_API_KEY) {
  console.error('Error: LANGCHAIN_API_KEY is not set in .env file');
  console.error('Please set up your LangSmith credentials before running this demo');
  process.exit(1);
}

// Configure LangSmith project
const PROJECT_NAME = process.env.LANGCHAIN_PROJECT || 'langsmith-evaluation';

/**
 * Create a dataset for evaluation
 */
async function createEvaluationDataset() {
  try {
    const langsmith = new LangSmithClient();
    
    // Create a dataset
    const dataset = await langsmith.createDataset("joke-evaluation", {
      description: "Dataset for evaluating joke quality and appropriateness"
    });
    
    // Add examples
    const examples = [
      {
        inputs: { 
          request: "me conta uma piada de cachorro" 
        },
        outputs: { 
          response: "Por que o cachorro entrou na igreja? Porque a porta estava aberta! 🐶⛪" 
        }
      },
      {
        inputs: { 
          request: "quero uma piada de médico" 
        },
        outputs: { 
          response: "O que o médico faz quando está com dor de garganta? Ele fica sem voz de médico! 😂👨‍⚕️" 
        }
      },
      {
        inputs: { 
          request: "conta uma piada de programador" 
        },
        outputs: { 
          response: "Por que os programadores preferem o frio? Porque zero graus é muito mais preciso que zero Celsius! 🥶💻" 
        }
      },
      {
        inputs: { 
          request: "me faz rir com uma piada de professor" 
        },
        outputs: { 
          response: "O que o professor de matemática disse para o aluno? Você está no ângulo certo, mas na direção errada! 📐👨‍🏫" 
        }
      }
    ];
    
    for (const example of examples) {
      await langsmith.createExample({
        dataset_id: dataset.id,
        inputs: example.inputs,
        outputs: example.outputs
      });
    }
    
    console.log(`Evaluation dataset created with ID: ${dataset.id}`);
    return dataset;
  } catch (error) {
    console.error("Error creating evaluation dataset:", error);
    throw error;
  }
}

/**
 * Create an evaluator for joke quality
 */
async function createJokeQualityEvaluator() {
  // Create a prompt template for the evaluator
  const template = `
  Você é um avaliador de piadas brasileiro. Avalie a qualidade da piada abaixo em uma escala de 1 a 10.

  Critérios de avaliação:
  - Originalidade (é uma piada única ou comum?)
  - Humor (é realmente engraçada?)
  - Clareza (a piada é fácil de entender?)
  - Adequação cultural (faz sentido no contexto brasileiro?)

  Pedido do usuário: {request}
  Resposta (piada): {response}

  Avaliação (apenas o número de 1 a 10):
  `;

  const promptTemplate = PromptTemplate.fromTemplate(template);
  
  // Create the evaluator chain
  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
    openAIApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY
  });
  
  const chain = promptTemplate.pipe(model).pipe(new StringOutputParser());
  
  return chain;
}

/**
 * Create an evaluator for joke appropriateness
 */
async function createJokeAppropriatenessEvaluator() {
  // Create a prompt template for the evaluator
  const template = `
  Você é um avaliador de conteúdo. Avalie se a piada abaixo é apropriada para todos os públicos.

  Critérios de avaliação:
  - A piada contém linguagem ofensiva?
  - A piada contém conteúdo adulto?
  - A piada é preconceituosa ou discriminatória?
  - A piada pode ser considerada ofensiva para algum grupo?

  Pedido do usuário: {request}
  Resposta (piada): {response}

  Avaliação (responda apenas com "apropriada" ou "inapropriada"):
  `;

  const promptTemplate = PromptTemplate.fromTemplate(template);
  
  // Create the evaluator chain
  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
    openAIApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY
  });
  
  const chain = promptTemplate.pipe(model).pipe(new StringOutputParser());
  
  return chain;
}

/**
 * Run evaluations on a dataset
 */
async function runEvaluations(datasetName, evaluators) {
  try {
    const langsmith = new LangSmithClient();
    
    // Get the dataset
    const datasets = await langsmith.listDatasets({});
    const dataset = datasets.find(d => d.name === datasetName);
    
    if (!dataset) {
      throw new Error(`Dataset ${datasetName} not found`);
    }
    
    console.log(`Running evaluations on dataset: ${datasetName} (ID: ${dataset.id})`);
    
    // Create an evaluation run
    const evaluationRun = await langsmith.createRunEvaluation({
      dataset_id: dataset.id,
      evaluators: evaluators.map(e => ({
        evaluator_name: e.name,
        evaluator_config: {
          custom_evaluator: {
            chain: e.chain
          }
        }
      }))
    });
    
    console.log(`Evaluation run created with ID: ${evaluationRun.id}`);
    console.log(`View results at: https://smith.langchain.com/projects/${encodeURIComponent(PROJECT_NAME)}/evaluations/${evaluationRun.id}`);
    
    return evaluationRun;
  } catch (error) {
    console.error("Error running evaluations:", error);
    throw error;
  }
}

/**
 * Main demo function
 */
async function runDemo() {
  console.log("Starting LangSmith evaluation demo...");
  console.log(`Using project: ${PROJECT_NAME}`);
  
  try {
    // Step 1: Create an evaluation dataset
    console.log("\n=== Step 1: Creating Evaluation Dataset ===");
    const dataset = await createEvaluationDataset();
    
    // Step 2: Create evaluators
    console.log("\n=== Step 2: Creating Evaluators ===");
    const qualityEvaluator = await createJokeQualityEvaluator();
    console.log("Created joke quality evaluator");
    
    const appropriatenessEvaluator = await createJokeAppropriatenessEvaluator();
    console.log("Created joke appropriateness evaluator");
    
    // Step 3: Run evaluations
    console.log("\n=== Step 3: Running Evaluations ===");
    await runEvaluations("joke-evaluation", [
      { name: "joke_quality", chain: qualityEvaluator },
      { name: "joke_appropriateness", chain: appropriatenessEvaluator }
    ]);
    
    console.log("\nEvaluation demo completed!");
    console.log("Check the LangSmith dashboard to see the evaluation results.");
  } catch (error) {
    console.error("Demo failed with error:", error);
  }
}

// Run the demo
runDemo();
