import * as dotenv from 'dotenv';
dotenv.config();

import app from "./app";
import config from "./config/config";

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Storybook Server is ready!`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 Stories API: http://localhost:${PORT}/api/stories`);
});
