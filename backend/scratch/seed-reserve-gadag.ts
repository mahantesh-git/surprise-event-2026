import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const RESERVE_QUESTIONS = [
  {
    p1: { 
      title: 'TACTICAL SWAP: ARRAY FLATTEN', 
      language: 'python', 
      code: '', 
      hint: 'Given a nested list of integers (depth 2), flatten it into a single list and return the sum of all elements.', 
      ans: '', 
      output: 'Sum of flattened list',
      testCases: [
        { input: '[[1,2],[3,4]]', output: '10' },
        { input: '[[10],[20,30],[5]]', output: '65' },
        { input: '[[],[1]]', output: '1' }
      ]
    },
    coord: { lat: '15.432550° N', lng: '75.647050° E', place: 'JT College Gymnasium entrance' },
    volunteer: { name: 'Vikram', initials: 'VK', bg: 'bg-zinc-950/80 border-cyan-500/20', color: 'text-cyan-400' },
    qrPasskey: 'RESERVE-G1',
    locationQrCode: 'QUEST-RSV-G1',
  },
  {
    p1: { 
      title: 'TACTICAL SWAP: STRING COMPRESSION', 
      language: 'python', 
      code: '', 
      hint: 'Implement basic string compression using the counts of repeated characters. e.g. "aabcccccaaa" -> "a2b1c5a3". If compressed string is not shorter than original, return original.', 
      ans: '', 
      output: 'Compressed string',
      testCases: [
        { input: 'aabcccccaaa', output: 'a2b1c5a3' },
        { input: 'abc', output: 'abc' },
        { input: 'aabb', output: 'aabb' }
      ]
    },
    coord: { lat: '15.434050° N', lng: '75.648550° E', place: 'Physics Lab Backyard (Garden Area)' },
    volunteer: { name: 'Priya', initials: 'PR', bg: 'bg-zinc-950/80 border-emerald-500/20', color: 'text-emerald-400' },
    qrPasskey: 'RESERVE-G2',
    locationQrCode: 'QUEST-RSV-G2',
  },
  {
    p1: { 
      title: 'TACTICAL SWAP: PALINDROME PERMUTATION', 
      language: 'python', 
      code: '', 
      hint: 'Check if a string is a permutation of a palindrome. Return "True" or "False". Ignore casing.', 
      ans: '', 
      output: 'True or False',
      testCases: [
        { input: 'Tact Coa', output: 'True' },
        { input: 'hello', output: 'False' },
        { input: 'aab', output: 'True' }
      ]
    },
    coord: { lat: '15.431550° N', lng: '75.649550° E', place: 'Boys Hostel Entry' },
    volunteer: { name: 'Rohit', initials: 'RH', bg: 'bg-zinc-950/80 border-green-500/20', color: 'text-green-400' },
    qrPasskey: 'RESERVE-G3',
    locationQrCode: 'QUEST-RSV-G3',
  },
  {
    p1: { 
      title: 'TACTICAL SWAP: UNIQUE CHARS', 
      language: 'python', 
      code: '', 
      hint: 'Check if a string has all unique characters. Return "YES" or "NO".', 
      ans: '', 
      output: 'YES or NO',
      testCases: [
        { input: 'abcdef', output: 'YES' },
        { input: 'hello', output: 'NO' },
        { input: 'world', output: 'YES' }
      ]
    },
    coord: { lat: '15.433550° N', lng: '75.645550° E', place: 'Seminar Hall 1 Porch' },
    volunteer: { name: 'Sita', initials: 'ST', bg: 'bg-zinc-950/80 border-rose-500/20', color: 'text-rose-400' },
    qrPasskey: 'RESERVE-G4',
    locationQrCode: 'QUEST-RSV-G4',
  },
  {
    p1: { 
      title: 'TACTICAL SWAP: REVERSE WORDS', 
      language: 'python', 
      code: '', 
      hint: 'Given a string of space-separated words, reverse the order of words. e.g. "sky is blue" -> "blue is sky".', 
      ans: '', 
      output: 'Reversed word string',
      testCases: [
        { input: 'sky is blue', output: 'blue is sky' },
        { input: 'hello world', output: 'world hello' },
        { input: 'quest', output: 'quest' }
      ]
    },
    coord: { lat: '15.435550° N', lng: '75.647050° E', place: 'Chemistry Lab Front Porch' },
    volunteer: { name: 'Arjun', initials: 'AJ', bg: 'bg-zinc-950/80 border-amber-500/20', color: 'text-amber-400' },
    qrPasskey: 'RESERVE-G5',
    locationQrCode: 'QUEST-RSV-G5',
  }
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'quest');
    const collection = db.collection('reserve_pool');

    console.log('Cleaning existing reserve pool...');
    await collection.deleteMany({});

    console.log('Seeding Gadag reserve questions...');
    const now = new Date();
    const docs = RESERVE_QUESTIONS.map((q, i) => ({
      ...q,
      round: i + 100, // Dummy round for reserve pool
      createdAt: now,
      updatedAt: now
    }));

    await collection.insertMany(docs);
    console.log('Seeding successful! 5 nodes deployed to JT College (Reserve).');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await client.close();
  }
}

seed();
