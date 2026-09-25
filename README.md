# WareSync — Decentralized AMR Fleet Coordination Platform
### Smart India Hackathon (SIH) 2026 Edition

> **Design. Compile. Simulate. Coordinate.**  
> An industrial-grade multi-agent autonomous mobile robot (AMR) coordination platform. Built on a strictly **decentralized edge architecture** where each robot operates as an autonomous agent with its own local motion planner, localized reservation store, and peer-to-peer (P2P) intent negotiation. **Zero central authority. Zero server-side routing bottlenecks.**

---

## 🏆 SIH Success Criteria & Benchmark Verification

| Metric / Objective | Industry Baseline (FCFS Stop-and-Wait) | WareSync Proposed (Decentralized SIPP) | Result / Improvement | Hackathon Criterion Status |
| :--- | :--- | :--- | :--- | :---: |
| **Inter-Robot Collisions** | `0` | `0` | **Zero Collisions (0.00)** | ✅ **PASSED** |
| **Overlapping Corridor Task Time** | `>70.0s` (stalled in queue) | `49.0s` | **>30.0% Reduction** | ✅ **PASSED (Target: ≥20%)** |
| **Bottleneck Wait Time** | `484.2s` | `201.4s` | **58.4% Wait Reduction** | ✅ **PASSED** |
| **Throughput Under Contention** | `1 task completed` | `6 tasks completed` | **+500% Throughput** | ✅ **PASSED** |
| **Fleet Queueing Delay** | `204.4s` | `122.0s` | **40.3% Delay Reduction** | ✅ **PASSED** |
| **Full Facility Wait Time (60s)** | `216.0s` | `85.0s` | **60.7% Wait Reduction** | ✅ **PASSED** |

---

## 🏛️ System Architecture

WareSync enforces a strict architectural boundary: **safety-critical navigation and conflict resolution occur entirely onboard each AMR or via direct peer-to-peer radio broadcast.** The web control room is strictly an observer.

```mermaid
flowchart TD
    subgraph EdgeAMR1["AMR-01 (Edge Node)"]
        DIS1["DistributedIntentStore\n(Local Safe Intervals)"]
        SIPP1["SIPP Local Planner\n(Time-Space Reservations)"]
        ROW1["Right-of-Way Resolver\n(Deterministic Scoring)"]
        BUMP1["Virtual Safety Bumper\n(2.0m Proximity Envelope)"]
        KIN1["Differential Drive Kinematics\n(Max 1.4 m/s)"]
    end

    subgraph EdgeAMR2["AMR-02 (Edge Node)"]
        DIS2["DistributedIntentStore\n(Local Safe Intervals)"]
        SIPP2["SIPP Local Planner\n(Time-Space Reservations)"]
        ROW2["Right-of-Way Resolver\n(Deterministic Scoring)"]
        BUMP2["Virtual Safety Bumper\n(2.0m Proximity Envelope)"]
        KIN2["Differential Drive Kinematics\n(Max 1.4 m/s)"]
    end

    subgraph EdgeAMR3["AMR-03..10 (Edge Nodes)"]
        DIS3["DistributedIntentStore"]
        SIPP3["SIPP Local Planner"]
        ROW3["Right-of-Way Resolver"]
    end

    %% Direct Peer-to-Peer Radio Mesh
    EdgeAMR1 <-->|"P2P Intent Broadcast (802.11p)"| EdgeAMR2
    EdgeAMR2 <-->|"Pairwise Conflict Negotiation"| EdgeAMR3
    EdgeAMR1 <-->|"Direct Yield / Accept Exchange"| EdgeAMR3

    subgraph WebWorker["Browser Execution Runtime (Web Worker)"]
        SimEng["SimulationEngine (Headless)"]
        ElevAgent["Elevator Orchestrator (Multi-Floor Cab)"]
        NetTracker["NetworkStateTracker (Telemetry & Packet Log)"]
        MetricCol["MetricsCollector (KPI Accumulator)"]
    end

    EdgeAMR1 -.-> SimEng
    EdgeAMR2 -.-> SimEng
    EdgeAMR3 -.-> SimEng

    subgraph UIThread["WareSync Industrial UI (Main Thread - Passive Observer)"]
        Zustand["useSimulationStore / uiStore"]
        Scene3D["Three.js / React Three Fiber\n(3D Digital Twin)"]
        NetScreen["P2P Network Inspector\n(Live Topology Mesh & Packet Stream)"]
        BenchScreen["Benchmark & Validation Studio\n(Recharts Dual-Run Analytics)"]
    end

    WebWorker ==="PostMessage(SimulationFrame)"===> UIThread
```

