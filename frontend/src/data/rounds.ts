export const ROUNDS = [
  {
    round: 1,
    p1: { title:"Variable Assignment", code:"x = 5;\ny = x + 2;", hint:"y = x + 2. What is x?", ans:"7", output:"y = 7" },
    coord: { lat:"15.434417° N", lng:"75.648222° E", place:"BCA Block, Lab 2 Entrance" },
    volunteer: { name:"Ravi", initials:"RV", bg:"bg-indigo-900/30", color:"text-indigo-300" },
    qrPasskey:"QUEST-R1",
    cx: 0.15, cy: 0.75
  },
  {
    round: 2,
    p1: { title:"String Length", code: 'name ="Quest";\nn = len(name);', hint:"Count the characters in 'Quest'.", ans:"5", output:"n = 5" },
    coord: { lat:"15.435389° N", lng:"75.647222° E", place:"JT College Central Library" },
    volunteer: { name:"Priya", initials:"PR", bg:"bg-emerald-900/30", color:"text-emerald-300" },
    qrPasskey:"QUEST-R2",
    cx: 0.35, cy: 0.60
  },
  {
    round: 3,
    p1: { title:"Loop Sum", code:"t = 0\nfor i in [1,2,3]:\n  t += i", hint:"Add 1+2+3 step by step.", ans:"6", output:"t = 6" },
    coord: { lat:"15.432972° N", lng:"75.649556° E", place:"Campus Canteen" },
    volunteer: { name:"Arjun", initials:"AJ", bg:"bg-[var(--color-accent)]/10", color:"text-[var(--color-accent)]" },
    qrPasskey:"QUEST-R3",
    cx: 0.60, cy: 0.70
  },
  {
    round: 4,
    p1: { title:"Array Filtering", code:"nums = [1, 2, 3, 4];\nevens = [x for x in nums if x % 2 == 0];\nresult = len(evens)", hint:"How many even numbers are in [1, 2, 3, 4]?", ans:"2", output:"result = 2" },
    coord: { lat:"15.433306° N", lng:"75.647472° E", place:"Principal's Office Corridor" },
    volunteer: { name:"Sita", initials:"ST", bg:"bg-pink-900/30", color:"text-pink-300" },
    qrPasskey:"QUEST-R4",
    cx: 0.85, cy: 0.50
  },
  {
    round: 5,
    p1: { title:"Object Access", code: 'user = {"id": 1,"name":"Dev"};\nresult = user["id"]', hint:"What is the value of the 'id' key?", ans:"1", output:"result = 1" },
    coord: { lat:"15.434028° N", lng:"75.647639° E", place:"Campus Quadrangle" },
    volunteer: { name:"Vikram", initials:"VK", bg:"bg-cyan-900/30", color:"text-cyan-300" },
    qrPasskey:"QUEST-R5",
    cx: 0.65, cy: 0.25
  },
  {
    round: 6,
    p1: { title:"Function Return", code:"def f(a, b):\n  return a + b;\nresult = f(10, 5)", hint:"What does f(10, 5) return?", ans:"15", output:"result = 15" },
    coord: { lat:"15.434778° N", lng:"75.646694° E", place:"Main Gate, Security Post" },
    volunteer: { name:"Anjali", initials:"AN", bg:"bg-purple-900/30", color:"text-purple-300" },
    qrPasskey:"QUEST-R6",
    cx: 0.30, cy: 0.15
  },
  {
    round: 7,
    p1: { title:"Boolean Logic", code:"a = True\nb = False\nresult = a and not b", hint:"True AND (NOT False) = ?", ans:"True", output:"result = True" },
    coord: { lat:"15.433389° N", lng:"75.646833° E", place:"Science Block Entrance" },
    volunteer: { name:"Kiran", initials:"KR", bg:"bg-amber-900/30", color:"text-amber-300" },
    qrPasskey:"QUEST-R7",
    cx: 0.50, cy: 0.40
  },
  {
    round: 8,
    p1: { title:"Recursive Count", code:"def count(n):\n  if n == 0: return 0\n  return 1 + count(n-1)\nresult = count(4)", hint:"How many times does count() recurse for n=4?", ans:"4", output:"result = 4" },
    coord: { lat:"15.434833° N", lng:"75.647472° E", place:"Sports Ground Gate" },
    volunteer: { name:"Deepa", initials:"DP", bg:"bg-rose-900/30", color:"text-rose-300" },
    qrPasskey:"QUEST-R8",
    cx: 0.75, cy: 0.80
  },
];
