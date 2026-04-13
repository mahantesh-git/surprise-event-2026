export const ROUNDS = [
  {
    round: 1,
    p1: { title: "Variable Assignment", code: "x = 5;\ny = x + 2;", hint: "y = x + 2. What is x?", ans: "7", output: "y = 7" },
    coord: { lat: "12.9716° N", lng: "77.5946° E", place: "Science Block, Pillar 4" },
    volunteer: { name: "Ravi", initials: "RV", bg: "bg-indigo-100", color: "text-indigo-700" },
    p2: { title: "Multiplication", code: "result = 3 * 4", hint: "Multiply 3 by 4.", ans: "12", output: "result = 12" },
    qrPasskey: "QUEST-R1",
    cx: 0.15, cy: 0.75
  },
  {
    round: 2,
    p1: { title: "String Length", code: 'name = "Quest";\nn = len(name);', hint: "Count the characters in 'Quest'.", ans: "5", output: "n = 5" },
    coord: { lat: "12.9721° N", lng: "77.5953° E", place: "Library, East Entrance" },
    volunteer: { name: "Priya", initials: "PR", bg: "bg-emerald-100", color: "text-emerald-700" },
    p2: { title: "Power of 2", code: "x = 2 ** 4", hint: "2 to the power of 4.", ans: "16", output: "x = 16" },
    qrPasskey: "QUEST-R2",
    cx: 0.35, cy: 0.60
  },
  {
    round: 3,
    p1: { title: "Loop Sum", code: "t = 0\nfor i in [1,2,3]:\n  t += i", hint: "Add 1+2+3 step by step.", ans: "6", output: "t = 6" },
    coord: { lat: "12.9728° N", lng: "77.5961° E", place: "Cafeteria, North Exit" },
    volunteer: { name: "Arjun", initials: "AJ", bg: "bg-amber-100", color: "text-amber-700" },
    p2: { title: "Even Check", code: "n = 8\nresult = n % 2 == 0", hint: "Use modulo to check if even.", ans: "True", output: "result = True" },
    qrPasskey: "QUEST-R3",
    cx: 0.60, cy: 0.70
  },
  {
    round: 4,
    p1: { title: "Array Filtering", code: "nums = [1, 2, 3, 4];\nevens = [x for x in nums if x % 2 == 0];\nresult = len(evens)", hint: "How many even numbers are in [1, 2, 3, 4]?", ans: "2", output: "result = 2" },
    coord: { lat: "12.9735° N", lng: "77.5968° E", place: "Auditorium, Backstage" },
    volunteer: { name: "Sita", initials: "ST", bg: "bg-rose-100", color: "text-rose-700" },
    p2: { title: "List Append", code: 'colors = ["red", "blue"];\ncolors.append("green");\nresult = len(colors)', hint: "Start with 2 colors, add 1 more. How many now?", ans: "3", output: "result = 3" },
    qrPasskey: "QUEST-R4",
    cx: 0.85, cy: 0.50
  },
  {
    round: 5,
    p1: { title: "Object Access", code: 'user = {"id": 1, "name": "Dev"};\nresult = user["id"]', hint: "What is the value of the 'id' key?", ans: "1", output: "result = 1" },
    coord: { lat: "12.9742° N", lng: "77.5975° E", place: "Sports Complex, Court 2" },
    volunteer: { name: "Vikram", initials: "VK", bg: "bg-cyan-100", color: "text-cyan-700" },
    p2: { title: "Math & Objects", code: 'data = {"val": 10};\nresult = data["val"] * 2', hint: "Multiply the value of 'val' by 2.", ans: "20", output: "result = 20" },
    qrPasskey: "QUEST-R5",
    cx: 0.65, cy: 0.25
  },
  {
    round: 6,
    p1: { title: "Function Return", code: "def f(a, b):\n  return a + b;\nresult = f(10, 5)", hint: "What does f(10, 5) return?", ans: "15", output: "result = 15" },
    coord: { lat: "12.9750° N", lng: "77.5982° E", place: "Main Gate, Security Post" },
    volunteer: { name: "Anjali", initials: "AN", bg: "bg-purple-100", color: "text-purple-700" },
    p2: { title: "Square Function", code: "def g(x):\n  return x * x;\nresult = g(3)", hint: "What is 3 squared?", ans: "9", output: "result = 9" },
    qrPasskey: "QUEST-R6",
    cx: 0.30, cy: 0.15
  }
];