### Architectural Tenets
1. **Zero Central Reservation Authority**: There is no central database or central arbiter deciding who moves next.
2. **Local Safe Interval Path Planning (SIPP)**: Each robot maintains its own `DistributedIntentStore`. When planning a trajectory, it identifies collision-free time windows along edges and reserves intervals locally.
3. **Decentralized Right-of-Way Negotiation**: When two robots detect an impending intersection or corridor conflict within 3.2m:
   $$\text{Score} = 50 + \text{TaskPriorityBonus} + \text{LoadBonus} + \text{LowBatteryBonus} + \min(30, \text{WaitTime} \times 2)$$
   The higher-scoring robot proceeds at speed; the lower-scoring robot yields right-of-way and holds position until the conflict node clears.
4. **Virtual Safety Bumper (Fail-Safe)**: If an AMR approaches any stopped entity within 2.0m, it drops speed to `0 m/s` immediately, preventing physical contact regardless of communications status.
5. **Off-Thread Execution**: The discrete-event simulation runs in a dedicated background Web Worker, ensuring 60 FPS UI rendering even under heavy multi-robot coordination.

---

## 🧪 Automated Test Suite & Empirical Verification

WareSync includes an automated Vitest regression suite in `packages/core/src/simulation/__tests__/` that mathematically validates collision avoidance and throughput metrics.

### 1. Run Automated Tests
```bash
# Run all core simulation tests
pnpm --filter @waresync/core test
```

### 2. Test Specifications

#### A. Bottleneck Overlapping Corridor Test (`bottleneck.test.ts`)
* **Scenario**: Two AMRs simultaneously dispatched to deliver pallets from opposite sides of the warehouse into the **exact same bottleneck drop station** (`DOCK-01`).
* **Baseline (Stop-and-Wait)**: Robots encounter mutual corridor locks. In a 70-second window, Baseline completed only **1 task** (the 2nd task was trapped in queue, duration `>70s`), accumulating **484.2s** of fleet wait time.
* **Proposed (Decentralized SIPP)**: Both overlapping tasks finished in **49.0s** (**>30% reduction in total task completion time**), completing **6 tasks total** (+500% throughput) with wait time slashed to **201.4s** (**58.4% reduction**).
* **Collisions**: **0**.

#### B. Overlapping Paths Conflict Test (`overlappingPaths.test.ts`)
* **Scenario**: Concurrent intersecting navigation through the central corridor on Floor 1.
* **Result**: Wait time reduced from **204.4s** down to **122.0s** (**40.3% reduction**), with **0 collisions**.

#### C. Full Facility 10-Robot Multi-Floor Benchmark (`benchmark.test.ts`)
* **Scenario**: 10 heterogeneous AMRs executing multi-level picking tasks across 3 floors utilizing fast chargers and freight elevators.
* **Result**: **60.7% reduction** in total fleet waiting time and 7 completed tasks vs 5 tasks (+40% throughput) in 60s.

---

## 📡 Visible P2P Network Inspector & Demo Suite

WareSync includes a dedicated **P2P Network Inspector** screen (`/Network`) designed specifically for demonstration and live evaluation:

1. **Architecture Status Banner**:
   * `Central Authority: NONE (0 Server-Side Authorities)`
   * `Local Motion Planner: Safe Interval Path Planning (SIPP)`
   * `Coordination Protocol: Simulated P2P Peer Links`
   * `Single Point of Failure: ELIMINATED (Decentralized Mesh)`
