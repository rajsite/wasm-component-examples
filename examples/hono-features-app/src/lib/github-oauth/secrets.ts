declare let process: {
  env: {
    [key: string]: string
  }
};

// Secrets will be replaced at build with contents
// of .env or .env.local from project root
export const secrets = {
  GITHUB_ID: process.env.GITHUB_ID,
  GITHUB_SECRET: process.env.GITHUB_SECRET
};
