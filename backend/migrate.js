const { MongoClient } = require("mongodb");

async function run() {
  const uri = "mongodb://127.0.0.1:27017";
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("quest");
    const questions = db.collection("questions");
    const teams = db.collection("teams");

    // 1. Migrate Questions
    const docs = await questions.find({}).toArray();
    console.log(`Found ${docs.length} questions to migrate.`);
    
    for (const doc of docs) {
      const p1 = doc.p1 || {};
      const updates = {};
      
      if (!p1.language) p1.language = "python";
      if (!p1.testCases) p1.testCases = [];
      
      // If the old field 'expectedOutput' exists in testCases, rename it to 'output'
      if (Array.isArray(p1.testCases)) {
        p1.testCases = p1.testCases.map(tc => {
          if (tc.expectedOutput && !tc.output) {
            return { input: tc.input, output: tc.expectedOutput };
          }
          return tc;
        });
      }
      
      await questions.updateOne({ _id: doc._id }, { $set: { p1 } });
    }
    console.log("Questions migration complete.");

    // 2. Migrate Teams (ensure executionAttempts is an array)
    const teamDocs = await teams.find({}).toArray();
    for (const team of teamDocs) {
      if (team.executionAttempts !== undefined && !Array.isArray(team.executionAttempts)) {
        console.log(`Migrating team ${team.name} executionAttempts to array.`);
        await teams.updateOne({ _id: team._id }, { $set: { executionAttempts: [] } });
      }
    }
    console.log("Teams migration complete.");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.close();
  }
}

run();
