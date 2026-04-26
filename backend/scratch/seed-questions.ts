import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_QUESTIONS = [
  {
    round: 1,
    p1: { 
      title: 'Shopping Cart Total', 
      language: 'python', 
      code: '', 
      hint: 'You are given a list of item prices (space-separated). If a price is > 100, apply a 10% discount. Otherwise, keep it as is. Return the total bill (rounded to the nearest integer).', 
      ans: '', 
      output: 'Total bill',
      testCases: [
        { input: '50 120 100', output: '258' },
        { input: '110 200 40', output: '319' },
        { input: '50 50 50', output: '150' }
      ]
    },
    coord: { lat: '15.434850° N', lng: '75.646450° E', place: 'BCA Block, Lab 2 Entrance' },
    volunteer: { name: 'Ravi', initials: 'RV', bg: 'bg-zinc-950/80 border-indigo-500/20', color: 'text-indigo-400' },
    qrPasskey: 'QUEST-R1',
    locationQrCode: 'QUEST-LOC-R1',
    cx: 0.15,
    cy: 0.75,
  },
  {
    round: 2,
    p1: { 
      title: 'Even Length Words', 
      language: 'python', 
      code: '', 
      hint: 'Given a sentence (space-separated words), return the number of words having an even length.', 
      ans: '', 
      output: 'Count of even length words',
      testCases: [
        { input: 'this is a game', output: '3' },
        { input: 'hello world', output: '0' },
        { input: 'we love coding', output: '3' }
      ]
    },
    coord: { lat: '15.433450° N', lng: '75.647950° E', place: 'JT College Central Library' },
    volunteer: { name: 'Priya', initials: 'PR', bg: 'bg-zinc-950/80 border-emerald-500/20', color: 'text-emerald-400' },
    qrPasskey: 'QUEST-R2',
    locationQrCode: 'QUEST-LOC-R2',
    cx: 0.35,
    cy: 0.6,
  },
  {
    round: 3,
    p1: { 
      title: 'Sum of Odd Numbers', 
      language: 'python', 
      code: '', 
      hint: 'Find the sum of all odd integers in a space-separated list of numbers.', 
      ans: '', 
      output: 'Sum',
      testCases: [
        { input: '1 2 3 4 5', output: '9' },
        { input: '10 20', output: '0' },
        { input: '7 7', output: '14' }
      ]
    },
    coord: { lat: '15.435050° N', lng: '75.647550° E', place: 'Campus Canteen' },
    volunteer: { name: 'Arjun', initials: 'AJ', bg: 'bg-zinc-950/80 border-amber-500/20', color: 'text-amber-400' },
    qrPasskey: 'QUEST-R3',
    locationQrCode: 'QUEST-LOC-R3',
    cx: 0.6,
    cy: 0.7,
  },
  {
    round: 4,
    p1: { 
      title: 'Word Reversal', 
      language: 'python', 
      code: '', 
      hint: 'Reverse each word in a space-separated sentence independently, but keep the word order the same. Return the resulting sentence.', 
      ans: '', 
      output: 'Sentence with reversed words',
      testCases: [
        { input: 'hello world', output: 'olleh dlrow' },
        { input: 'quest logic', output: 'tseuq cigol' },
        { input: 'one two three', output: 'eno owt eerht' }
      ]
    },
    coord: { lat: '15.433250° N', lng: '75.646550° E', place: 'Principal\'s Office Corridor' },
    volunteer: { name: 'Sita', initials: 'ST', bg: 'bg-zinc-950/80 border-rose-500/20', color: 'text-rose-400' },
    qrPasskey: 'QUEST-R4',
    locationQrCode: 'QUEST-LOC-R4',
    cx: 0.85,
    cy: 0.5,
  },
  {
    round: 5,
    p1: { 
      title: 'Maximum Difference', 
      language: 'python', 
      code: '', 
      hint: 'Find the maximum difference between any two numbers in a space-separated list (largest - smallest).', 
      ans: '', 
      output: 'Difference',
      testCases: [
        { input: '10 5 2 9', output: '8' },
        { input: '-5 10 20', output: '25' },
        { input: '7 7 7', output: '0' }
      ]
    },
    coord: { lat: '15.434650° N', lng: '75.648150° E', place: 'Campus Quadrangle' },
    volunteer: { name: 'Vikram', initials: 'VK', bg: 'bg-zinc-950/80 border-cyan-500/20', color: 'text-cyan-400' },
    qrPasskey: 'QUEST-R5',
    locationQrCode: 'QUEST-LOC-R5',
    cx: 0.65,
    cy: 0.25,
  },
  {
    round: 6,
    p1: { 
      title: 'Count Target Vowels', 
      language: 'python', 
      code: '', 
      hint: 'Count the number of times the vowels (A, E, I, O, U) appear in the input string, ignoring case.', 
      ans: '', 
      output: 'Count',
      testCases: [
        { input: 'Scavenger Hunt', output: '4' },
        { input: 'XYZ', output: '0' },
        { input: 'Apple', output: '2' }
      ]
    },
    coord: { lat: '15.433850° N', lng: '75.645850° E', place: 'Main Gate, Security Post' },
    volunteer: { name: 'Anjali', initials: 'AN', bg: 'bg-zinc-950/80 border-purple-500/20', color: 'text-purple-400' },
    qrPasskey: 'QUEST-R6',
    locationQrCode: 'QUEST-LOC-R6',
    cx: 0.3,
    cy: 0.15,
  },
  {
    round: 7,
    p1: { 
      title: 'Anagram Checker', 
      language: 'python', 
      code: '', 
      hint: 'Given two space-separated words, return "Yes" if they are anagrams (contain exactly the same letters with the same frequencies), else return "No".', 
      ans: '', 
      output: 'Yes or No',
      testCases: [
        { input: 'listen silent', output: 'Yes' },
        { input: 'hello world', output: 'No' },
        { input: 'rat car', output: 'No' }
      ]
    },
    coord: { lat: '15.432150° N', lng: '75.648850° E', place: 'MCA Lab 1' },
    volunteer: { name: 'Suresh', initials: 'SR', bg: 'bg-zinc-950/80 border-blue-500/20', color: 'text-blue-400' },
    qrPasskey: 'QUEST-R7',
    locationQrCode: 'QUEST-LOC-R7',
    cx: 0.2,
    cy: 0.8,
  },
  {
    round: 8,
    p1: { 
      title: 'Closest to Zero', 
      language: 'python', 
      code: '', 
      hint: 'Given a space-separated list of integers, return the number closest to zero. If there is a tie between a positive and negative number (e.g., -2 and 2), return the positive one.', 
      ans: '', 
      output: 'Integer closest to zero',
      testCases: [
        { input: '2 -1 3', output: '-1' },
        { input: '5 2 -2', output: '2' },
        { input: '10 15 20', output: '10' }
      ]
    },
    coord: { lat: '15.435550° N', lng: '75.646150° E', place: 'Basketball Court' },
    volunteer: { name: 'Kavya', initials: 'KV', bg: 'bg-zinc-950/80 border-pink-500/20', color: 'text-pink-400' },
    qrPasskey: 'QUEST-R8',
    locationQrCode: 'QUEST-LOC-R8',
    cx: 0.7,
    cy: 0.3,
  },
  {
    round: 9,
    p1: { 
      title: 'Prime Counter', 
      language: 'python', 
      code: '', 
      hint: 'Count the number of prime numbers in a space-separated list of positive integers.', 
      ans: '', 
      output: 'Count of primes',
      testCases: [
        { input: '2 4 5 8 11', output: '3' },
        { input: '10 20 30', output: '0' },
        { input: '2 3 5 7 11', output: '5' }
      ]
    },
    coord: { lat: '15.434050° N', lng: '75.649950° E', place: 'Admin Block' },
    volunteer: { name: 'Rohit', initials: 'RH', bg: 'bg-zinc-950/80 border-green-500/20', color: 'text-green-400' },
    qrPasskey: 'QUEST-R9',
    locationQrCode: 'QUEST-LOC-R9',
    cx: 0.9,
    cy: 0.8,
  },
  {
    round: 10,
    p1: { 
      title: 'Second Largest Element', 
      language: 'python', 
      code: '', 
      hint: 'Find the second largest unique number in a space-separated list. Assume at least two unique numbers exist in the list.', 
      ans: '', 
      output: 'Second largest number',
      testCases: [
        { input: '4 1 5 9 2', output: '5' },
        { input: '10 10 9 8', output: '9' },
        { input: '-1 -5 -2', output: '-2' }
      ]
    },
    coord: { lat: '15.432850° N', lng: '75.645050° E', place: 'Auditorium' },
    volunteer: { name: 'Neha', initials: 'NH', bg: 'bg-zinc-950/80 border-orange-500/20', color: 'text-orange-400' },
    qrPasskey: 'QUEST-R10',
    locationQrCode: 'QUEST-LOC-R10',
    cx: 0.5,
    cy: 0.1,
  }
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'quest');
    const collection = db.collection('questions');

    console.log('Cleaning existing questions...');
    await collection.deleteMany({});

    console.log('Seeding default questions...');
    const now = new Date();
    const docs = DEFAULT_QUESTIONS.map(q => ({
      ...q,
      createdAt: now,
      updatedAt: now
    }));

    await collection.insertMany(docs);
    console.log('Seeding successful!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await client.close();
  }
}

seed();
