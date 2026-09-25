# WareSync — Decentralized AMR Fleet Coordination Platform
### Smart India Hackathon (SIH) 2026 Edition

> **Design. Compile. Simulate. Coordinate.**  
> An industrial-grade, edge-computing warehouse digital twin and multi-robot fleet coordination engine running 100% locally with zero cloud dependencies for safety-critical navigation.

---

## 🏆 SIH Problem Statement Alignment

| Requirement | Implementation in WareSync | Status |
| :--- | :--- | :---: |
| **Fleet Scale** | 5 heterogeneous AMRs (`AMR-01` to `AMR-05`) operating concurrently across 3 warehouse floors | ✅ Verified |
| **Decentralized Communication** | Peer-to-peer (P2P) intent broadcast mesh; per-robot `DistributedIntentStore` without a central server | ✅ Verified |
| **Conflict & Deadlock Resolution** | Real-time pairwise conflict detection, weighted dynamic right-of-way resolver, wait-for graph cycle detection | ✅ Verified |
| **Blocked Aisle Rerouting** | Dynamic obstacle detection: moving AMRs detect corridor blockages and calculate real-time SIPP detours | ✅ Verified |
| **Edge Hardware Profile** | Modular TypeScript / WebAssembly core targeting Raspberry Pi 4 / Jetson Nano onboard compute | ✅ Verified |
| **Success Criteria** | **Zero inter-robot collisions** and **>24% wait-time reduction** vs. FCFS Stop-and-Wait baseline | ✅ Verified |
| **Standardized Export** | Machine-ready VDA 5050 v2.0 orders, ROS2 Nav2 parameter files, and semantic layout JSONs | ✅ Verified |

---

## 🚀 Key Features

### 1. 3D Warehouse Designer with Live Drag & Drop
- Visually layout multi-floor facilities (Racks, AMRs, 22kW Fast Chargers, Freight Elevators, Packing Stations, Loading Docks, Hazard Zones).
- Native 3D floor raycasting, grid snapping (`snapPoint3D`), 3D ghost preview mesh (`DragOverlay3D`), and visual alignment guides.
- Automatic semantic compiler that synthesizes navigation graphs, capability constraints, and safety rules from visual layouts.

### 2. Multi-Agent Decentralized Coordination Core
- **No Central Coordinator**: Every AMR maintains its own localized intent table and broadcasts trajectory windows to peers within radio range.
- **Distributed SIPP (Safe Interval Path Planning)**: Resolves time-space corridors locally, preventing head-on and intersection collisions.
- **Dynamic Right-of-Way Resolver**: Deterministic priority scoring based on task urgency, waiting time aging, battery reserves, and payload commitments.
- **Deadlock Cycle Breaker**: Evaluates circular dependencies in the wait-for graph and initiates randomized yield backoff.

### 3. Dynamic Obstacle Avoidance & Autonomous Delivery
- AMRs automatically complete the full industrial loop: `IDLE` ➔ `NAV_TO_PICKUP` ➔ `PICKING` ➔ `NAV_TO_DROP` ➔ `DELIVERED`.
- Active trajectory scanning: if a pallet drops or an aisle is barricaded, AMRs immediately detect the blockage, log an obstacle alert, and compute an alternate corridor.

### 4. Interactive Benchmark & Validation Studio
- Side-by-Side simultaneous digital twin simulation: **Baseline (FCFS Stop-and-Wait)** vs. **Proposed (Decentralized SIPP + Right-of-Way)** under identical random seeds.
- Live Recharts comparative analytics tracking wait times, collisions, task throughput, and energy consumption.

### 5. Deployment Artifacts
- Single-click generation of machine-readable packages:
  - `vda5050/order.json`
  - `ros2/nav2_params.yaml`
  - `fleet/fleet.yaml`
  - `robots/AMR-XX.yaml`
  - `warehouse/layout.json`
  - `warehouse/resources.json`
  - `warehouse/inventory.json`
  - `warehouse/tasks.json`

---

## 🛠️ Project Structure

```
WareSync/
├── packages/
│   ├── core/                    # Headless domain & algorithmic core (No DOM lib)
│   │   ├── src/
│   │   │   ├── warehouse/       # Domain types, snap grid, operations
│   │   │   ├── compiler/        # Semantic graph synthesis & constraint compiler
│   │   │   ├── planner/         # A*, SIPP, Capability-aware task allocator
│   │   │   ├── coordination/    # P2P messaging, DistributedIntentStore, Right-of-way, Deadlock
│   │   │   ├── simulation/      # Discrete-event engine, Kinematics, Energy model, Comparison runner
│   │   │   └── deployment/      # VDA5050, ROS2, and YAML configuration generators
│   │
│   └── app/                     # Industrial Control Center Web Application
│       ├── src/
│       │   ├── design-system/   # Industrial design tokens & UI components
│       │   ├── renderer/        # Three.js / React Three Fiber 3D twin & Side-by-side view
│       │   ├── ui/
│       │   │   ├── designer/    # Toolbox, drag & drop overlays, inspectors
│       │   │   ├── preloader/   # SIH edge telemetry boot sequencer
│       │   │   ├── simulation/  # Play/pause controls, emergency triggers, event console
│       │   │   ├── benchmark/   # Benchmark dashboard & comparison charts
│       │   │   └── screens/     # Overview, Fleet, Tasks, Inventory, Resources, Rules, Validation, Deployment
│       │   └── store/           # Zustand state management & Web Worker bridges
```

---

## ⚡ Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- pnpm (v9+ recommended)

### Installation & Run
```bash
# Clone the repository
git clone https://github.com/Samxxr007/WareSync-SIH.git
cd WareSync-SIH

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the WareSync Control Room.

---

## 📜 License
MIT License. Built for the Smart India Hackathon (SIH) 2026.
