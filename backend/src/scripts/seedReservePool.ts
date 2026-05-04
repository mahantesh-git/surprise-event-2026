import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'quest';
const client = new MongoClient(uri);

const reserveQuestions = [
  {
    round: 11,
    title: "Prime Number Check",
    hint: "You are given a number. Check whether it is a prime number. Return 'Prime' or 'Not Prime'.",
    testCases: [
      { input: "7", output: "Prime" },
      { input: "10", output: "Not Prime" },
      { input: "1", output: "Not Prime" }
    ],
    output: "Prime or Not Prime",
    place: "Location 1",
    lat: "15°26'03.7\"N",
    lng: "75°38'53.4\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-indigo-500/20", color: "text-indigo-400" },
    qrPasskey: "QUEST-R11",
    locationQrCode: "QUEST-LOC-R11"
  },
  {
    round: 12,
    title: "Factorial",
    hint: "You are given a number N. Find the factorial of N.",
    testCases: [
      { input: "5", output: "120" },
      { input: "3", output: "6" },
      { input: "0", output: "1" }
    ],
    output: "Factorial value",
    place: "Location 2",
    lat: "15°26'02.5\"N",
    lng: "75°38'51.6\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-emerald-500/20", color: "text-emerald-400" },
    qrPasskey: "QUEST-R12",
    locationQrCode: "QUEST-LOC-R12"
  },
  {
    round: 13,
    title: "Fibonacci Series",
    hint: "You are given a number N. Return the first N terms of the Fibonacci series separated by space (starting with 0 1).",
    testCases: [
      { input: "5", output: "0 1 1 2 3" },
      { input: "8", output: "0 1 1 2 3 5 8 13" }
    ],
    output: "Fibonacci sequence",
    place: "Location 3",
    lat: "15°25'59.9\"N",
    lng: "75°38'50.9\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-amber-500/20", color: "text-amber-400" },
    qrPasskey: "QUEST-R13",
    locationQrCode: "QUEST-LOC-R13"
  },
  {
    round: 14,
    title: "Vowel Counter",
    hint: "You are given a string. Count the number of vowels (a, e, i, o, u) in it (ignore case).",
    testCases: [
      { input: "hello world", output: "3" },
      { input: "sky", output: "0" },
      { input: "QUEST", output: "2" }
    ],
    output: "Vowel count",
    place: "Location 4",
    lat: "15°25'58.6\"N",
    lng: "75°38'58.4\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-rose-500/20", color: "text-rose-400" },
    qrPasskey: "QUEST-R14",
    locationQrCode: "QUEST-LOC-R14"
  },
  {
    round: 15,
    title: "Remove Duplicates",
    hint: "You are given a list of numbers (space-separated). Remove duplicates and return the updated list (maintaining order).",
    testCases: [
      { input: "1 2 2 3 4 4 5", output: "1 2 3 4 5" },
      { input: "1 1 1", output: "1" }
    ],
    output: "List without duplicates",
    place: "Location 5",
    lat: "15°26'07.5\"N",
    lng: "75°38'50.0\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-cyan-500/20", color: "text-cyan-400" },
    qrPasskey: "QUEST-R15",
    locationQrCode: "QUEST-LOC-R15"
  },
  {
    round: 16,
    title: "Sum of Even Numbers",
    hint: "You are given a list of numbers (space-separated). Find the sum of all even numbers.",
    testCases: [
      { input: "1 2 3 4 5 6", output: "12" },
      { input: "1 3 5", output: "0" }
    ],
    output: "Sum",
    place: "Location 6",
    lat: "15°26'05.1\"N",
    lng: "75°38'48.1\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-purple-500/20", color: "text-purple-400" },
    qrPasskey: "QUEST-R16",
    locationQrCode: "QUEST-LOC-R16"
  },
  {
    round: 17,
    title: "Character Frequency",
    hint: "You are given a string. Find the frequency of each character. Return in format 'char:count, char:count' (alphabetical order).",
    testCases: [
      { input: "aabbc", output: "a:2, b:2, c:1" },
      { input: "hello", output: "e:1, h:1, l:2, o:1" }
    ],
    output: "Frequencies",
    place: "Location 7",
    lat: "15°26'00.4\"N",
    lng: "75°38'48.2\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-blue-500/20", color: "text-blue-400" },
    qrPasskey: "QUEST-R17",
    locationQrCode: "QUEST-LOC-R17"
  },
  {
    round: 18,
    title: "Number Guessing Game",
    hint: "The system has a hidden number (7). Given a user's guess, print 'Correct' if they match, else 'Try Again'.",
    testCases: [
      { input: "7", output: "Correct" },
      { input: "3", output: "Try Again" }
    ],
    output: "Correct or Try Again",
    place: "Location 8",
    lat: "15°25'57.8\"N",
    lng: "75°38'54.6\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-pink-500/20", color: "text-pink-400" },
    qrPasskey: "QUEST-R18",
    locationQrCode: "QUEST-LOC-R18"
  }
];

async function seed() {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('reserve_pool');

    console.log('Clearing ALL existing reserve pool questions...');
    await collection.deleteMany({});

    const now = new Date();
    const docs = reserveQuestions.map(q => ({
      round: q.round,
      isReserve: true,
      p1: {
        title: q.title,
        language: "python",
        code: "",
        hint: q.hint,
        ans: "",
        output: q.output,
        testCases: q.testCases
      },
      coord: {
        lat: q.lat,
        lng: q.lng,
        place: q.place
      },
      volunteer: q.volunteer,
      qrPasskey: q.qrPasskey,
      locationQrCode: q.locationQrCode,
      cx: 0.5,
      cy: 0.5,
      createdAt: now,
      updatedAt: now
    }));

    await collection.insertMany(docs as any);
    console.log(`Successfully seeded ${docs.length} reserve pool questions.`);

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await client.close();
  }
}

seed();
