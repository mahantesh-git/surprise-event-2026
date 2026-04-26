const { MongoClient } = require('mongodb');

async function seedReserve() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('quest');
    const reserve = db.collection('reserve_pool');
    
    await reserve.insertOne({
      p1: {
        title: "RESERVE PROTOCOL",
        hint: "This is a reserve question swapped in.",
        language: "javascript",
        code: "function solve() { return 'RESERVE'; }",
        testCases: [{ input: "", output: "RESERVE" }]
      },
      coord: {
        lat: "12.9716",
        lng: "77.5946",
        place: "Reserve Location"
      },
      volunteer: {
        name: "Reserve Bot",
        initials: "RB",
        bg: "#FF0000",
        color: "#FFFFFF"
      },
      qrPasskey: "RESERVE_KEY",
      locationQrCode: "QUEST-RESERVE-01"
    });
    console.log("Seeded reserve pool in 'quest' db.");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

seedReserve();
