import * as dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  openaiApiKey: string;
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
};

console.log(`⚙️  Server configured for ${config.nodeEnv} mode on port ${config.port}`);

export default config;