2. **Interactive SVG Mesh Topology**:
   * Live radial node graph of all active AMRs.
   * Color-coded edge links: **Connected** (Green), **Degraded** (Amber), and **Stale/Lossy** (Red).
   * Clicking any AMR node inspects its onboard decision engine, showing local priority score calculations, assigned task, and planned next actions.
3. **Real-Time Monospace Packet Stream**:
   * Filterable live log (`INTENT_BROADCAST`, `CONFLICT_NOTIFICATION`, `YIELD_REQUEST`, `YIELD_ACCEPT`, `LOCAL_REPLAN`).
   * Includes timestamp, sender ID, recipient ID, sequence number, and human-readable payload summaries.
4. **Live Scenario Triggers**:
   * **Trigger Intersection Conflict**: Forces AMR-01 and AMR-02 into a head-on intersection encounter to observe live right-of-way resolution and yield acceptance packets.
   * **Degrade AMR-01 ↔ AMR-02 Link**: Injects 280ms latency and 35% packet loss on the edge to demonstrate decentralized fault tolerance.
   * **Restore All Links**: Instantly restores edge connectivity back to nominal health.

---

## 🛠️ Project Structure

```
WareSync/
├── packages/
│   ├── core/                           # Headless Domain & Algorithmic Core (Pure TS)
│   │   ├── src/
│   │   │   ├── compiler/               # Semantic graph synthesis & constraint compiler
│   │   │   ├── coordination/           # P2P messaging, DistributedIntentStore, Right-of-Way, NetworkTracker
│   │   │   ├── planner/                # A*, SIPP, Capability-aware task allocator
│   │   │   ├── simulation/             # Discrete-event engine, Kinematics, Energy model, Comparison runner
│   │   │   │   └── __tests__/          # Automated vitest verification suite (Bottlenecks, Benchmarks)
│   │   │   ├── warehouse/              # Domain types, snapping grid, multi-floor structures
│   │   │   └── deployment/             # VDA 5050 v2.0, ROS2 Nav2 parameter exports
│   │
│   └── app/                            # Industrial Control Center Web Application
│       ├── src/
│       │   ├── design-system/          # Industrial design tokens & UI components
│       │   ├── renderer/               # Three.js / React Three Fiber 3D digital twin
│       │   ├── layout/                 # LeftNav, TopBar, AppShell layout
│       │   ├── store/                  # Zustand stores (Simulation, UI, Warehouse, Selection)
│       │   ├── workers/                # Off-thread Web Workers (simulationWorker, comparisonWorker)
│       │   └── ui/
│       │       ├── screens/            # NetworkScreen, FleetScreen, TasksScreen, OverviewScreen, etc.
│       │       ├── simulation/         # SimulationControls, DemoScenarioBar, EmergencyPanel
│       │       ├── benchmark/          # SideBySideSimulation, ComparisonCharts
│       │       └── designer/           # 3D drag-and-drop toolbox & compiler output
```

---

## ⚡ Quick Start & Deployment

### Prerequisites
* **Node.js**: v20+ or v24+
* **pnpm**: v9+ or v10+

### Local Installation
```bash
# 1. Clone repository
git clone https://github.com/Samxxr007/WareSync-SIH.git
cd WareSync-SIH

# 2. Install workspace dependencies
pnpm install

# 3. Run automated verification test suite
pnpm --filter @waresync/core test

# 4. Start local development server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to access the application.

### Production Build
```bash
# Compiles core and bundles production assets via Turbo & Vite
pnpm build
```

---

## 📋 VDA 5050 & ROS2 Nav2 Deployment Artifacts

From the **Deployment Artifacts** screen (`/Deployment`), operators can generate standard machine-readable packages:
* `vda5050/order.json`: Standardized AGV/AMR mission dispatch orders compliant with VDA 5050 v2.0.
* `ros2/nav2_params.yaml`: Ready-to-load ROS2 Humble/Iron navigation parameters including inflation radius, velocity limits, and footprint coordinates.
* `fleet/fleet.yaml` & `warehouse/layout.json`: Complete semantic description of warehouse floors, stations, charging points, and obstacle zones.

---

## 📜 License
MIT License. Built for the Smart India Hackathon (SIH) 2026.
