import { seedTestData } from "./seed";
import { log } from "./utils/vite";

(async () => {
  try {
    await seedTestData();
    log("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    log(`Failed to seed data: ${(error as Error).message}`);
    process.exit(1);
  }
})();