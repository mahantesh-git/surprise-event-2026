import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'quest';
const client = new MongoClient(uri);

const demoQuestions = [
  {
    round: 1,
    title: "Shopping Discount",
    hint: "You are given a list of item prices (space-separated). If a price is greater than 100, apply a 10% discount. Return the total bill (rounded to nearest integer).",
    testCases: [
      { input: "50 120 100", output: "258" },
      { input: "110 200 40", output: "319" },
      { input: "50 50 50", output: "150" }
    ],
    output: "Total bill (integer)",
    place: "Location 1",
    lat: "15°26'03.7\"N",
    lng: "75°38'53.4\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-indigo-500/20", color: "text-indigo-400" },
    qrPasskey: "QUEST-R1",
    locationQrCode: "QUEST-LOC-R1"
  },
  {
    round: 2,
    title: "Even-Odd Counter",
    hint: "You are given a list of numbers. Count how many are even and how many are odd. Return both counts separated by a space (e.g., '2 3').",
    testCases: [
      { input: "1 2 3 4 5", output: "2 3" },
      { input: "2 4 6", output: "3 0" },
      { input: "1 3 5", output: "0 3" }
    ],
    output: "Even count and Odd count",
    place: "Location 2",
    lat: "15°26'02.5\"N",
    lng: "75°38'51.6\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-emerald-500/20", color: "text-emerald-400" },
    qrPasskey: "QUEST-R2",
    locationQrCode: "QUEST-LOC-R2"
  },
  {
    round: 3,
    title: "Largest Number",
    hint: "You are given a list of numbers. Find and return the largest number.",
    testCases: [
      { input: "1 5 3 9 2", output: "9" },
      { input: "-1 -5 -2", output: "-1" },
      { input: "10", output: "10" }
    ],
    output: "Largest number",
    place: "Location 3",
    lat: "15°25'59.9\"N",
    lng: "75°38'50.9\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-amber-500/20", color: "text-amber-400" },
    qrPasskey: "QUEST-R3",
    locationQrCode: "QUEST-LOC-R3"
  },
  {
    round: 4,
    title: "Palindrome Check",
    hint: "You are given a string. Check whether it is a palindrome or not. Return 'Yes' or 'No'.",
    testCases: [
      { input: "madam", output: "Yes" },
      { input: "hello", output: "No" },
      { input: "racecar", output: "Yes" }
    ],
    output: "Yes or No",
    place: "Location 4",
    lat: "15°25'58.6\"N",
    lng: "75°38'58.4\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-rose-500/20", color: "text-rose-400" },
    qrPasskey: "QUEST-R4",
    locationQrCode: "QUEST-LOC-R4"
  },
  {
    round: 5,
    title: "Sum of Digits",
    hint: "You are given an integer. Find the sum of its digits.",
    testCases: [
      { input: "123", output: "6" },
      { input: "456", output: "15" },
      { input: "9", output: "9" }
    ],
    output: "Sum of digits",
    place: "Location 5",
    lat: "15°26'07.5\"N",
    lng: "75°38'50.0\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-cyan-500/20", color: "text-cyan-400" },
    qrPasskey: "QUEST-R5",
    locationQrCode: "QUEST-LOC-R5"
  },
  {
    round: 6,
    title: "Reverse Number",
    hint: "You are given an integer. Reverse the number and return it. (e.g., 123 -> 321, 100 -> 1)",
    testCases: [
      { input: "123", output: "321" },
      { input: "100", output: "1" },
      { input: "12345", output: "54321" }
    ],
    output: "Reversed number",
    place: "Location 6",
    lat: "15°26'05.1\"N",
    lng: "75°38'48.1\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-purple-500/20", color: "text-purple-400" },
    qrPasskey: "QUEST-R6",
    locationQrCode: "QUEST-LOC-R6"
  },
  {
    round: 7,
    title: "Word Count",
    hint: "You are given a sentence. Count the number of words in it.",
    testCases: [
      { input: "hello world", output: "2" },
      { input: "this is a test", output: "4" },
      { input: "one", output: "1" }
    ],
    output: "Word count",
    place: "Location 7",
    lat: "15°26'00.4\"N",
    lng: "75°38'48.2\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-blue-500/20", color: "text-blue-400" },
    qrPasskey: "QUEST-R7",
    locationQrCode: "QUEST-LOC-R7"
  },
  {
    round: 8,
    title: "Temperature Average",
    hint: "You are given temperatures of N days (space-separated). Find the average temperature (rounded to nearest integer).",
    testCases: [
      { input: "30 32 34", output: "32" },
      { input: "25 25 25 25", output: "25" },
      { input: "10 20", output: "15" }
    ],
    output: "Average temperature",
    place: "Location 8",
    lat: "15°25'57.8\"N",
    lng: "75°38'54.6\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-pink-500/20", color: "text-pink-400" },
    qrPasskey: "QUEST-R8",
    locationQrCode: "QUEST-LOC-R8"
  },
  {
    round: 9,
    title: "Multiplication Table",
    hint: "You are given a number N. Print its multiplication table up to 10 (results separated by space).",
    testCases: [
      { input: "5", output: "5 10 15 20 25 30 35 40 45 50" },
      { input: "2", output: "2 4 6 8 10 12 14 16 18 20" }
    ],
    output: "Multiplication table values",
    place: "Location 9",
    lat: "15°26'01.0\"N",
    lng: "75°38'55.0\"E",
    volunteer: { name: "---", initials: "---", bg: "bg-zinc-950/80 border-green-500/20", color: "text-green-400" },
    qrPasskey: "QUEST-R9",
    locationQrCode: "QUEST-LOC-R9"
  }
];

async function seed() {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('questions');

    console.log('Clearing ALL existing questions...');
    await collection.deleteMany({});

    const now = new Date();
    const docs = demoQuestions.map(q => ({
      round: q.round,
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
    console.log(`Successfully seeded ${docs.length} demo questions.`);

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await client.close();
  }
}

seed();
