export const ROUNDS = [
  {
    round: 1,
    p1: { title: "Variable Assignment", code: "x = 5;\ny = x + 2;", hint: "y = x + 2. What is x?", ans: "7", output: "y = 7" },
    coord: { lat: "15.434850° N", lng: "75.646450° E", place: "BCA Block, Lab 2 Entrance" },
    volunteer: { name: "Ravi", initials: "RV", bg: "bg-indigo-900/30", color: "text-indigo-300" },
    qrPasskey: "QUEST-R1",
    cx: 0.15, cy: 0.75
  },
  {
    round: 2,
    p1: { title: "String Length", code: 'name = "Quest";\nn = len(name);', hint: "Count the characters in 'Quest'.", ans: "5", output: "n = 5" },
    coord: { lat: "15.433450° N", lng: "75.647950° E", place: "JT College Central Library" },
    volunteer: { name: "Priya", initials: "PR", bg: "bg-emerald-900/30", color: "text-emerald-300" },
    qrPasskey: "QUEST-R2",
    cx: 0.35, cy: 0.60
  },
  {
    round: 3,
    p1: { title: "Loop Sum", code: "t = 0\nfor i in [1,2,3]:\n  t += i", hint: "Add 1+2+3 step by step.", ans: "6", output: "t = 6" },
    coord: { lat: "15.435050° N", lng: "75.647550° E", place: "Campus Canteen" },
    volunteer: { name: "Arjun", initials: "AJ", bg: "bg-[var(--color-accent)]/10", color: "text-[var(--color-accent)]" },
    qrPasskey: "QUEST-R3",
    cx: 0.60, cy: 0.70
  },
  {
    round: 4,
    p1: { title: "Array Filtering", code: "nums = [1, 2, 3, 4];\nevens = [x for x in nums if x % 2 == 0];\nresult = len(evens)", hint: "How many even numbers are in [1, 2, 3, 4]?", ans: "2", output: "result = 2" },
    coord: { lat: "15.433250° N", lng: "75.646550° E", place: "Principal's Office Corridor" },
    volunteer: { name: "Sita", initials: "ST", bg: "bg-pink-900/30", color: "text-pink-300" },
    qrPasskey: "QUEST-R4",
    cx: 0.85, cy: 0.50
  },
  {
    round: 5,
    p1: { title: "Object Access", code: 'user = {"id": 1, "name": "Dev"};\nresult = user["id"]', hint: "What is the value of the 'id' key?", ans: "1", output: "result = 1" },
    coord: { lat: "15.434650° N", lng: "75.648150° E", place: "Campus Quadrangle" },
    volunteer: { name: "Vikram", initials: "VK", bg: "bg-cyan-900/30", color: "text-cyan-300" },
    qrPasskey: "QUEST-R5",
    cx: 0.65, cy: 0.25
  },
  {
    round: 6,
    p1: { title: "Function Return", code: "def f(a, b):\n  return a + b;\nresult = f(10, 5)", hint: "What does f(10, 5) return?", ans: "15", output: "result = 15" },
    coord: { lat: "15.433850° N", lng: "75.645850° E", place: "Main Gate, Security Post" },
    volunteer: { name: "Anjali", initials: "AN", bg: "bg-purple-900/30", color: "text-purple-300" },
    qrPasskey: "QUEST-R6",
    cx: 0.30, cy: 0.15
  }
];

