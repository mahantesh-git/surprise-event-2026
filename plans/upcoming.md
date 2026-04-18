1. Real-time Team Synchronization
Live Chat/Comms: Add a built-in "Encrypted Comms" channel so the Solver and Runner can chat directly inside the app without switching to WhatsApp/Discord.
Shared Screen/Code: Allow the Runner to "watch" the Solver type code in real-time, making them feel more involved.
2. Enhanced Game Mechanics
Bonus Nodes: Secret "glitch" nodes that appear on the map for a limited time, giving teams extra points.
Photo Evidence: Require the Runner to take a photo at the location (using the phone camera) before the round is considered fully complete.
Hint System: A "Buy a Hint" button for Solvers that costs them a time penalty but helps them if they are stuck on the code.
3. Admin & Spectator Experience
Live "War Room" Dashboard: A massive screen for the organizers showing the real-time position of all Runners on a single map.
Global Alerts: An admin "Broadcast" feature to send messages to all participants (e.g., "10 minutes remaining!").
4. Technical Polishing
Offline Mode (PWA): Make the app work as a Progressive Web App so it doesn't break if a Runner goes into a "dead zone" with no signal.
Performance Metrics: Track how many attempts the Solver took and how many miles the Runner walked, and show these as stats at the end.
5. Security & Fairness
Anti-Cheat (GPS Spoofing): Add logic to detect if a Runner is using a fake GPS location app.
Auto-scaling Piston: If you have 50+ teams, a single local Piston instance might be slow. We could implement a load balancer for multiple execution nodes.