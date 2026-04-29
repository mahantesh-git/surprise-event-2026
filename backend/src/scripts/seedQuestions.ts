import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

const newQuestions = [
  {
    round: 1,
    place: "BCA Block",
    lat: "15.433925° N",
    lng: "75.647011° E",
    p1: {
      title: "Shopping Cart Total",
      language: "python",
      code: "",
      hint: "You are given a list of item prices (space-separated). If a price is > 100, apply a 10% discount. Otherwise, keep it as is. Return the total bill (rounded to the nearest integer).",
      ans: "",
      output: "Total bill",
      testCases: [{"input":"50 120 100","output":"258"},{"input":"110 200 40","output":"319"},{"input":"50 50 50","output":"150"}]
    },
    volunteer: { name: "Ravi", initials: "RV", bg: "bg-zinc-950/80 border-indigo-500/20", color: "text-indigo-400" },
    qrPasskey: "QUEST-R1",
    locationQrCode: "QUEST-LOC-R1"
  },
  {
    round: 2,
    place: "Library",
    lat: "15.434419° N",
    lng: "75.646872° E",
    p1: {
      title: "Even Length Words",
      language: "python",
      code: "",
      hint: "Given a sentence (space-separated words), return the number of words having an even length.",
      ans: "",
      output: "Count of even length words",
      testCases: [{"input":"this is a game","output":"3"},{"input":"hello world","output":"0"},{"input":"we love coding","output":"3"}]
    },
    volunteer: { name: "Priya", initials: "PR", bg: "bg-zinc-950/80 border-emerald-500/20", color: "text-emerald-400" },
    qrPasskey: "QUEST-R2",
    locationQrCode: "QUEST-LOC-R2"
  },
  {
    round: 3,
    place: "College Ground",
    lat: "15.435388° N",
    lng: "75.647494° E",
    p1: {
      title: "Sum of Odd Numbers",
      language: "python",
      code: "",
      hint: "Find the sum of all odd integers in a space-separated list of numbers.",
      ans: "",
      output: "Sum",
      testCases: [{"input":"1 2 3 4 5","output":"9"},{"input":"10 20","output":"0"},{"input":"7 7","output":"14"}]
    },
    volunteer: { name: "Arjun", initials: "AJ", bg: "bg-zinc-950/80 border-amber-500/20", color: "text-amber-400" },
    qrPasskey: "QUEST-R3",
    locationQrCode: "QUEST-LOC-R3"
  },
  {
    round: 4,
    place: "Main Gate",
    lat: "15.435123° N",
    lng: "75.646234° E",
    p1: {
      title: "ARRAY FLATTEN",
      language: "python",
      code: "",
      hint: "Given a nested list of integers (depth 2), flatten it into a single list and return the sum of all elements.",
      ans: "",
      output: "Sum of flattened list",
      testCases: [{"input":"[[1,2],[3,4]]","output":"10"},{"input":"[[10],[20,30],[5]]","output":"65"},{"input":"[[],[1]]","output":"1"}]
    },
    volunteer: { name: "Vikram", initials: "VK", bg: "bg-zinc-950/80 border-cyan-500/20", color: "text-cyan-400" },
    qrPasskey: "QUEST-R4",
    locationQrCode: "QUEST-LOC-R4"
  },
  {
    round: 5,
    place: "Parking Area",
    lat: "15.434612° N",
    lng: "75.646618° E",
    p1: {
      title: "STRING COMPRESSION",
      language: "python",
      code: "",
      hint: "Implement basic string compression using the counts of repeated characters. e.g. \"aabcccccaaa\" -> \"a2b1c5a3\". If compressed string is not shorter than original, return original.",
      ans: "",
      output: "Compressed string",
      testCases: [{"input":"aabcccccaaa","output":"a2b1c5a3"},{"input":"abc","output":"abc"},{"input":"aabb","output":"aabb"}]
    },
    volunteer: { name: "Sita", initials: "ST", bg: "bg-zinc-950/80 border-rose-500/20", color: "text-rose-400" },
    qrPasskey: "QUEST-R5",
    locationQrCode: "QUEST-LOC-R5"
  },
  {
    round: 6,
    place: "Nikhil's Sector",
    lat: "15.434859° N",
    lng: "75.647313° E",
    p1: {
      title: "PALINDROME PERMUTATION",
      language: "python",
      code: "",
      hint: "Check if a string is a permutation of a palindrome. Return \"True\" or \"False\". Ignore casing.",
      ans: "",
      output: "True or False",
      testCases: [{"input":"Tact Coa","output":"True"},{"input":"hello","output":"False"},{"input":"aab","output":"True"}]
    },
    volunteer: { name: "Rohit", initials: "RH", bg: "bg-zinc-950/80 border-green-500/20", color: "text-green-400" },
    qrPasskey: "QUEST-R6",
    locationQrCode: "QUEST-LOC-R6"
  }
];

async function seed() {
  try {
    await client.connect();
    const db = client.db('quest');
    const collection = db.collection('questions');

    for (const q of newQuestions) {
      await collection.updateOne(
        { round: q.round },
        { 
          $set: { 
            "coord.lat": q.lat, 
            "coord.lng": q.lng, 
            "coord.place": q.place,
            p1: q.p1,
            volunteer: q.volunteer,
            qrPasskey: q.qrPasskey,
            locationQrCode: q.locationQrCode,
            cx: 0.5, // Defaulting these to center if not provided
            cy: 0.5,
            updatedAt: new Date()
          } 
        },
        { upsert: true }
      );
      console.log(`Updated Round ${q.round}: ${q.place}`);
    }

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await client.close();
  }
}

seed();
