try {
  const controller = require("./functions/afipController");
  console.log("Successfully required afipController");
  console.log("Exports:", Object.keys(controller));
} catch (error) {
  console.error("Error requiring afipController:", error);
  process.exit(1);
}
